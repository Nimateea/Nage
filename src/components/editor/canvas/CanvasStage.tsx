"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Canvas2DRenderer } from "@/lib/canvas/renderer/Canvas2DRenderer";
import { useEditorStore } from "@/lib/canvas/store/editorStore";
import { AddNode, DeleteNode } from "@/lib/canvas/commands";
import {
  makeRectangle,
  makeEllipse,
  makeLine,
  makeText,
  makeFrame,
} from "@/lib/canvas/document/defaults";
import type { CanvasNode, TextNode } from "@/lib/canvas/document/types";

export function CanvasStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Canvas2DRenderer | null>(null);

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const isDraggingCanvasRef = useRef(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Creation ref for click-and-drag shape creation
  const isCreatingShapeRef = useRef<{
    startX: number;
    startY: number;
    tool: "rectangle" | "ellipse" | "frame" | "line";
  } | null>(null);

  // Double-click tracker
  const lastClickRef = useRef<{ time: number; nodeId: string | null }>({
    time: 0,
    nodeId: null,
  });

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
    setDragPreview,
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

  // 4. Keyboard shortcuts (Space to pan, V, H, F, R, O, T, L, I, Shift+1, Undo, Redo, Delete)
  useEffect(() => {
    const isEditingInput = (target: EventTarget | null) => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || target.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditingInput(e.target)) return;

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
          case "l":
            setActiveTool("line");
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

  // 5. Pointer Events (Pan, Hit-Testing, and Click-and-Drag Creation)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      const renderer = rendererRef.current;
      if (!container || !renderer) return;

      const rect = container.getBoundingClientRect();
      const screenPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      const worldPoint = renderer.screenToWorld(screenPoint, document.camera);

      // Pan with middle mouse, space held, or hand tool
      const shouldPan =
        e.button === 1 ||
        isSpacePressed ||
        activeTool === "hand";

      if (shouldPan) {
        isDraggingCanvasRef.current = true;
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        setIsPanning(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      // Shape creation (rectangle, ellipse, frame, line)
      if (
        e.button === 0 &&
        (activeTool === "rectangle" ||
          activeTool === "ellipse" ||
          activeTool === "frame" ||
          activeTool === "line")
      ) {
        isCreatingShapeRef.current = {
          startX: worldPoint.x,
          startY: worldPoint.y,
          tool: activeTool,
        };
        setDragPreview({
          x: worldPoint.x,
          y: worldPoint.y,
          width: 0,
          height: 0,
        });
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      // Text tool click creation
      if (e.button === 0 && activeTool === "text") {
        const newText = makeText({
          x: Math.round(worldPoint.x),
          y: Math.round(worldPoint.y),
          content: "Text",
          fontSize: 18,
          fontWeight: 400,
          color: "#FFFFFF",
          width: 140,
          height: 36,
        });

        executeCommand(new AddNode(newText));
        setSelectedIds([newText.id]);
        setEditingTextId(newText.id);
        setActiveTool("select");
        return;
      }

      // Select / Hit testing
      if (e.button === 0 && activeTool === "select") {
        const hitNode = renderer.hitTest(worldPoint, document);
        const now = Date.now();

        // Check for double click on text
        if (
          hitNode &&
          hitNode.type === "text" &&
          lastClickRef.current.nodeId === hitNode.id &&
          now - lastClickRef.current.time < 350
        ) {
          setEditingTextId(hitNode.id);
          lastClickRef.current = { time: 0, nodeId: null };
          return;
        }

        lastClickRef.current = { time: now, nodeId: hitNode ? hitNode.id : null };

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
          // If clicked on empty space, close inline editor
          setEditingTextId(null);
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
      executeCommand,
      setActiveTool,
      setDragPreview,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      const renderer = rendererRef.current;
      if (!container || !renderer) return;

      // Handle canvas drag-pan
      if (isDraggingCanvasRef.current) {
        const dx = e.clientX - lastMousePosRef.current.x;
        const dy = e.clientY - lastMousePosRef.current.y;
        panBy(dx, dy);
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // Handle drag preview during shape creation
      if (isCreatingShapeRef.current) {
        const rect = container.getBoundingClientRect();
        const screenPoint = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        const currentWorld = renderer.screenToWorld(screenPoint, document.camera);

        const x = Math.min(isCreatingShapeRef.current.startX, currentWorld.x);
        const y = Math.min(isCreatingShapeRef.current.startY, currentWorld.y);
        const width = Math.abs(currentWorld.x - isCreatingShapeRef.current.startX);
        const height = Math.abs(currentWorld.y - isCreatingShapeRef.current.startY);

        setDragPreview({ x, y, width, height });
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
    [activeTool, document, panBy, setHoveredId, setDragPreview]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // 1. Finish panning
      if (isDraggingCanvasRef.current) {
        isDraggingCanvasRef.current = false;
        setIsPanning(false);
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
        return;
      }

      // 2. Finalize shape creation
      if (isCreatingShapeRef.current) {
        const container = containerRef.current;
        const renderer = rendererRef.current;
        if (!container || !renderer) return;

        const rect = container.getBoundingClientRect();
        const screenPoint = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        const endWorld = renderer.screenToWorld(screenPoint, document.camera);

        const { startX, startY, tool } = isCreatingShapeRef.current;

        let width = Math.abs(endWorld.x - startX);
        let height = Math.abs(endWorld.y - startY);
        let x = Math.min(startX, endWorld.x);
        let y = Math.min(startY, endWorld.y);

        // If simple click without drag (distance < 5px), create default sized shape
        if (width < 5 && height < 5) {
          if (tool === "rectangle") {
            width = 180;
            height = 120;
          } else if (tool === "ellipse") {
            width = 140;
            height = 140;
          } else if (tool === "frame") {
            width = 400;
            height = 300;
          } else if (tool === "line") {
            width = 160;
            height = 0;
          }
          x = startX;
          y = startY;
        }

        x = Math.round(x);
        y = Math.round(y);
        width = Math.round(width);
        height = Math.round(height);

        let newNode: CanvasNode;
        if (tool === "rectangle") {
          newNode = makeRectangle({
            x,
            y,
            width,
            height,
            fill: { type: "solid", color: "#1A1A1A", opacity: 1 },
            stroke: { color: "#333333", width: 1, opacity: 1, style: "solid" },
            cornerRadius: 12,
          });
        } else if (tool === "ellipse") {
          newNode = makeEllipse({
            x,
            y,
            width,
            height,
            fill: { type: "solid", color: "#2E5CFF", opacity: 1 },
            stroke: { color: "#2E5CFF", width: 0, opacity: 1, style: "solid" },
          });
        } else if (tool === "frame") {
          const frameCount = document.nodes.filter((n) => n.type === "frame").length;
          newNode = makeFrame({
            x,
            y,
            width,
            height,
            name: `Frame ${frameCount + 1}`,
            fill: { type: "solid", color: "#0D0D0D", opacity: 1 },
            stroke: { color: "#222222", width: 1, opacity: 1, style: "solid" },
            cornerRadius: 14,
          });
        } else {
          newNode = makeLine({
            x,
            y,
            width,
            height,
            x2: x + width,
            y2: y + height,
            stroke: { color: "#FFFFFF", width: 2, opacity: 1, style: "solid" },
          });
        }

        // Add to document & command history
        executeCommand(new AddNode(newNode));

        // Select the newly created shape
        setSelectedIds([newNode.id]);

        // Clear drag preview and reset creating state
        setDragPreview(null);
        isCreatingShapeRef.current = null;

        // Reset active tool back to select
        setActiveTool("select");

        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
      }
    },
    [
      document,
      executeCommand,
      setSelectedIds,
      setDragPreview,
      setActiveTool,
      setIsPanning,
    ]
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

  // Inline text editing overlay calculation
  const editingNode = document.nodes.find(
    (n) => n.id === editingTextId && n.type === "text"
  ) as TextNode | undefined;

  let inlineEditorStyle: React.CSSProperties | null = null;
  if (editingNode) {
    const screenX = editingNode.x * document.camera.zoom + document.camera.x;
    const screenY = editingNode.y * document.camera.zoom + document.camera.y;
    inlineEditorStyle = {
      position: "absolute",
      left: `${screenX}px`,
      top: `${screenY}px`,
      minWidth: `${Math.max(140, editingNode.width * document.camera.zoom)}px`,
      minHeight: `${Math.max(36, editingNode.height * document.camera.zoom)}px`,
      fontSize: `${editingNode.fontSize * document.camera.zoom}px`,
      fontWeight: editingNode.fontWeight,
      color: editingNode.color,
      textAlign: editingNode.textAlign,
      fontFamily: "Inter, sans-serif",
      lineHeight: 1.25,
      background: "#111111",
      border: "1.5px solid #2E5CFF",
      borderRadius: "6px",
      padding: "4px 8px",
      outline: "none",
      resize: "none",
      zIndex: 35,
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.8)",
    };
  }

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

      {/* Inline Text Editor Overlay */}
      {editingNode && inlineEditorStyle && (
        <textarea
          autoFocus
          style={inlineEditorStyle}
          value={editingNode.content}
          onChange={(e) => {
            const nextContent = e.target.value;
            useEditorStore.setState((s) => ({
              document: {
                ...s.document,
                nodes: s.document.nodes.map((n) =>
                  n.id === editingNode.id ? { ...n, content: nextContent } : n
                ),
              },
            }));
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) {
              e.preventDefault();
              setEditingTextId(null);
            }
          }}
          onBlur={() => setEditingTextId(null)}
        />
      )}
    </div>
  );
}
