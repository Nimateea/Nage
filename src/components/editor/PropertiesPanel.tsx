"use client";

import React, { useState } from "react";
import { useEditorStore } from "@/lib/canvas/store/editorStore";
import {
  UpdateProps,
  MoveNodes,
  ReorderNodes,
} from "@/lib/canvas/commands";
import type {
  CanvasNode,
  RectangleNode,
  FrameNode,
  TextNode,
  EllipseNode,
  LineNode,
} from "@/lib/canvas/document/types";

const FRAME_PRESETS = [
  { label: "Frame size", value: "" },
  { label: "Phone (390 × 844)", value: "390,844" },
  { label: "Tablet (834 × 1194)", value: "834,1194" },
  { label: "Desktop (1440 × 1024)", value: "1440,1024" },
  { label: "Slide (1920 × 1080)", value: "1920,1080" },
  { label: "Square (1080 × 1080)", value: "1080,1080" },
  { label: "A4 (595 × 842)", value: "595,842" },
];

const FONT_WEIGHTS = [
  { label: "Light (300)", value: "300" },
  { label: "Regular (400)", value: "400" },
  { label: "Medium (500)", value: "500" },
  { label: "Semibold (600)", value: "600" },
  { label: "Bold (700)", value: "700" },
];

export function PropertiesPanel() {
  const { document, selectedIds, executeCommand } = useEditorStore();
  const [lockRatio, setLockRatio] = useState(false);

  if (selectedIds.size === 0) return null;

  const selectedNodes = document.nodes.filter((n) => selectedIds.has(n.id));
  if (selectedNodes.length === 0) return null;

  const isSingle = selectedNodes.length === 1;
  const singleNode = isSingle ? selectedNodes[0] : null;

  // ── Layer Reordering ────────────────────────────────────────────────────────
  const handleReorder = (action: "front" | "fwd" | "bwd" | "back") => {
    const curNodes = [...document.nodes];
    const isSel = (n: CanvasNode) => selectedIds.has(n.id);

    let nextNodes: CanvasNode[] = [];
    if (action === "front") {
      const nonSelected = curNodes.filter((n) => !isSel(n));
      const selected = curNodes.filter(isSel);
      nextNodes = [...nonSelected, ...selected];
    } else if (action === "back") {
      const nonSelected = curNodes.filter((n) => !isSel(n));
      const selected = curNodes.filter(isSel);
      nextNodes = [...selected, ...nonSelected];
    } else if (action === "fwd") {
      nextNodes = [...curNodes];
      for (let i = nextNodes.length - 2; i >= 0; i--) {
        if (isSel(nextNodes[i]) && !isSel(nextNodes[i + 1])) {
          const temp = nextNodes[i];
          nextNodes[i] = nextNodes[i + 1];
          nextNodes[i + 1] = temp;
        }
      }
    } else if (action === "bwd") {
      nextNodes = [...curNodes];
      for (let i = 1; i < nextNodes.length; i++) {
        if (isSel(nextNodes[i]) && !isSel(nextNodes[i - 1])) {
          const temp = nextNodes[i];
          nextNodes[i] = nextNodes[i - 1];
          nextNodes[i - 1] = temp;
        }
      }
    }

    executeCommand(new ReorderNodes(document.nodes, nextNodes));
  };

  // ── Alignments ─────────────────────────────────────────────────────────────
  const handleAlign = (type: "left" | "hc" | "right" | "top" | "vm" | "bottom") => {
    if (selectedNodes.length < 2) return;

    let movements: { nodeId: string; dx: number; dy: number }[] = [];

    if (type === "left") {
      const minX = Math.min(...selectedNodes.map((n) => n.x));
      movements = selectedNodes.map((n) => ({
        nodeId: n.id,
        dx: minX - n.x,
        dy: 0,
      }));
    } else if (type === "hc") {
      const minX = Math.min(...selectedNodes.map((n) => n.x));
      const maxX = Math.max(...selectedNodes.map((n) => n.x + n.width));
      const midX = (minX + maxX) / 2;
      movements = selectedNodes.map((n) => ({
        nodeId: n.id,
        dx: Math.round(midX - n.width / 2 - n.x),
        dy: 0,
      }));
    } else if (type === "right") {
      const maxX = Math.max(...selectedNodes.map((n) => n.x + n.width));
      movements = selectedNodes.map((n) => ({
        nodeId: n.id,
        dx: maxX - (n.x + n.width),
        dy: 0,
      }));
    } else if (type === "top") {
      const minY = Math.min(...selectedNodes.map((n) => n.y));
      movements = selectedNodes.map((n) => ({
        nodeId: n.id,
        dx: 0,
        dy: minY - n.y,
      }));
    } else if (type === "vm") {
      const minY = Math.min(...selectedNodes.map((n) => n.y));
      const maxY = Math.max(...selectedNodes.map((n) => n.y + n.height));
      const midY = (minY + maxY) / 2;
      movements = selectedNodes.map((n) => ({
        nodeId: n.id,
        dx: 0,
        dy: Math.round(midY - n.height / 2 - n.y),
      }));
    } else if (type === "bottom") {
      const maxY = Math.max(...selectedNodes.map((n) => n.y + n.height));
      movements = selectedNodes.map((n) => ({
        nodeId: n.id,
        dx: 0,
        dy: maxY - (n.y + n.height),
      }));
    }

    if (movements.length > 0) {
      executeCommand(new MoveNodes(movements));
    }
  };

  // ── Spacing Distribution ───────────────────────────────────────────────────
  const handleDistribute = (axis: "h" | "v") => {
    if (selectedNodes.length < 3) return;

    if (axis === "h") {
      const sorted = [...selectedNodes].sort((a, b) => a.x - b.x);
      const totalSpan =
        sorted[sorted.length - 1].x +
        sorted[sorted.length - 1].width -
        sorted[0].x;
      const totalWidths = sorted.reduce((sum, n) => sum + n.width, 0);
      const gap = Math.max(0, (totalSpan - totalWidths) / (sorted.length - 1));

      let curX = sorted[0].x;
      const movements: { nodeId: string; dx: number; dy: number }[] = [];
      for (const node of sorted) {
        movements.push({ nodeId: node.id, dx: Math.round(curX - node.x), dy: 0 });
        curX += node.width + gap;
      }
      executeCommand(new MoveNodes(movements));
    } else {
      const sorted = [...selectedNodes].sort((a, b) => a.y - b.y);
      const totalSpan =
        sorted[sorted.length - 1].y +
        sorted[sorted.length - 1].height -
        sorted[0].y;
      const totalHeights = sorted.reduce((sum, n) => sum + n.height, 0);
      const gap = Math.max(0, (totalSpan - totalHeights) / (sorted.length - 1));

      let curY = sorted[0].y;
      const movements: { nodeId: string; dx: number; dy: number }[] = [];
      for (const node of sorted) {
        movements.push({ nodeId: node.id, dx: 0, dy: Math.round(curY - node.y) });
        curY += node.height + gap;
      }
      executeCommand(new MoveNodes(movements));
    }
  };

  // ── Property Updates ───────────────────────────────────────────────────────
  const updateSingleNode = (nextProps: Partial<CanvasNode>) => {
    if (!singleNode) return;
    executeCommand(new UpdateProps(singleNode.id, singleNode, nextProps));
  };

  const updateFillColor = (hex: string) => {
    selectedNodes.forEach((node) => {
      if (node.type === "text") {
        executeCommand(new UpdateProps(node.id, node, { color: hex }));
      } else if ("fill" in node) {
        const nextFill = { type: "solid" as const, color: hex, opacity: 1 };
        executeCommand(new UpdateProps(node.id, node, { fill: nextFill }));
      }
    });
  };

  const updateStrokeColor = (hex: string) => {
    selectedNodes.forEach((node) => {
      if ("stroke" in node) {
        const strokeNode = node as RectangleNode | EllipseNode | FrameNode | LineNode;
        const nextStroke = {
          ...strokeNode.stroke,
          color: hex,
          width: strokeNode.stroke.width || 1,
        };
        executeCommand(new UpdateProps(node.id, node, { stroke: nextStroke }));
      }
    });
  };

  const updateStrokeWidth = (width: number) => {
    selectedNodes.forEach((node) => {
      if ("stroke" in node) {
        const strokeNode = node as RectangleNode | EllipseNode | FrameNode | LineNode;
        const nextStroke = {
          ...strokeNode.stroke,
          width: Math.max(0, width),
        };
        executeCommand(new UpdateProps(node.id, node, { stroke: nextStroke }));
      }
    });
  };

  // Extract primary colors for swatches
  let currentFillHex = "#FFFFFF";
  if (singleNode) {
    if (singleNode.type === "text") {
      currentFillHex = singleNode.color || "#FFFFFF";
    } else if ("fill" in singleNode && singleNode.fill.type === "solid") {
      currentFillHex = singleNode.fill.color || "#FFFFFF";
    }
  }

  let currentStrokeHex = "#333333";
  let currentStrokeWidth = 0;
  if (singleNode && "stroke" in singleNode) {
    const s = (singleNode as RectangleNode).stroke;
    currentStrokeHex = s.color || "#333333";
    currentStrokeWidth = s.width || 0;
  }

  return (
    <div className="ps select-none">
      {/* 1. Alignment (when 2+ nodes selected) */}
      {selectedNodes.length > 1 && (
        <div className="ps-s">
          <div className="ps-t">Alignment</div>
          <div className="ps-r" style={{ marginBottom: 0 }}>
            <button
              type="button"
              className="ps-b"
              onClick={() => handleAlign("left")}
              title="Align left"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3v14M6 5h10v4H6zM6 11h6v4H6z" />
              </svg>
            </button>
            <button
              type="button"
              className="ps-b"
              onClick={() => handleAlign("hc")}
              title="Align horizontal centers"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 3v14M4 5h12v4H4zM6 11h8v4H6z" />
              </svg>
            </button>
            <button
              type="button"
              className="ps-b"
              onClick={() => handleAlign("right")}
              title="Align right"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 3v14M4 5h10v4H4zM8 11h6v4H8z" />
              </svg>
            </button>
            <button
              type="button"
              className="ps-b"
              onClick={() => handleAlign("top")}
              title="Align top"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3h14M5 6v10h4V6zM11 6v6h4V6z" />
              </svg>
            </button>
            <button
              type="button"
              className="ps-b"
              onClick={() => handleAlign("vm")}
              title="Align vertical centers"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 10h14M5 4v12h4V4zM11 6v8h4V6z" />
              </svg>
            </button>
            <button
              type="button"
              className="ps-b"
              onClick={() => handleAlign("bottom")}
              title="Align bottom"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 17h14M5 4v10h4V4zM11 8v6h4V8z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 2. Spacing Distribution (when 3+ nodes selected) */}
      {selectedNodes.length > 2 && (
        <div className="ps-s">
          <div className="ps-t">Spacing</div>
          <div className="ps-r" style={{ marginBottom: 0 }}>
            <button
              type="button"
              className="ps-b"
              onClick={() => handleDistribute("h")}
              title="Distribute horizontal spacing"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3v14M17 3v14M8 6v8h4V6z" />
              </svg>
            </button>
            <button
              type="button"
              className="ps-b"
              onClick={() => handleDistribute("v")}
              title="Distribute vertical spacing"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3h14M3 17h14M6 8h8v4H6z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 3. Layer Order */}
      <div className="ps-s">
        <div className="ps-t">Layer order</div>
        <div className="ps-r" style={{ marginBottom: 0 }}>
          <button
            type="button"
            className="ps-b"
            onClick={() => handleReorder("front")}
            title="Bring to front (⇧⌘])"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 15l5-5 5 5M5 9l5-5 5 5" />
            </svg>
          </button>
          <button
            type="button"
            className="ps-b"
            onClick={() => handleReorder("fwd")}
            title="Bring forward (⌘])"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 12l5-5 5 5" />
            </svg>
          </button>
          <button
            type="button"
            className="ps-b"
            onClick={() => handleReorder("bwd")}
            title="Send backward (⌘[)"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 8l5 5 5-5" />
            </svg>
          </button>
          <button
            type="button"
            className="ps-b"
            onClick={() => handleReorder("back")}
            title="Send to back (⇧⌘[)"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 11l5 5 5-5M5 5l5 5 5-5" />
            </svg>
          </button>
        </div>
      </div>

      {/* 4. Position (Single selection) */}
      {singleNode && (
        <div className="ps-s">
          <div className="ps-t">Position</div>
          <div className="ps-g">
            <label className="pf" title="X Position">
              <span>X</span>
              <input
                type="number"
                value={Math.round(singleNode.x)}
                onChange={(e) => updateSingleNode({ x: Number(e.target.value) })}
              />
            </label>
            <label className="pf" title="Y Position">
              <span>Y</span>
              <input
                type="number"
                value={Math.round(singleNode.y)}
                onChange={(e) => updateSingleNode({ y: Number(e.target.value) })}
              />
            </label>
            <label className="pf" title="Rotation angle">
              <span>∠</span>
              <input
                type="number"
                value={Math.round(singleNode.rotation || 0)}
                onChange={(e) => updateSingleNode({ rotation: Number(e.target.value) })}
              />
            </label>
          </div>
        </div>
      )}

      {/* 5. Size (Single selection) */}
      {singleNode && (
        <div className="ps-s">
          <div className="ps-t">Size</div>
          <div className="ps-g">
            <label className="pf" title="Width">
              <span>W</span>
              <input
                type="number"
                value={Math.round(singleNode.width)}
                onChange={(e) => {
                  const newW = Math.max(10, Number(e.target.value));
                  if (lockRatio && singleNode.width > 0) {
                    const aspect = singleNode.height / singleNode.width;
                    updateSingleNode({ width: newW, height: Math.round(newW * aspect) });
                  } else {
                    updateSingleNode({ width: newW });
                  }
                }}
              />
            </label>
            <label className="pf" title="Height">
              <span>H</span>
              <input
                type="number"
                value={Math.round(singleNode.height)}
                onChange={(e) => {
                  const newH = Math.max(10, Number(e.target.value));
                  if (lockRatio && singleNode.height > 0) {
                    const aspect = singleNode.width / singleNode.height;
                    updateSingleNode({ height: newH, width: Math.round(newH * aspect) });
                  } else {
                    updateSingleNode({ height: newH });
                  }
                }}
              />
            </label>
          </div>
          <div className="ps-r">
            <button
              type="button"
              className={`ps-b ${lockRatio ? "on" : ""}`}
              onClick={() => setLockRatio(!lockRatio)}
              title="Constrain proportions"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </button>
            <span style={{ fontSize: "11px", color: "#666666" }}>
              Constrain proportions
            </span>
          </div>
        </div>
      )}

      {/* 6. Frame Presets (Frame nodes only) */}
      {singleNode && singleNode.type === "frame" && (
        <div className="ps-s">
          <div className="ps-t">Frame</div>
          <select
            className="ps-sel"
            onChange={(e) => {
              if (e.target.value) {
                const [w, h] = e.target.value.split(",").map(Number);
                updateSingleNode({ width: w, height: h });
                e.target.selectedIndex = 0;
              }
            }}
          >
            {FRAME_PRESETS.map((p) => (
              <option key={p.label} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 7. Appearance */}
      <div className="ps-s">
        <div className="ps-t">Appearance</div>
        <div className="ps-g">
          <label className="pf" title="Opacity">
            <span>%</span>
            <input
              type="number"
              min="0"
              max="100"
              value={Math.round((singleNode ? singleNode.opacity : 1) * 100)}
              onChange={(e) => {
                const val = Math.min(100, Math.max(0, Number(e.target.value))) / 100;
                selectedNodes.forEach((node) => {
                  executeCommand(new UpdateProps(node.id, node, { opacity: val }));
                });
              }}
            />
          </label>
          {singleNode && "cornerRadius" in singleNode && (
            <label className="pf" title="Corner radius">
              <span>◜</span>
              <input
                type="number"
                min="0"
                value={(singleNode as RectangleNode | FrameNode).cornerRadius || 0}
                onChange={(e) =>
                  updateSingleNode({ cornerRadius: Math.max(0, Number(e.target.value)) })
                }
              />
            </label>
          )}
        </div>
      </div>

      {/* 8. Text Typography (Text nodes only) */}
      {singleNode && singleNode.type === "text" && (
        <div className="ps-s">
          <div className="ps-t">Text</div>
          <div className="ps-g">
            <select
              className="ps-sel"
              value={String(singleNode.fontWeight || 400)}
              onChange={(e) =>
                updateSingleNode({
                  fontWeight: Number(e.target.value) as TextNode["fontWeight"],
                })
              }
            >
              {FONT_WEIGHTS.map((w) => (
                <option key={w.label} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
            <label className="pf" title="Font size">
              <span>Aa</span>
              <input
                type="number"
                min="8"
                max="200"
                value={singleNode.fontSize}
                onChange={(e) =>
                  updateSingleNode({ fontSize: Math.max(8, Number(e.target.value)) })
                }
              />
            </label>
          </div>
          <div className="ps-r">
            <button
              type="button"
              className={`ps-b ${singleNode.textAlign === "left" ? "on" : ""}`}
              onClick={() => updateSingleNode({ textAlign: "left" })}
              title="Align left"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="17" y1="10" x2="3" y2="10" />
                <line x1="21" y1="6" x2="3" y2="6" />
                <line x1="21" y1="14" x2="3" y2="14" />
                <line x1="17" y1="18" x2="3" y2="18" />
              </svg>
            </button>
            <button
              type="button"
              className={`ps-b ${singleNode.textAlign === "center" ? "on" : ""}`}
              onClick={() => updateSingleNode({ textAlign: "center" })}
              title="Align center"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="10" x2="6" y2="10" />
                <line x1="21" y1="6" x2="3" y2="6" />
                <line x1="21" y1="14" x2="3" y2="14" />
                <line x1="18" y1="18" x2="6" y2="18" />
              </svg>
            </button>
            <button
              type="button"
              className={`ps-b ${singleNode.textAlign === "right" ? "on" : ""}`}
              onClick={() => updateSingleNode({ textAlign: "right" })}
              title="Align right"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="21" y1="10" x2="7" y2="10" />
                <line x1="21" y1="6" x2="3" y2="6" />
                <line x1="21" y1="14" x2="3" y2="14" />
                <line x1="21" y1="18" x2="7" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 9. Fill */}
      {selectedNodes.some((n) => "fill" in n || n.type === "text") && (
        <div className="ps-s">
          <div className="ps-t">Fill</div>
          <div className="ps-r">
            <input
              type="color"
              className="ps-col"
              value={currentFillHex.startsWith("#") ? currentFillHex : "#FFFFFF"}
              onChange={(e) => updateFillColor(e.target.value)}
            />
            <input
              type="text"
              className="ps-hex"
              value={currentFillHex.toUpperCase()}
              onChange={(e) => {
                let val = e.target.value.trim();
                if (!val.startsWith("#")) val = `#${val}`;
                if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                  updateFillColor(val);
                }
              }}
              spellCheck={false}
            />
          </div>
        </div>
      )}

      {/* 10. Stroke */}
      {selectedNodes.some((n) => "stroke" in n) && (
        <div className="ps-s">
          <div className="ps-t">Stroke</div>
          <div className="ps-r">
            <input
              type="color"
              className="ps-col"
              value={currentStrokeHex.startsWith("#") ? currentStrokeHex : "#333333"}
              onChange={(e) => updateStrokeColor(e.target.value)}
            />
            <input
              type="number"
              min="0"
              max="100"
              className="ps-hex"
              style={{ flex: "0 0 64px" }}
              value={currentStrokeWidth}
              onChange={(e) => updateStrokeWidth(Number(e.target.value))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
