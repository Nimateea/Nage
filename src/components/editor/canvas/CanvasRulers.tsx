"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useEditorStore } from "@/lib/canvas/store/editorStore";

export interface Guide {
  axis: "x" | "y";
  value: number; // world coordinate
}

export function CanvasRulers() {
  const topCanvasRef = useRef<HTMLCanvasElement>(null);
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);

  const [rulersVisible, setRulersVisible] = useState(true);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [viewport, setViewport] = useState({ width: 1200, height: 800 });
  const [activeGuide, setActiveGuide] = useState<{
    axis: "x" | "y";
    index: number;
    isNew?: boolean;
  } | null>(null);

  const { document, selectedIds } = useEditorStore();
  const { camera } = document;

  // Compute selection bounds in world space
  const selectionBounds = React.useMemo(() => {
    if (selectedIds.size === 0) return null;
    const selectedNodes = document.nodes.filter((n) => selectedIds.has(n.id));
    if (selectedNodes.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of selectedNodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }

    return { minX, minY, maxX, maxY };
  }, [document.nodes, selectedIds]);

  // Draw rulers on canvas
  const drawRulers = useCallback(() => {
    const topCanvas = topCanvasRef.current;
    const leftCanvas = leftCanvasRef.current;
    if (!topCanvas || !leftCanvas) return;

    const parent = topCanvas.parentElement;
    if (!parent) return;

    const W = parent.clientWidth;
    const H = parent.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = window.devicePixelRatio || 1;

    // Resize canvases
    topCanvas.width = Math.round(W * dpr);
    topCanvas.height = Math.round(20 * dpr);
    topCanvas.style.width = `${W}px`;
    topCanvas.style.height = `20px`;

    leftCanvas.width = Math.round(20 * dpr);
    leftCanvas.height = Math.round(H * dpr);
    leftCanvas.style.width = `20px`;
    leftCanvas.style.height = `${H}px`;

    const zoom = camera.zoom;
    const panX = camera.x;
    const panY = camera.y;

    // Ruler step intervals from Nage prototype
    const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    const st = steps.find((v) => v * zoom >= 60) || 5000;
    const mn = st / 5;

    const B = selectionBounds
      ? [
          selectionBounds.minX,
          selectionBounds.minY,
          selectionBounds.maxX,
          selectionBounds.maxY,
        ]
      : null;

    // [canvas, viewportLength, pan, isY]
    const configs: Array<[HTMLCanvasElement, number, number, boolean]> = [
      [topCanvas, W, panX, false],
      [leftCanvas, H, panY, true],
    ];

    configs.forEach(([canvas, len, pan, isLeft]) => {
      const g = canvas.getContext("2d");
      if (!g) return;

      g.save();
      g.setTransform(dpr, 0, 0, dpr, 0, 0);

      const o = len / 2 + pan;

      // Dark background matching Nage artifact #0D0D0D
      g.fillStyle = "#0D0D0D";
      g.fillRect(0, 0, isLeft ? 20 : len, isLeft ? len : 20);

      // Selection bounds highlight on ruler
      if (B) {
        const k = isLeft ? 1 : 0;
        const a = o + B[k] * zoom;
        const b = o + B[k + 2] * zoom;
        g.fillStyle = "rgba(46, 92, 255, 0.35)";
        if (!isLeft) {
          g.fillRect(a, 0, b - a, 20);
        } else {
          g.fillRect(0, a, 20, b - a);
        }
      }

      // Ticks and labels
      g.strokeStyle = "#333333";
      g.fillStyle = "#555555";
      g.font = "10px Inter, sans-serif";

      // Minor tick marks
      if (mn * zoom >= 6) {
        for (
          let v = Math.floor(-o / zoom / mn) * mn;
          v <= Math.ceil((len - o) / zoom / mn) * mn;
          v += mn
        ) {
          const q = o + v * zoom;
          g.beginPath();
          if (!isLeft) {
            g.moveTo(q, 16);
            g.lineTo(q, 20);
          } else {
            g.moveTo(16, q);
            g.lineTo(20, q);
          }
          g.stroke();
        }
      }

      // Major tick marks with numbers
      for (
        let v = Math.floor(-o / zoom / st) * st;
        v <= Math.ceil((len - o) / zoom / st) * st;
        v += st
      ) {
        const q = o + v * zoom;
        g.beginPath();
        if (!isLeft) {
          g.moveTo(q, 12);
          g.lineTo(q, 20);
          g.stroke();
          g.fillText(String(v), q + 3, 10);
        } else {
          g.moveTo(12, q);
          g.lineTo(20, q);
          g.stroke();
          g.save();
          g.translate(10, q - 3);
          g.rotate(-Math.PI / 2);
          g.fillText(String(v), 0, 0);
          g.restore();
        }
      }

      // Selection coordinate numerical badges
      if (B) {
        const k = isLeft ? 1 : 0;
        const coords: Array<[number, number]> = [
          [B[k], o + B[k] * zoom],
          [B[k + 2], o + B[k + 2] * zoom],
        ];

        coords.forEach(([v, q], n) => {
          if (!isLeft) {
            g.fillStyle = "#0D0D0D";
            g.fillRect(q + (n ? -34 : 2), 0, 32, 12);
            g.fillStyle = "#8FA8FF";
            g.fillText(String(Math.round(v)), q + (n ? -32 : 4), 10);
          } else {
            g.save();
            g.translate(10, q + (n ? 32 : -2));
            g.rotate(-Math.PI / 2);
            g.fillStyle = "#0D0D0D";
            g.fillRect(-2, -9, 32, 12);
            g.fillStyle = "#8FA8FF";
            g.fillText(String(Math.round(v)), 0, 0);
            g.restore();
          }
        });
      }

      // Border line separating ruler from canvas
      g.strokeStyle = "#222222";
      g.beginPath();
      if (!isLeft) {
        g.moveTo(0, 19.5);
        g.lineTo(len, 19.5);
      } else {
        g.moveTo(19.5, 0);
        g.lineTo(19.5, len);
      }
      g.stroke();

      g.restore();
    });
  }, [camera, selectionBounds]);

  // Draw rulers on camera / selection changes
  useEffect(() => {
    if (rulersVisible) {
      drawRulers();
    }
  }, [rulersVisible, drawRulers]);

  // Resize window handler
  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: typeof window !== "undefined" ? window.innerWidth : 1200,
        height: typeof window !== "undefined" ? window.innerHeight : 800,
      });
      if (rulersVisible) {
        drawRulers();
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [rulersVisible, drawRulers]);

  // Keyboard shortcut: Shift + R toggles rulers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        setRulersVisible((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Guide dragging logic
  const handleTopRulerPointerDown = (e: React.PointerEvent) => {
    const parent = topCanvasRef.current?.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const screenY = e.clientY - rect.top;
    const cy = rect.height / 2;
    const worldY = (screenY - cy - camera.y) / camera.zoom;

    const newGuide: Guide = { axis: "y", value: worldY };
    setGuides((prev) => [...prev, newGuide]);
    setActiveGuide({ axis: "y", index: guides.length, isNew: true });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleLeftRulerPointerDown = (e: React.PointerEvent) => {
    const parent = leftCanvasRef.current?.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const cx = rect.width / 2;
    const worldX = (screenX - cx - camera.x) / camera.zoom;

    const newGuide: Guide = { axis: "x", value: worldX };
    setGuides((prev) => [...prev, newGuide]);
    setActiveGuide({ axis: "x", index: guides.length, isNew: true });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeGuide) return;
    const parent = topCanvasRef.current?.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();

    if (activeGuide.axis === "y") {
      const screenY = e.clientY - rect.top;
      const cy = rect.height / 2;
      const worldY = (screenY - cy - camera.y) / camera.zoom;
      setGuides((prev) =>
        prev.map((g, i) => (i === activeGuide.index ? { ...g, value: worldY } : g))
      );
    } else {
      const screenX = e.clientX - rect.left;
      const cx = rect.width / 2;
      const worldX = (screenX - cx - camera.x) / camera.zoom;
      setGuides((prev) =>
        prev.map((g, i) => (i === activeGuide.index ? { ...g, value: worldX } : g))
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!activeGuide) return;
    const parent = topCanvasRef.current?.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      // If dragged back into ruler, remove guide
      if (activeGuide.axis === "y" && e.clientY - rect.top < 20) {
        setGuides((prev) => prev.filter((_, i) => i !== activeGuide.index));
      } else if (activeGuide.axis === "x" && e.clientX - rect.left < 20) {
        setGuides((prev) => prev.filter((_, i) => i !== activeGuide.index));
      }
    }
    setActiveGuide(null);
  };

  if (!rulersVisible) return null;

  return (
    <>
      {/* Top Ruler Canvas */}
      <canvas
        ref={topCanvasRef}
        data-rl="y"
        onPointerDown={handleTopRulerPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="absolute top-0 left-0 z-20 cursor-ns-resize select-none"
        title="Top Ruler (Drag down to create horizontal guide)"
      />

      {/* Left Ruler Canvas */}
      <canvas
        ref={leftCanvasRef}
        data-rl="x"
        onPointerDown={handleLeftRulerPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="absolute top-0 left-0 z-20 cursor-ew-resize select-none"
        title="Left Ruler (Drag right to create vertical guide)"
      />

      {/* Top-Left Corner Box (20x20) */}
      <div
        onClick={() => setRulersVisible(!rulersVisible)}
        className="w-5 h-5 bg-[#0D0D0D] border-r border-b border-[#222222] absolute top-0 left-0 z-30 cursor-pointer flex items-center justify-center text-[10px] text-[#555555] hover:text-white transition-colors"
        title="Toggle Rulers (Shift + R)"
      >
        <span className="text-[9px] font-mono leading-none">px</span>
      </div>

      {/* Guides Layer */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {guides.map((g, i) => {
          if (g.axis === "y") {
            // Horizontal guide (y)
            const cy = viewport.height / 2;
            const screenY = cy + camera.y + g.value * camera.zoom;
            return (
              <div
                key={`guide-y-${i}`}
                style={{
                  position: "absolute",
                  top: `${screenY}px`,
                  left: 0,
                  right: 0,
                  height: "1px",
                  background: "#FF5E2E",
                  cursor: "ns-resize",
                  pointerEvents: "auto",
                }}
                title={`Guide Y: ${Math.round(g.value)}px`}
                onDoubleClick={() =>
                  setGuides((prev) => prev.filter((_, idx) => idx !== i))
                }
              />
            );
          } else {
            // Vertical guide (x)
            const cx = viewport.width / 2;
            const screenX = cx + camera.x + g.value * camera.zoom;
            return (
              <div
                key={`guide-x-${i}`}
                style={{
                  position: "absolute",
                  left: `${screenX}px`,
                  top: 0,
                  bottom: 0,
                  width: "1px",
                  background: "#FF5E2E",
                  cursor: "ew-resize",
                  pointerEvents: "auto",
                }}
                title={`Guide X: ${Math.round(g.value)}px`}
                onDoubleClick={() =>
                  setGuides((prev) => prev.filter((_, idx) => idx !== i))
                }
              />
            );
          }
        })}
      </div>
    </>
  );
}
