"use client";

import React, { useState, useRef, useEffect } from "react";
import { useEditorStore } from "@/lib/canvas/store/editorStore";
import {
  UpdateProps,
  DeleteNode,
  ReorderNodes,
} from "@/lib/canvas/commands";
import type { CanvasNode } from "@/lib/canvas/document/types";

export function LayersPanel() {
  const {
    document,
    selectedIds,
    layersPanelOpen,
    setSelectedIds,
    toggleSelectId,
    toggleLayersPanel,
    executeCommand,
  } = useEditorStore();

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus rename input on double-click
  useEffect(() => {
    if (editingNodeId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingNodeId]);

  // Keyboard shortcut: Option+L / Alt+L to toggle layers panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "KeyL") {
        e.preventDefault();
        toggleLayersPanel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleLayersPanel]);

  // ── Renaming ───────────────────────────────────────────────────────────────
  const startRename = (node: CanvasNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNodeId(node.id);
    setEditingName(node.name);
  };

  const commitRename = (nodeId: string) => {
    const node = document.nodes.find((n) => n.id === nodeId);
    if (node) {
      const trimmed = editingName.trim() || node.name;
      if (trimmed !== node.name) {
        executeCommand(new UpdateProps(node.id, node, { name: trimmed }));
      }
    }
    setEditingNodeId(null);
  };

  // ── Visibility & Lock Toggles ──────────────────────────────────────────────
  const toggleVisibility = (node: CanvasNode, e: React.MouseEvent) => {
    e.stopPropagation();
    executeCommand(
      new UpdateProps(node.id, node, { visible: node.visible === false })
    );
  };

  const toggleLock = (node: CanvasNode, e: React.MouseEvent) => {
    e.stopPropagation();
    executeCommand(
      new UpdateProps(node.id, node, { locked: !node.locked })
    );
  };

  // ── Reorder ────────────────────────────────────────────────────────────────
  const moveLayer = (nodeId: string, direction: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation();
    const curNodes = [...document.nodes];
    const idx = curNodes.findIndex((n) => n.id === nodeId);
    if (idx === -1) return;

    // Note: List is displayed in reverse z-order, so "up" in list means increasing canvas index
    const targetIdx = direction === "up" ? idx + 1 : idx - 1;
    if (targetIdx < 0 || targetIdx >= curNodes.length) return;

    const temp = curNodes[idx];
    curNodes[idx] = curNodes[targetIdx];
    curNodes[targetIdx] = temp;

    executeCommand(new ReorderNodes(document.nodes, curNodes));
  };

  const deleteLayer = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    executeCommand(new DeleteNode(nodeId));
  };

  // ── Icons for Node Types ───────────────────────────────────────────────────
  const renderTypeIcon = (type: CanvasNode["type"]) => {
    switch (type) {
      case "frame":
        return (
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 2.5v15M14 2.5v15M2.5 6h15M2.5 14h15" strokeLinecap="round" />
          </svg>
        );
      case "rectangle":
        return (
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="14" height="14" rx="3" />
          </svg>
        );
      case "ellipse":
        return (
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="10" cy="10" r="7" />
          </svg>
        );
      case "line":
        return (
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="3" y1="17" x2="17" y2="3" strokeLinecap="round" />
          </svg>
        );
      case "text":
        return (
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 5h12M10 5v11M7 16h6" strokeLinecap="round" />
          </svg>
        );
      case "image":
        return (
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2.5" y="2.5" width="15" height="15" rx="3" />
            <circle cx="7" cy="7" r="1.5" />
            <path d="M17.5 13.5l-4-4-7 7" strokeLinecap="round" />
          </svg>
        );
    }
  };

  // If panel is collapsed, render small floating trigger button on top left
  if (!layersPanelOpen) {
    return (
      <button
        type="button"
        onClick={toggleLayersPanel}
        className="fixed left-4 top-[76px] z-20 bg-[#111111] border border-[#222222] rounded-full p-2.5 text-[#A0A0A0] hover:text-white transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.6)] cursor-pointer"
        title="Open Layers (⌥L)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      </button>
    );
  }

  // Reverse z-order: Topmost canvas item is rendered at the top of the layer list
  const displayNodes = [...document.nodes].reverse();

  return (
    <div className="fixed left-4 top-[76px] w-[240px] max-h-[calc(100vh-160px)] z-20 bg-[#111111] border border-[#222222] rounded-[20px] p-3 shadow-[0_20px_40px_rgba(0,0,0,0.6)] flex flex-col text-xs text-[#A0A0A0] select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-1 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          <span className="text-white font-medium text-[12px]">Layers</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-[#1A1A1A] text-[#888888]">
            {document.nodes.length}
          </span>
        </div>
        <button
          type="button"
          onClick={toggleLayersPanel}
          className="text-[#666666] hover:text-white transition-colors p-1 rounded-md"
          title="Collapse Layers (⌥L)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5">
        {displayNodes.length === 0 ? (
          <div className="py-8 text-center text-[#555555] text-[11px]">
            No layers yet
            <div className="mt-1 text-[#444444]">Draw shapes with R, O, F, or T</div>
          </div>
        ) : (
          displayNodes.map((node, reverseIdx) => {
            const isSelected = selectedIds.has(node.id);
            const isEditing = editingNodeId === node.id;
            const isTop = reverseIdx === 0;
            const isBottom = reverseIdx === displayNodes.length - 1;

            return (
              <div
                key={node.id}
                onClick={(e) => {
                  if (e.shiftKey) {
                    toggleSelectId(node.id);
                  } else {
                    setSelectedIds([node.id]);
                  }
                }}
                onDoubleClick={(e) => startRename(node, e)}
                className={`group relative flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-[#2A2A2A] text-white"
                    : "hover:bg-[#181818] text-[#A0A0A0]"
                }`}
              >
                {/* Active selection accent line */}
                {isSelected && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#2E5CFF] rounded-r" />
                )}

                {/* Left: Icon & Name */}
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2 pl-1">
                  <span className={`${isSelected ? "text-[#2E5CFF]" : "text-[#777777]"}`}>
                    {renderTypeIcon(node.type)}
                  </span>

                  {isEditing ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => commitRename(node.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(node.id);
                        if (e.key === "Escape") setEditingNodeId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-[#111111] text-white text-[12px] px-1 py-0.5 rounded border border-[#2E5CFF] outline-none min-w-0"
                    />
                  ) : (
                    <span
                      className={`truncate text-[12px] ${
                        node.visible === false ? "opacity-40 line-through" : ""
                      }`}
                      title={`${node.name} (Double-click to rename)`}
                    >
                      {node.name}
                    </span>
                  )}
                </div>

                {/* Right: Layer action buttons (reorder, visibility, lock) */}
                <div
                  className={`flex items-center gap-1 transition-opacity ${
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Move Up */}
                  <button
                    type="button"
                    disabled={isTop}
                    onClick={(e) => moveLayer(node.id, "up", e)}
                    className="p-0.5 text-[#666666] hover:text-white disabled:opacity-20 disabled:hover:text-[#666666]"
                    title="Move Layer Up"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>

                  {/* Move Down */}
                  <button
                    type="button"
                    disabled={isBottom}
                    onClick={(e) => moveLayer(node.id, "down", e)}
                    className="p-0.5 text-[#666666] hover:text-white disabled:opacity-20 disabled:hover:text-[#666666]"
                    title="Move Layer Down"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Visibility toggle */}
                  <button
                    type="button"
                    onClick={(e) => toggleVisibility(node, e)}
                    className={`p-0.5 hover:text-white ${
                      node.visible === false ? "text-[#E05252]" : "text-[#666666]"
                    }`}
                    title={node.visible === false ? "Show layer" : "Hide layer"}
                  >
                    {node.visible === false ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>

                  {/* Lock toggle */}
                  <button
                    type="button"
                    onClick={(e) => toggleLock(node, e)}
                    className={`p-0.5 hover:text-white ${
                      node.locked ? "text-[#FF9F2E]" : "text-[#666666]"
                    }`}
                    title={node.locked ? "Unlock layer" : "Lock layer"}
                  >
                    {node.locked ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                      </svg>
                    )}
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => deleteLayer(node.id, e)}
                    className="p-0.5 text-[#666666] hover:text-[#E05252] transition-colors"
                    title="Delete layer"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
