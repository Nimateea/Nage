"use client";

import React from "react";
import { useEditorStore } from "@/lib/canvas/store/editorStore";
import type { CanvasNode, TextNode } from "@/lib/canvas/document/types";

export function ContextToolbar() {
  const { document, selectedIds } = useEditorStore();

  if (selectedIds.size === 0) return null;

  const selectedNode = document.nodes.find((n) => selectedIds.has(n.id));
  if (!selectedNode) return null;

  const isText = selectedNode.type === "text";
  const isFrameOrShape =
    selectedNode.type === "frame" ||
    selectedNode.type === "rectangle" ||
    selectedNode.type === "ellipse";

  if (!isText && !isFrameOrShape) return null;

  const updateNode = (updater: (node: CanvasNode) => CanvasNode) => {
    useEditorStore.setState((s) => ({
      document: {
        ...s.document,
        nodes: s.document.nodes.map((n) =>
          s.selectedIds.has(n.id) ? updater(n) : n
        ),
      },
    }));
  };

  const currentFontSize = isText ? (selectedNode as TextNode).fontSize || 16 : 16;
  const currentWeight = isText ? (selectedNode as TextNode).fontWeight : 400;
  const currentAlign = isText ? (selectedNode as TextNode).textAlign : "left";

  return (
    <div className="fixed top-[84px] left-1/2 transform -translate-x-1/2 z-20 bg-[#111111] border border-[#222222] rounded-full px-4 py-2 flex items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] select-none text-[13px] text-white">
      {isText && (
        <>
          {/* Font size - */}
          <button
            type="button"
            onClick={() => {
              updateNode((n) =>
                n.type === "text"
                  ? { ...n, fontSize: Math.max(8, (n.fontSize || 16) - 2) }
                  : n
              );
            }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A] transition-colors cursor-pointer"
            title="Decrease font size"
          >
            −
          </button>

          <span className="text-[#A0A0A0] text-xs font-mono w-6 text-center">
            {currentFontSize}
          </span>

          {/* Font size + */}
          <button
            type="button"
            onClick={() => {
              updateNode((n) =>
                n.type === "text"
                  ? { ...n, fontSize: Math.min(144, (n.fontSize || 16) + 2) }
                  : n
              );
            }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A] transition-colors cursor-pointer"
            title="Increase font size"
          >
            +
          </button>

          {/* Divider */}
          <div className="w-[1px] h-4 bg-[#333333]" />

          {/* Bold */}
          <button
            type="button"
            onClick={() => {
              updateNode((n) =>
                n.type === "text"
                  ? { ...n, fontWeight: n.fontWeight === 700 ? 400 : 700 }
                  : n
              );
            }}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              currentWeight === 700
                ? "bg-[#2A2A2A] text-white"
                : "text-[#A0A0A0] hover:text-white"
            }`}
            title="Bold"
          >
            <b>B</b>
          </button>

          {/* Divider */}
          <div className="w-[1px] h-4 bg-[#333333]" />

          {/* Alignment */}
          <button
            type="button"
            onClick={() => {
              updateNode((n) =>
                n.type === "text" ? { ...n, textAlign: "left" } : n
              );
            }}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              currentAlign === "left"
                ? "bg-[#2A2A2A] text-white"
                : "text-[#A0A0A0] hover:text-white"
            }`}
            title="Align Left"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="21" y1="6" x2="3" y2="6" />
              <line x1="15" y1="12" x2="3" y2="12" />
              <line x1="17" y1="18" x2="3" y2="18" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              updateNode((n) =>
                n.type === "text" ? { ...n, textAlign: "center" } : n
              );
            }}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              currentAlign === "center"
                ? "bg-[#2A2A2A] text-white"
                : "text-[#A0A0A0] hover:text-white"
            }`}
            title="Align Center"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="21" y1="6" x2="3" y2="6" />
              <line x1="18" y1="12" x2="6" y2="12" />
              <line x1="21" y1="18" x2="3" y2="18" />
            </svg>
          </button>
        </>
      )}

      {isFrameOrShape && (
        <>
          {/* Preset frame sizes */}
          <select
            defaultValue=""
            onChange={(e) => {
              const val = e.target.value;
              if (!val) return;
              const [w, h] = val.split(",").map(Number);
              updateNode((n) =>
                n.type === "frame" || n.type === "rectangle"
                  ? { ...n, width: w, height: h }
                  : n
              );
            }}
            className="bg-transparent text-[#A0A0A0] text-xs outline-none cursor-pointer"
          >
            <option value="" className="bg-[#111111] text-white">
              Frame size
            </option>
            <option value="1440,1024" className="bg-[#111111] text-white">
              Desktop (1440 × 1024)
            </option>
            <option value="834,1194" className="bg-[#111111] text-white">
              Tablet (834 × 1194)
            </option>
            <option value="390,844" className="bg-[#111111] text-white">
              Phone (390 × 844)
            </option>
            <option value="1080,1080" className="bg-[#111111] text-white">
              Square (1080 × 1080)
            </option>
          </select>
        </>
      )}

      {/* Color Swatches matching prototype: #FFFFFF, #A0A0A0, #2E5CFF, #FF5E2E */}
      <div className="w-[1px] h-4 bg-[#333333]" />
      <div className="flex items-center gap-1.5">
        {["#FFFFFF", "#A0A0A0", "#2E5CFF", "#FF5E2E"].map((col) => (
          <button
            key={col}
            type="button"
            onClick={() => {
              updateNode((n) => {
                if (n.type === "text") return { ...n, color: col };
                if (
                  n.type === "rectangle" ||
                  n.type === "ellipse" ||
                  n.type === "frame"
                ) {
                  return { ...n, fill: { type: "solid", color: col, opacity: 1 } };
                }
                return n;
              });
            }}
            style={{ backgroundColor: col }}
            className="w-4 h-4 rounded-full border border-[#333333] hover:scale-110 transition-transform cursor-pointer"
            title={`Set color ${col}`}
          />
        ))}
      </div>
    </div>
  );
}
