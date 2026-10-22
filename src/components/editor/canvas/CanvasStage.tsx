"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Canvas2DRenderer } from "@/lib/canvas/renderer/Canvas2DRenderer";
import { useEditorStore } from "@/lib/canvas/store/editorStore";
import { DeleteNode } from "@/lib/canvas/commands";

export function CanvasStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Canvas2DRenderer | null>(null);

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isDraggingCanvasRef = useRef(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const {
    document,
    selectedIds,
    hoveredId,
    dragPreview,
    activeTool,
    isPanning,
    setIsPanning,
    panBy,
    zoomAt,
    setSelectedIds,
    toggleSelectId,
    clearSelection,
    setHoveredId,
    setActiveTool,
    centerView,
    undo,
    redo,
    executeCommand,
  } = useEditorStore();

  // 1. Mount Renderer & handle resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderer = new Canvas2DRenderer();
    renderer.mount(canvas);
    rendererRef.current = renderer;

    const updateSize = () => {
      if (!container || !rendererRef.current) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      rendererRef.current.resize(width, height, dpr);
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  // 2. Sync document, selection, hovered, and dragPreview to renderer
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.render(document, selectedIds, hoveredId, dragPreview);
    }
  }, [document, selectedIds, hoveredId, dragPreview]);

  // 3. Wheel event for trackpad pan & zoom (with passive: false)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Pinch zoom or Cmd/Ctrl + Scroll
        const factor = Math.exp(-e.deltaY * 0.006);
        const rect = container.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        zoomAt(screenX, screenY, factor, rect.width, rect.height);
      } else {
        // Two-finger pan or regular scroll
        panBy(-e.deltaX, -e.deltaY);
      }
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheel);
    };
  }, [panBy, zoomAt]);

  // 4. Keyboard shortcuts (Space to pan, V, H, F, R, O, T, I, Shift+1, Undo, Redo, Delete)
  useEffect(() => {
    const isEditingText = (target: EventTarget | null) => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || target.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditingText(e.target)) return;

      // Spacebar for canvas hand panning
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }

      // Shift + 1: Center View
      if (e.shiftKey && e.key === "!") {
        e.preventDefault();
        centerView();
        return;
      }

      // Delete / Backspace: delete selected nodes
      if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedIds.size > 0) {
          e.preventDefault();
          selectedIds.forEach((id) => {
            executeCommand(new DeleteNode(id));
          });
          clearSelection();
        }
        return;
      }

      // Tool shortcuts (without cmd/ctrl)
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "v":
            setActiveTool("select");
            break;
          case "h":
            setActiveTool("hand");
            break;
          case "f":
            setActiveTool("frame");
            break;
          case "r":
            setActiveTool("rectangle");
            break;
          case "o":
            setActiveTool("ellipse");
            break;
          case "t":
            setActiveTool("text");
            break;
          case "i":
            // Trigger file input
            const fileInput = window.document.getElementById(
              "image-upload-input"
            ) as HTMLInputElement | null;
            if (fileInput) fileInput.click();
            break;
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    selectedIds,
    undo,
    redo,
    centerView,
    clearSelection,
    executeCommand,
    setActiveTool,
  ]);

  // 5. Pointer Events (Pan and Hit-Testing)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      const renderer = rendererRef.current;
      if (!container || !renderer) return;

      const shouldPan =
        e.button === 1 || // Middle click
        isSpacePressed ||
        activeTool === "hand";

      if (shouldPan) {
        isDraggingCanvasRef.current = true;
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        setIsPanning(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      if (e.button === 0 && activeTool === "select") {
        const rect = container.getBoundingClientRect();
        const screenPoint = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        const worldPoint = renderer.screenToWorld(screenPoint, document.camera);
        const hitNode = renderer.hitTest(worldPoint, document);

        if (hitNode) {
          if (e.shiftKey) {
            toggleSelectId(hitNode.id);
          } else {
            setSelectedIds([hitNode.id]);
          }
        } else {
          if (!e.shiftKey) {
            clearSelection();
          }
        }
      }
    },
    [
      isSpacePressed,
      activeTool,
      document,
      setIsPanning,
      setSelectedIds,
      toggleSelectId,
      clearSelection,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      const renderer = rendererRef.current;
      if (!container || !renderer) return;

      if (isDraggingCanvasRef.current) {
        const dx = e.clientX - lastMousePosRef.current.x;
        const dy = e.clientY - lastMousePosRef.current.y;
        panBy(dx, dy);
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // Hover detection on select tool
      if (activeTool === "select") {
        const rect = container.getBoundingClientRect();
        const screenPoint = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        const worldPoint = renderer.screenToWorld(screenPoint, document.camera);
        const hitNode = renderer.hitTest(worldPoint, document);
        setHoveredId(hitNode ? hitNode.id : null);
      }
    },
    [activeTool, document, panBy, setHoveredId]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isDraggingCanvasRef.current) {
        isDraggingCanvasRef.current = false;
        setIsPanning(false);
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // ignore if already released
        }
      }
    },
    [setIsPanning]
  );

  // Determine cursor style
  const getCursor = () => {
    if (isPanning) return "cursor-grabbing";
    if (isSpacePressed || activeTool === "hand") return "cursor-grab";
    if (activeTool === "select") return "cursor-default";
    if (activeTool === "text") return "cursor-text";
    if (
      activeTool === "rectangle" ||
      activeTool === "ellipse" ||
      activeTool === "line" ||
      activeTool === "frame"
    ) {
      return "cursor-crosshair";
    }
    return "cursor-default";
  };

  return (
    <div
      ref={containerRef}
      id="canvas-container"
      className={`absolute inset-0 overflow-hidden z-0 select-none ${getCursor()}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      tabIndex={0}
      style={{ outline: "none" }}
    >
      <canvas ref={canvasRef} className="block w-full h-full pointer-events-none" />
    </div>
  );
}
