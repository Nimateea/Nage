"use client";

import React, { useState, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
import { useEditorStore } from "@/lib/canvas/store/editorStore";
import {
  AddNode,
  UpdateProps,
  DeleteNode,
  ReorderNodes,
} from "@/lib/canvas/commands";
import {
  makeFrame,
  makeText,
  makeRectangle,
} from "@/lib/canvas/document/defaults";
import type { CanvasNode, TextNode } from "@/lib/canvas/document/types";

export function LayersPanel() {
  const {
    document,
    selectedIds,
    layersPanelOpen,
    layersPanelTab,
    pages,
    currentPageId,
    setSelectedIds,
    toggleSelectId,
    toggleLayersPanel,
    setLayersPanelTab,
    addPage,
    renamePage,
    deletePage,
    setCurrentPageId,
    executeCommand,
    showToast,
  } = useEditorStore();

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingPageName, setEditingPageName] = useState("");
  const [collapsedFrames, setCollapsedFrames] = useState<Set<string>>(new Set());

  // AI chat state
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<
    { sender: "user" | "ai"; text: string }[]
  >([
    {
      sender: "ai",
      text: "I can design layout frames, generate color palettes, and rewrite copy. Select layers or click a prompt below.",
    },
  ]);
  const [isAiBusy, setIsAiBusy] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const pageInputRef = useRef<HTMLInputElement>(null);
  const aiLogRef = useRef<HTMLDivElement>(null);

  // Focus rename input on double-click
  useEffect(() => {
    if (editingNodeId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingNodeId]);

  useEffect(() => {
    if (editingPageId && pageInputRef.current) {
      pageInputRef.current.focus();
      pageInputRef.current.select();
    }
  }, [editingPageId]);

  useEffect(() => {
    if (aiLogRef.current) {
      aiLogRef.current.scrollTop = aiLogRef.current.scrollHeight;
    }
  }, [aiMessages]);

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

  // ── Renaming Nodes ─────────────────────────────────────────────────────────
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

    // List displayed in reverse z-order, so "up" in list means increasing canvas index
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

  const toggleFrameCollapse = (frameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedFrames((prev) => {
      const next = new Set(prev);
      if (next.has(frameId)) next.delete(frameId);
      else next.add(frameId);
      return next;
    });
  };

  // ── AI Assistant Actions ───────────────────────────────────────────────────
  const runAiPrompt = (promptText: string) => {
    const q = promptText.trim();
    if (!q || isAiBusy) return;

    setAiMessages((prev) => [...prev, { sender: "user", text: q }]);
    setIsAiBusy(true);

    setTimeout(() => {
      const lower = q.toLowerCase();

      if (lower.includes("palette") || lower.includes("color")) {
        // Generate Color Palette on Canvas
        const colors = [
          { name: "Primary Blue", hex: "#2E5CFF" },
          { name: "Accent Coral", hex: "#FF5E2E" },
          { name: "Dark Surface", hex: "#111111" },
          { name: "Card Neutral", hex: "#1A1A1A" },
          { name: "Muted Grey", hex: "#A0A0A0" },
        ];
        const frameX = 100;
        const frameY = 100;
        const palFrame = makeFrame({
          id: nanoid(),
          name: "Color Palette",
          x: frameX,
          y: frameY,
          width: 520,
          height: 140,
          cornerRadius: 16,
          fill: { type: "solid", color: "#0A0A0A", opacity: 1 },
          stroke: { color: "#222222", width: 1, opacity: 1, style: "solid" },
        });
        executeCommand(new AddNode(palFrame));

        colors.forEach((c, idx) => {
          const swatch = makeRectangle({
            id: nanoid(),
            name: c.name,
            x: frameX + 24 + idx * 96,
            y: frameY + 24,
            width: 80,
            height: 60,
            cornerRadius: 10,
            fill: { type: "solid", color: c.hex, opacity: 1 },
            stroke: { color: "#333333", width: 1, opacity: 1, style: "solid" },
            parentId: palFrame.id,
          });
          executeCommand(new AddNode(swatch));

          const label = makeText({
            id: nanoid(),
            name: `${c.name} Label`,
            x: frameX + 24 + idx * 96,
            y: frameY + 92,
            width: 80,
            height: 20,
            content: c.hex,
            fontSize: 11,
            color: "#888888",
            textAlign: "center",
            parentId: palFrame.id,
          });
          executeCommand(new AddNode(label));
        });

        setSelectedIds([palFrame.id]);
        setAiMessages((prev) => [
          ...prev,
          { sender: "ai", text: "Generated a 5-color palette artboard on the canvas." },
        ]);
        showToast("Palette generated");
      } else if (lower.includes("design") || lower.includes("layout") || lower.includes("make a design")) {
        // Generate Hero Artboard Layout
        const artboard = makeFrame({
          id: nanoid(),
          name: "Hero Section",
          x: -200,
          y: -150,
          width: 480,
          height: 320,
          cornerRadius: 16,
          fill: { type: "solid", color: "#0D0D0D", opacity: 1 },
          stroke: { color: "#222222", width: 1, opacity: 1, style: "solid" },
        });
        executeCommand(new AddNode(artboard));

        const headline = makeText({
          id: nanoid(),
          name: "Headline",
          x: -160,
          y: -100,
          width: 400,
          height: 48,
          content: "Craft with Precision",
          fontSize: 28,
          fontWeight: 700,
          color: "#FFFFFF",
          parentId: artboard.id,
        });
        executeCommand(new AddNode(headline));

        const subhead = makeText({
          id: nanoid(),
          name: "Subhead",
          x: -160,
          y: -44,
          width: 400,
          height: 36,
          content: "A minimal, lightning-fast design studio for modern product teams.",
          fontSize: 14,
          fontWeight: 400,
          color: "#888888",
          parentId: artboard.id,
        });
        executeCommand(new AddNode(subhead));

        const btn = makeRectangle({
          id: nanoid(),
          name: "CTA Button",
          x: -160,
          y: 20,
          width: 140,
          height: 44,
          cornerRadius: 22,
          fill: { type: "solid", color: "#2E5CFF", opacity: 1 },
          stroke: { color: "#2E5CFF", width: 0, opacity: 1, style: "solid" },
          parentId: artboard.id,
        });
        executeCommand(new AddNode(btn));

        const btnLabel = makeText({
          id: nanoid(),
          name: "CTA Label",
          x: -160,
          y: 32,
          width: 140,
          height: 20,
          content: "Get Started →",
          fontSize: 13,
          fontWeight: 600,
          color: "#FFFFFF",
          textAlign: "center",
          parentId: artboard.id,
        });
        executeCommand(new AddNode(btnLabel));

        setSelectedIds([artboard.id]);
        setAiMessages((prev) => [
          ...prev,
          { sender: "ai", text: "Created a hero section layout frame with headline and button." },
        ]);
        showToast("Design generated");
      } else if (lower.includes("rename")) {
        // Rename frames to clean names
        const frames = document.nodes.filter((n) => n.type === "frame");
        frames.forEach((f, idx) => {
          executeCommand(new UpdateProps(f.id, f, { name: `Artboard ${idx + 1}` }));
        });
        setAiMessages((prev) => [
          ...prev,
          { sender: "ai", text: `Renamed ${frames.length} frames to structured artboard names.` },
        ]);
        showToast("Frames renamed");
      } else if (lower.includes("rewrite") || lower.includes("shorten")) {
        // Rewrite text nodes
        const selectedText = document.nodes.filter(
          (n): n is TextNode => selectedIds.has(n.id) && n.type === "text"
        );
        if (selectedText.length > 0) {
          selectedText.forEach((t) => {
            const rewritten = lower.includes("shorten")
              ? t.content.slice(0, 30) + "…"
              : "Design Without Friction";
            executeCommand(new UpdateProps(t.id, t, { content: rewritten }));
          });
          setAiMessages((prev) => [
            ...prev,
            { sender: "ai", text: `Updated copy on ${selectedText.length} text layer(s).` },
          ]);
        } else {
          setAiMessages((prev) => [
            ...prev,
            { sender: "ai", text: "Select a text layer first to rewrite or shorten it." },
          ]);
        }
      } else if (lower.includes("translate")) {
        const selectedText = document.nodes.filter(
          (n) => selectedIds.has(n.id) && n.type === "text"
        );
        if (selectedText.length > 0) {
          selectedText.forEach((t) => {
            executeCommand(
              new UpdateProps(t.id, t, { content: "Concevoir sans friction" })
            );
          });
          setAiMessages((prev) => [
            ...prev,
            { sender: "ai", text: "Translated selected text to French." },
          ]);
        } else {
          setAiMessages((prev) => [
            ...prev,
            { sender: "ai", text: "Select a text layer first to translate it." },
          ]);
        }
      } else {
        setAiMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: `Processed: "${q}". You can ask me to "Make a design", "Color palette", "Rename frames", or select text to "Rewrite".`,
          },
        ]);
      }

      setIsAiBusy(false);
    }, 450);
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
        className="fixed left-[21px] top-[76px] z-20 bg-[#111111] border border-[#222222] rounded-full p-2.5 text-[#A0A0A0] hover:text-white transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.6)] cursor-pointer"
        title="Open Layers & Sidebar (⌥L)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      </button>
    );
  }

  // ── Hierarchy Organization (Figma Frame Container Model) ───────────────────
  // A node is a child if its parentId is a frame ID, or if it is geometrically inside a frame
  const getChildNodesForFrame = (frame: CanvasNode) => {
    return document.nodes.filter((n) => {
      if (n.id === frame.id) return false;
      if (n.parentId === frame.id) return true;
      if (!n.parentId) {
        // Fallback geometric containment
        return (
          n.x >= frame.x &&
          n.y >= frame.y &&
          n.x + n.width <= frame.x + frame.width &&
          n.y + n.height <= frame.y + frame.height
        );
      }
      return false;
    });
  };

  // Top-level nodes (frames or standalone nodes not inside any frame)
  const allChildNodeIds = new Set<string>();
  document.nodes.filter((n) => n.type === "frame").forEach((frame) => {
    getChildNodesForFrame(frame).forEach((child) => allChildNodeIds.add(child.id));
  });

  const topLevelNodes = [...document.nodes]
    .filter((n) => !allChildNodeIds.has(n.id))
    .reverse();

  // Helper to render an individual layer row
  const renderLayerRow = (
    node: CanvasNode,
    isIndented = false,
    isTop = false,
    isBottom = false
  ) => {
    const isSelected = selectedIds.has(node.id);
    const isEditing = editingNodeId === node.id;
    const isFrame = node.type === "frame";
    const isCollapsed = collapsedFrames.has(node.id);

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
          isIndented ? "ml-4 pl-2 border-l border-[#222222]" : ""
        } ${
          isSelected
            ? "bg-[#2A2A2A] text-white"
            : "hover:bg-[#181818] text-[#A0A0A0]"
        }`}
      >
        {/* Active selection accent line */}
        {isSelected && (
          <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#2E5CFF] rounded-r" />
        )}

        {/* Left: Collapse chevron (if frame), Icon & Name */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2 pl-0.5">
          {isFrame && (
            <button
              type="button"
              onClick={(e) => toggleFrameCollapse(node.id, e)}
              className="text-[#666666] hover:text-white p-0.5 -ml-1 transition-transform"
              title={isCollapsed ? "Expand frame" : "Collapse frame"}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={`transition-transform duration-150 ${
                  isCollapsed ? "-rotate-90" : "rotate-0"
                }`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          )}

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

        {/* Right: Layer action buttons */}
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
  };

  const currentPage = pages.find((p) => p.id === currentPageId) || pages[0];

  return (
    <div className="fixed left-[21px] top-[76px] w-[260px] max-h-[calc(100vh-160px)] z-20 bg-[#111111] border border-[#222222] rounded-[20px] p-3 shadow-[0_20px_40px_rgba(0,0,0,0.6)] flex flex-col text-xs text-[#A0A0A0] select-none">
      {/* Top Segmented Navigation Tabs: [Layers | Pages | AI] with icons */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-1 bg-[#161616] p-0.5 rounded-full border border-[#222222]">
          <button
            type="button"
            onClick={() => setLayersPanelTab("layers")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
              layersPanelTab === "layers"
                ? "bg-[#2A2A2A] text-white shadow"
                : "text-[#888888] hover:text-white"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <span>Layers</span>
          </button>
          <button
            type="button"
            onClick={() => setLayersPanelTab("pages")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
              layersPanelTab === "pages"
                ? "bg-[#2A2A2A] text-white shadow"
                : "text-[#888888] hover:text-white"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>Pages</span>
          </button>
          <button
            type="button"
            onClick={() => setLayersPanelTab("ai")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
              layersPanelTab === "ai"
                ? "bg-[#2E5CFF] text-white shadow"
                : "text-[#888888] hover:text-white"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
              <path d="M19 16v4M17 18h4" />
            </svg>
            <span>AI</span>
          </button>
        </div>

        <button
          type="button"
          onClick={toggleLayersPanel}
          className="text-[#666666] hover:text-white transition-colors p-1 rounded-md"
          title="Collapse Sidebar (⌥L)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* ── TAB 1: LAYERS (With Frame Container Hierarchy) ───────────────────── */}
      {layersPanelTab === "layers" && (
        <>
          {/* Quick Page Picker header inside Layers tab */}
          <div className="flex items-center justify-between px-2 py-1 mb-1.5 bg-[#161616] rounded-lg border border-[#222222]">
            <button
              type="button"
              onClick={() => setLayersPanelTab("pages")}
              className="flex items-center gap-1.5 text-[11px] text-[#A0A0A0] hover:text-white transition-colors cursor-pointer truncate"
              title="Click to view all pages"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="font-medium text-white truncate">{currentPage?.name || "Page 1"}</span>
              <span className="text-[#666666] text-[10px]">▼</span>
            </button>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#222222] text-[#888888]">
              {document.nodes.length}
            </span>
          </div>

          {/* Hierarchical Layers List */}
          <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5">
            {topLevelNodes.length === 0 ? (
              <div className="py-8 text-center text-[#555555] text-[11px]">
                No layers yet
                <div className="mt-1 text-[#444444]">Draw shapes with R, O, F, or T</div>
              </div>
            ) : (
              topLevelNodes.map((node, reverseIdx) => {
                const isFrame = node.type === "frame";
                const isTop = reverseIdx === 0;
                const isBottom = reverseIdx === topLevelNodes.length - 1;

                if (!isFrame) {
                  return renderLayerRow(node, false, isTop, isBottom);
                }

                // Render Frame with its nested children
                const children = getChildNodesForFrame(node).reverse();
                const isCollapsed = collapsedFrames.has(node.id);

                return (
                  <div key={node.id} className="space-y-0.5">
                    {renderLayerRow(node, false, isTop, isBottom)}
                    {!isCollapsed &&
                      children.map((child, cIdx) =>
                        renderLayerRow(
                          child,
                          true,
                          cIdx === 0,
                          cIdx === children.length - 1
                        )
                      )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ── TAB 2: PAGES ────────────────────────────────────────────────────── */}
      {layersPanelTab === "pages" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1A1A1A]">
            <span className="text-[11px] font-semibold text-[#666666] uppercase tracking-wider">
              Project Pages
            </span>
            <button
              type="button"
              onClick={() => addPage()}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[#A0A0A0] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
              title="Add a new page"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
            {pages.map((p) => {
              const isCurrent = p.id === currentPageId;
              const isEditing = editingPageId === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => setCurrentPageId(p.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingPageId(p.id);
                    setEditingPageName(p.name);
                  }}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                    isCurrent
                      ? "bg-[#1F1F1F] text-white border border-[#2E5CFF]/30"
                      : "hover:bg-[#161616] text-[#A0A0A0]"
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isCurrent ? "bg-[#2E5CFF]" : "bg-[#333333]"
                      }`}
                    />
                    {isEditing ? (
                      <input
                        ref={pageInputRef}
                        type="text"
                        value={editingPageName}
                        onChange={(e) => setEditingPageName(e.target.value)}
                        onBlur={() => {
                          renamePage(p.id, editingPageName);
                          setEditingPageId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            renamePage(p.id, editingPageName);
                            setEditingPageId(null);
                          }
                          if (e.key === "Escape") setEditingPageId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#111111] text-white text-[12px] px-1 py-0.5 rounded border border-[#2E5CFF] outline-none flex-1 min-w-0"
                      />
                    ) : (
                      <span className="truncate text-[12px] font-medium" title="Double-click to rename">
                        {p.name}
                      </span>
                    )}
                  </div>

                  {pages.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePage(p.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#666666] hover:text-[#E05252] transition-opacity"
                      title="Delete page"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 3: AI ASSISTANT ──────────────────────────────────────────────── */}
      {layersPanelTab === "ai" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages log */}
          <div
            ref={aiLogRef}
            className="flex-1 overflow-y-auto space-y-2 pr-1 text-[11px] mb-2"
          >
            {aiMessages.map((msg, idx) => (
              <div
                key={`ai-msg-${idx}`}
                className={`p-2 rounded-xl leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-[#2E5CFF]/15 text-white ml-4 border border-[#2E5CFF]/30"
                    : "bg-[#181818] text-[#CCCCCC] mr-2 border border-[#222222]"
                }`}
              >
                {msg.text}
              </div>
            ))}
            {isAiBusy && (
              <div className="p-2 rounded-xl bg-[#181818] text-[#888888] italic text-[11px] animate-pulse">
                Thinking…
              </div>
            )}
          </div>

          {/* Quick Action Chips */}
          <div className="flex flex-wrap gap-1 mb-2 pt-1 border-t border-[#1A1A1A]">
            {[
              "Make a design",
              "Color palette",
              "Rewrite",
              "Shorten",
              "Translate",
              "Rename frames",
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => runAiPrompt(chip)}
                className="text-[10px] bg-[#161616] hover:bg-[#222222] text-[#A0A0A0] hover:text-white px-2 py-1 rounded-full border border-[#262626] transition-colors cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Prompt Input Box */}
          <div className="flex items-center gap-1.5 bg-[#161616] p-1.5 rounded-xl border border-[#262626]">
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  runAiPrompt(aiInput);
                  setAiInput("");
                }
              }}
              placeholder="Ask AI to design, rewrite…"
              className="flex-1 bg-transparent text-white text-[11px] outline-none px-1"
            />
            <button
              type="button"
              onClick={() => {
                runAiPrompt(aiInput);
                setAiInput("");
              }}
              className="bg-[#2E5CFF] hover:bg-[#3E6CFF] text-white p-1 rounded-lg transition-colors cursor-pointer"
              title="Send to AI"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
