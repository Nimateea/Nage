"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { nanoid } from "nanoid";
import {
  Canvas2DRenderer,
  getResizeCursor,
} from "@/lib/canvas/renderer/Canvas2DRenderer";
import type { ResizeHandle } from "@/lib/canvas/renderer/IRenderer";
import { useEditorStore } from "@/lib/canvas/store/editorStore";
import {
  AddNode,
  DeleteNode,
  MoveNodes,
  ResizeNode,
  RotateNode,
} from "@/lib/canvas/commands";
import {
  makeRectangle,
  makeEllipse,
  makeLine,
  makeText,
  makeFrame,
} from "@/lib/canvas/document/defaults";
import type { CanvasNode, TextNode } from "@/lib/canvas/document/types";

interface CanvasStageProps {
  onPointerMoveWorld?: (x: number, y: number) => void;
}

export function CanvasStage({ onPointerMoveWorld }: CanvasStageProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Canvas2DRenderer | null>(null);

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [cursorOverride, setCursorOverride] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const isDraggingCanvasRef = useRef(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Creation ref for click-and-drag shape creation
  const isCreatingShapeRef = useRef<{
    startX: number;
    startY: number;
    tool: "rectangle" | "ellipse" | "frame" | "line";
  } | null>(null);

  // Dragging nodes ref
  const isDraggingNodesRef = useRef<{
    startWorldPoint: { x: number; y: number };
    initialPositions: { id: string; x: number; y: number; x2?: number; y2?: number }[];
    hasMoved: boolean;
  } | null>(null);

  // Resizing node ref
  const isResizingRef = useRef<{
    handle: ResizeHandle;
    nodeId?: string;
    initialBounds: { x: number; y: number; width: number; height: number };
    startWorldPoint: { x: number; y: number };
    rotation: number;
  } | null>(null);

  // Rotating node ref
  const isRotatingRef = useRef<{
    nodeId: string;
    center: { x: number; y: number };
    initialRotation: number;
  } | null>(null);

  // Marquee selection ref
  const isMarqueeRef = useRef<{
    startWorldPoint: { x: number; y: number };
    initialSelectedIds: Set<string>;
  } | null>(null);

  // Double-click tracker
  const lastClickRef = useRef<{ time: number; nodeId: string | null }>({
    time: 0,
    nodeId: null,
  });

  const {
    document,
    selectedIds,
    activeTool,
    isPanning,
    dragPreview,
    panBy,
    zoomAt,
    setIsPanning,
    setSelectedIds,
    clearSelection,
    setHoveredId,
    setActiveTool,
    setDragPreview,
    centerView,
    undo,
    redo,
    executeCommand,
  } = useEditorStore();

  // 1. Mount Renderer & Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new Canvas2DRenderer();
    renderer.mount(canvas);
    rendererRef.current = renderer;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      renderer.resize(rect.width, rect.height);
      setViewportSize({ width: rect.width, height: rect.height });
    }

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      renderer.resize(width, height);
      setViewportSize({ width, height });
    });

    ro.observe(container);

    return () => {
      ro.disconnect();
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  // 2. Sync State with Renderer
  const remoteCursors = useEditorStore((state) => state.remoteCursors);
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    renderer.render(
      document,
      new Set(selectedIds),
      useEditorStore.getState().hoveredId,
      dragPreview,
      remoteCursors
    );
  }, [document, selectedIds, dragPreview, remoteCursors]);

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

  // 4. Keyboard shortcuts (Space to pan, V, H, F, R, O, T, L, I, Shift+1, Undo, Redo, Duplicate, Delete)
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

      // Duplicate: Cmd+D / Ctrl+D
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        if (selectedIds.size > 0) {
          e.preventDefault();
          const currentDoc = useEditorStore.getState().document;
          const selectedNodes = currentDoc.nodes.filter((n) => selectedIds.has(n.id));
          const duplicates: CanvasNode[] = [];

          for (const node of selectedNodes) {
            const copy = {
              ...node,
              id: nanoid(),
              name: `${node.name} Copy`,
              x: node.x + 20,
              y: node.y + 20,
            };
            if (copy.type === "line") {
              copy.x2 += 20;
              copy.y2 += 20;
            }
            duplicates.push(copy);
            executeCommand(new AddNode(copy));
          }
          setSelectedIds(duplicates.map((n) => n.id));
        }
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
    setSelectedIds,
  ]);

  // 5. Pointer Events (Pan, Hit-Testing, Handles, Drag/Move, Resize, Rotate, Marquee)
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

      // Select / Hit testing / Transform handles
      if (e.button === 0 && activeTool === "select") {
        // 1. Check if transform handles were clicked on selected node(s)
        const handleHit = renderer.hitTestTransformHandle?.(
          worldPoint,
          document,
          selectedIds
        );

        if (handleHit?.type === "rotate") {
          isRotatingRef.current = {
            nodeId: handleHit.node.id,
            center: handleHit.center,
            initialRotation: handleHit.node.rotation,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }

        if (handleHit?.type === "resize") {
          isResizingRef.current = {
            handle: handleHit.handle,
            nodeId: handleHit.node?.id,
            initialBounds: handleHit.bounds,
            startWorldPoint: worldPoint,
            rotation: handleHit.node ? handleHit.node.rotation : 0,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }

        // 2. Check if a node was clicked
        const hitNode = renderer.hitTest(worldPoint, document);
        const now = Date.now();

        // Double click on text to inline edit
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
          let nextSelected = new Set(selectedIds);
          if (e.shiftKey) {
            if (nextSelected.has(hitNode.id)) {
              nextSelected.delete(hitNode.id);
            } else {
              nextSelected.add(hitNode.id);
            }
            setSelectedIds(Array.from(nextSelected));
          } else {
            if (!nextSelected.has(hitNode.id)) {
              nextSelected = new Set([hitNode.id]);
              setSelectedIds([hitNode.id]);
            }
          }

          // Start dragging nodes (including all contained children of any dragged frame)
          const directNodesToDrag = document.nodes.filter((n) => nextSelected.has(n.id));
          const allDragIds = new Set<string>(directNodesToDrag.map((n) => n.id));
          const draggedFrames = directNodesToDrag.filter((n) => n.type === "frame");

          if (draggedFrames.length > 0) {
            draggedFrames.forEach((frame) => {
              document.nodes.forEach((n) => {
                if (n.id !== frame.id) {
                  const isChild =
                    n.parentId === frame.id ||
                    (!n.parentId &&
                      n.x >= frame.x &&
                      n.y >= frame.y &&
                      n.x + n.width <= frame.x + frame.width &&
                      n.y + n.height <= frame.y + frame.height);
                  if (isChild) {
                    allDragIds.add(n.id);
                  }
                }
              });
            });
          }

          const nodesToDrag = document.nodes.filter((n) => allDragIds.has(n.id));
          isDraggingNodesRef.current = {
            startWorldPoint: worldPoint,
            initialPositions: nodesToDrag.map((n) => ({
              id: n.id,
              x: n.x,
              y: n.y,
              x2: n.type === "line" ? n.x2 : undefined,
              y2: n.type === "line" ? n.y2 : undefined,
            })),
            hasMoved: false,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        } else {
          // Clicked empty canvas space
          if (!e.shiftKey) {
            clearSelection();
          }
          setEditingTextId(null);

          // Start marquee box selection
          isMarqueeRef.current = {
            startWorldPoint: worldPoint,
            initialSelectedIds: e.shiftKey ? new Set(selectedIds) : new Set(),
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }
      }
    },
    [
      isSpacePressed,
      activeTool,
      document,
      selectedIds,
      setIsPanning,
      setSelectedIds,
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

      const rect = container.getBoundingClientRect();
      const screenPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      const worldPoint = renderer.screenToWorld(screenPoint, document.camera);

      // Broadcast cursor position to collaborators
      onPointerMoveWorld?.(worldPoint.x, worldPoint.y);

      // 1. Handle canvas drag-pan
      if (isDraggingCanvasRef.current) {
        const dx = e.clientX - lastMousePosRef.current.x;
        const dy = e.clientY - lastMousePosRef.current.y;
        panBy(dx, dy);
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // 2. Handle shape creation preview
      if (isCreatingShapeRef.current) {
        const x = Math.min(isCreatingShapeRef.current.startX, worldPoint.x);
        const y = Math.min(isCreatingShapeRef.current.startY, worldPoint.y);
        const width = Math.abs(worldPoint.x - isCreatingShapeRef.current.startX);
        const height = Math.abs(worldPoint.y - isCreatingShapeRef.current.startY);

        setDragPreview({ x, y, width, height });
        return;
      }

      // 3. Handle rotating node
      if (isRotatingRef.current) {
        const { nodeId, center } = isRotatingRef.current;
        const currentAngle =
          (Math.atan2(worldPoint.y - center.y, worldPoint.x - center.x) * 180) / Math.PI + 90;
        let deg = currentAngle;
        if (e.shiftKey) {
          deg = Math.round(deg / 15) * 15;
        }
        deg = Math.round(((deg % 360) + 360) % 360);

        useEditorStore.setState((s) => ({
          document: {
            ...s.document,
            nodes: s.document.nodes.map((n) =>
              n.id === nodeId ? { ...n, rotation: deg } : n
            ),
          },
        }));
        return;
      }

      // 4. Handle resizing node
      if (isResizingRef.current) {
        const { handle, nodeId, initialBounds, startWorldPoint, rotation } =
          isResizingRef.current;

        let dx = worldPoint.x - startWorldPoint.x;
        let dy = worldPoint.y - startWorldPoint.y;

        if (rotation) {
          const rad = (-rotation * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const rdx = dx * cos - dy * sin;
          const rdy = dx * sin + dy * cos;
          dx = rdx;
          dy = rdy;
        }

        let nextX = initialBounds.x;
        let nextY = initialBounds.y;
        let nextW = initialBounds.width;
        let nextH = initialBounds.height;

        // Resize direction calculation
        if (handle.includes("e")) nextW = initialBounds.width + dx;
        if (handle.includes("w")) {
          nextW = initialBounds.width - dx;
          nextX = initialBounds.x + dx;
        }
        if (handle.includes("s")) nextH = initialBounds.height + dy;
        if (handle.includes("n")) {
          nextH = initialBounds.height - dy;
          nextY = initialBounds.y + dy;
        }

        // Alt modifier: symmetrical center resize
        if (e.altKey) {
          if (handle.includes("e") || handle.includes("w")) {
            nextW = initialBounds.width + Math.abs(dx) * 2;
            nextX = initialBounds.x + initialBounds.width / 2 - nextW / 2;
          }
          if (handle.includes("s") || handle.includes("n")) {
            nextH = initialBounds.height + Math.abs(dy) * 2;
            nextY = initialBounds.y + initialBounds.height / 2 - nextH / 2;
          }
        }

        // Shift modifier: aspect ratio preservation
        if (e.shiftKey) {
          const aspect = initialBounds.width / Math.max(1, initialBounds.height);
          if (Math.abs(dx) > Math.abs(dy)) {
            nextH = nextW / aspect;
          } else {
            nextW = nextH * aspect;
          }
        }

        // Minimum bounds constraint
        nextW = Math.max(10, Math.round(nextW));
        nextH = Math.max(10, Math.round(nextH));
        nextX = Math.round(nextX);
        nextY = Math.round(nextY);

        if (nodeId) {
          useEditorStore.setState((s) => ({
            document: {
              ...s.document,
              nodes: s.document.nodes.map((n) =>
                n.id === nodeId
                  ? {
                      ...n,
                      x: nextX,
                      y: nextY,
                      width: nextW,
                      height: nextH,
                      ...(n.type === "line"
                        ? { x2: nextX + nextW, y2: nextY + nextH }
                        : {}),
                    }
                  : n
              ),
            },
          }));
        }
        return;
      }

      // 5. Handle dragging selected nodes
      if (isDraggingNodesRef.current) {
        const { startWorldPoint, initialPositions } = isDraggingNodesRef.current;
        const dx = Math.round(worldPoint.x - startWorldPoint.x);
        const dy = Math.round(worldPoint.y - startWorldPoint.y);

        if (dx !== 0 || dy !== 0) {
          isDraggingNodesRef.current.hasMoved = true;
        }

        const posMap = new Map(initialPositions.map((p) => [p.id, p]));
        useEditorStore.setState((s) => ({
          document: {
            ...s.document,
            nodes: s.document.nodes.map((n) => {
              const init = posMap.get(n.id);
              if (!init) return n;
              if (n.type === "line" && init.x2 !== undefined && init.y2 !== undefined) {
                return {
                  ...n,
                  x: init.x + dx,
                  y: init.y + dy,
                  x2: init.x2 + dx,
                  y2: init.y2 + dy,
                };
              }
              return { ...n, x: init.x + dx, y: init.y + dy };
            }),
          },
        }));
        return;
      }

      // 6. Handle marquee selection
      if (isMarqueeRef.current) {
        const { startWorldPoint, initialSelectedIds } = isMarqueeRef.current;
        const mx = Math.min(startWorldPoint.x, worldPoint.x);
        const my = Math.min(startWorldPoint.y, worldPoint.y);
        const mw = Math.abs(worldPoint.x - startWorldPoint.x);
        const mh = Math.abs(worldPoint.y - startWorldPoint.y);

        setDragPreview({ x: mx, y: my, width: mw, height: mh });

        const newlySelected = new Set(initialSelectedIds);
        for (const node of document.nodes) {
          if (!node.visible || node.locked) continue;
          const nodeRight = node.x + node.width;
          const nodeBottom = node.y + node.height;
          const marqueeRight = mx + mw;
          const marqueeBottom = my + mh;
          const intersects =
            node.x <= marqueeRight &&
            nodeRight >= mx &&
            node.y <= marqueeBottom &&
            nodeBottom >= my;
          if (intersects) {
            newlySelected.add(node.id);
          }
        }
        setSelectedIds(Array.from(newlySelected));
        return;
      }

      // 7. Hover & Dynamic Cursor Updates in Select Mode
      if (activeTool === "select") {
        const handleHit = renderer.hitTestTransformHandle?.(
          worldPoint,
          document,
          selectedIds
        );
        if (handleHit?.type === "rotate") {
          setCursorOverride("crosshair");
        } else if (handleHit?.type === "resize") {
          const rot = handleHit.node ? handleHit.node.rotation : 0;
          setCursorOverride(getResizeCursor(handleHit.handle, rot));
        } else {
          const hitNode = renderer.hitTest(worldPoint, document);
          if (hitNode && selectedIds.has(hitNode.id)) {
            setCursorOverride("move");
          } else {
            setCursorOverride(null);
          }
          setHoveredId(hitNode ? hitNode.id : null);
        }
      }
    },
    [activeTool, document, selectedIds, panBy, setHoveredId, setDragPreview, setSelectedIds, onPointerMoveWorld]
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

        executeCommand(new AddNode(newNode));
        setSelectedIds([newNode.id]);
        setDragPreview(null);
        isCreatingShapeRef.current = null;
        setActiveTool("select");

        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
        return;
      }

      // 3. Finalize rotating node
      if (isRotatingRef.current) {
        const { nodeId, initialRotation } = isRotatingRef.current;
        const currentDoc = useEditorStore.getState().document;
        const finalNode = currentDoc.nodes.find((n) => n.id === nodeId);
        if (finalNode && finalNode.rotation !== initialRotation) {
          executeCommand(new RotateNode(nodeId, initialRotation, finalNode.rotation));
        }
        isRotatingRef.current = null;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
        return;
      }

      // 4. Finalize resizing node
      if (isResizingRef.current) {
        const { nodeId, initialBounds } = isResizingRef.current;
        if (nodeId) {
          const currentDoc = useEditorStore.getState().document;
          const finalNode = currentDoc.nodes.find((n) => n.id === nodeId);
          if (finalNode) {
            const nextBounds = {
              x: finalNode.x,
              y: finalNode.y,
              width: finalNode.width,
              height: finalNode.height,
              x2: finalNode.type === "line" ? finalNode.x2 : undefined,
              y2: finalNode.type === "line" ? finalNode.y2 : undefined,
            };
            if (
              nextBounds.x !== initialBounds.x ||
              nextBounds.y !== initialBounds.y ||
              nextBounds.width !== initialBounds.width ||
              nextBounds.height !== initialBounds.height
            ) {
              executeCommand(new ResizeNode(nodeId, initialBounds, nextBounds));
            }
          }
        }
        isResizingRef.current = null;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
        return;
      }

      // 5. Finalize dragging nodes
      if (isDraggingNodesRef.current) {
        const { initialPositions, hasMoved } = isDraggingNodesRef.current;
        if (hasMoved) {
          const currentDoc = useEditorStore.getState().document;
          const movements: { nodeId: string; dx: number; dy: number }[] = [];
          for (const init of initialPositions) {
            const node = currentDoc.nodes.find((n) => n.id === init.id);
            if (node) {
              const dx = node.x - init.x;
              const dy = node.y - init.y;
              if (dx !== 0 || dy !== 0) {
                movements.push({ nodeId: node.id, dx, dy });
              }
            }
          }
          if (movements.length > 0) {
            executeCommand(new MoveNodes(movements));

            // Reparent nodes based on dropped container frame
            const frames = currentDoc.nodes.filter((n) => n.type === "frame");
            useEditorStore.setState((s) => ({
              document: {
                ...s.document,
                nodes: s.document.nodes.map((node) => {
                  if (node.type === "frame") return node;
                  const wasMoved = movements.some((m) => m.nodeId === node.id);
                  if (wasMoved) {
                    const cx = node.x + node.width / 2;
                    const cy = node.y + node.height / 2;
                    const containing = frames.find(
                      (f) =>
                        cx >= f.x &&
                        cx <= f.x + f.width &&
                        cy >= f.y &&
                        cy <= f.y + f.height
                    );
                    return { ...node, parentId: containing ? containing.id : null };
                  }
                  return node;
                }),
              },
            }));
          }
        }
        isDraggingNodesRef.current = null;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
        return;
      }

      // 6. Finalize marquee selection
      if (isMarqueeRef.current) {
        setDragPreview(null);
        isMarqueeRef.current = null;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
        return;
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
    if (cursorOverride) {
      if (cursorOverride === "move") return "cursor-move";
      if (cursorOverride === "crosshair") return "cursor-crosshair";
      return "";
    }
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
    const cx = viewportSize.width / 2;
    const cy = viewportSize.height / 2;
    const screenX = cx + document.camera.x + editingNode.x * document.camera.zoom;
    const screenY = cy + document.camera.y + editingNode.y * document.camera.zoom;
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
      style={{
        outline: "none",
        cursor: cursorOverride && !isPanning ? cursorOverride : undefined,
      }}
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
