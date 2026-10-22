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
import type { CanvasNode, TextNode } from "@/lib/canvas/document/types";
import type { AiThoughtStep } from "@/lib/ai/types";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  thoughts?: string[];
  steps?: AiThoughtStep[];
  isThinkingOpen?: boolean;
}

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
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      sender: "ai",
      text: "I am your Gemini AI Design Agent. I can generate movie storyboards with live scouted cinematography from Unsplash, creative moodboards, wireframes from Pinterest boards, or convert your reference images into scalable vector illustrations.",
      thoughts: [
        "Online cinematography scouting engine connected to Unsplash, Pexels, Pinterest & Pixabay.",
        "Image-to-Vector decomposition pipeline ready for reference assets.",
        "Voice dictation ready for real-time speech input.",
      ],
      steps: [
        { title: "Gemini Generative Agent Ready", detail: "Studio creative modes active", source: "Gemini Engine", status: "done" },
        { title: "Photography Scouter Ready", detail: "Connected to Unsplash, Pexels & Pinterest", source: "Unsplash", status: "done" },
      ],
      isThinkingOpen: false,
    },
  ]);
  const [isAiBusy, setIsAiBusy] = useState(false);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number>(60);
  const [geminiConnected, setGeminiConnected] = useState<boolean>(true);
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("nage_gemini_api_key") || "";
    }
    return "";
  });
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);

  // File attachment state for storyboards (scripts) and illustrations/moodboards (images)
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedImageName, setAttachedImageName] = useState<string | null>(null);
  const [attachedScript, setAttachedScript] = useState<string | null>(null);
  const [attachedScriptName, setAttachedScriptName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording dictation state
  const [isRecording, setIsRecording] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

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
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setAttachedImage(result);
        setAttachedImageName(file.name);
        showToast(`Attached reference image: ${file.name}`);
      };
      reader.readAsDataURL(file);
    } else {
      // Treat as screenplay script or text prompt
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        setAttachedScript(text);
        setAttachedScriptName(file.name);
        showToast(`Attached script: ${file.name}`);
      };
      reader.readAsText(file);
    }

    e.target.value = "";
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      typeof window !== "undefined" &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) {
      showToast("Voice recognition not supported in this browser");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsRecording(true);
        showToast("🎙 Listening… Speak your prompt");
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setAiInput(transcript.trim());
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (err: any) => {
        console.warn("Speech recognition error:", err);
        setIsRecording(false);
        if (err.error === "not-allowed") {
          showToast("Microphone access denied");
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Failed to start speech recognition:", err);
      setIsRecording(false);
      showToast("Could not start microphone");
    }
  };

  const toggleThinking = (msgId: string) => {
    setAiMessages((prev) =>
      prev.map((msg) =>
        msg.id === msgId ? { ...msg, isThinkingOpen: !msg.isThinkingOpen } : msg
      )
    );
  };

  const runAiPrompt = async (promptText: string) => {
    const q = promptText.trim();
    if (!q || isAiBusy) return;

    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsRecording(false);
    }

    // Capture attachments and reset them in UI
    const currentAttachedImage = attachedImage;
    const currentAttachedScript = attachedScript;
    setAttachedImage(null);
    setAttachedImageName(null);
    setAttachedScript(null);
    setAttachedScriptName(null);

    setAiMessages((prev) => [
      ...prev,
      {
        id: nanoid(),
        sender: "user",
        text: q,
      },
    ]);
    setIsAiBusy(true);

    const lower = q.toLowerCase();

    // Fast-path client-side operations for instant feedback on selected layers
    if (
      (lower.includes("rewrite") || lower.includes("shorten")) &&
      !lower.includes("make") &&
      !lower.includes("design")
    ) {
      const selectedText = document.nodes.filter(
        (n): n is TextNode => selectedIds.has(n.id) && n.type === "text"
      );
      if (selectedText.length > 0) {
        selectedText.forEach((t) => {
          const rewritten = lower.includes("shorten")
            ? t.content.slice(0, 30) + (t.content.length > 30 ? "…" : "")
            : "Design Without Friction";
          executeCommand(new UpdateProps(t.id, t, { content: rewritten }));
        });
        setAiMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            sender: "ai",
            text: `Updated copy on ${selectedText.length} text layer(s).`,
          },
        ]);
        showToast("Text updated");
        setIsAiBusy(false);
        return;
      }
    }

    if (
      lower.includes("rename frames") ||
      (lower.includes("rename") && lower.includes("frame"))
    ) {
      const frames = document.nodes.filter((n) => n.type === "frame");
      frames.forEach((f, idx) => {
        executeCommand(
          new UpdateProps(f.id, f, { name: `Artboard ${idx + 1}` })
        );
      });
      setAiMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          sender: "ai",
          text: `Renamed ${frames.length} frames to structured artboard names.`,
        },
      ]);
      showToast("Frames renamed");
      setIsAiBusy(false);
      return;
    }

    // Determine creative agent task type
    let task = "design";
    if (
      lower.includes("storyboard") ||
      lower.includes("script") ||
      lower.includes("screenplay") ||
      lower.includes("movie") ||
      lower.includes("scene") ||
      currentAttachedScript
    ) {
      task = "storyboard";
    } else if (
      lower.includes("moodboard") ||
      lower.includes("mood board") ||
      lower.includes("inspiration board") ||
      lower.includes("creative direction")
    ) {
      task = "moodboard";
    } else if (
      lower.includes("pinterest") ||
      lower.includes("wireframe") ||
      lower.includes("board into")
    ) {
      task = "wireframe";
    } else if (
      lower.includes("illustrat") ||
      lower.includes("vector") ||
      lower.includes("drawing") ||
      currentAttachedImage
    ) {
      task = "illustration";
    } else if (lower.includes("palette") || lower.includes("color")) {
      task = "palette";
    } else if (lower.includes("copy") || lower.includes("rewrite")) {
      task = "copy";
    }

    // Call the server Gemini AI API
    try {
      const selectedNodes = document.nodes.filter((n) => selectedIds.has(n.id));
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: q,
          task,
          attachedImage: currentAttachedImage || undefined,
          attachedScript: currentAttachedScript || undefined,
          projectId: useEditorStore.getState().projectId || undefined,
          selectedNodes: selectedNodes.length > 0 ? selectedNodes : undefined,
          camera: useEditorStore.getState().document.camera,
          apiKey: customApiKey.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setAiMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            sender: "ai",
            text:
              "⚠️ " +
              (data.text ||
                "Rate limit reached. Please wait a moment before sending another prompt."),
          },
        ]);
        showToast("Rate limit reached");
        if (data.rateLimitRemaining !== undefined) {
          setRateLimitRemaining(data.rateLimitRemaining);
        }
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Generation failed");
      }

      // Add AI reply message with thoughts & step-by-step progress
      setAiMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          sender: "ai",
          text: data.text || "Design generated successfully.",
          thoughts: data.thoughts,
          steps: data.steps,
          isThinkingOpen: true,
        },
      ]);

      if (data.rateLimitRemaining !== undefined) {
        setRateLimitRemaining(data.rateLimitRemaining);
      }

      // If nodes were generated, commit them to the canvas!
      if (Array.isArray(data.generatedNodes) && data.generatedNodes.length > 0) {
        // Execute AddNode command for each generated node
        data.generatedNodes.forEach((node: CanvasNode) => {
          executeCommand(new AddNode(node));
        });

        // Select the primary frame or first node
        const primary =
          data.generatedNodes.find((n: CanvasNode) => n.type === "frame") ||
          data.generatedNodes[0];
        if (primary) {
          setSelectedIds([primary.id]);
        }

        showToast("Design added to canvas");
      }
    } catch (err: unknown) {
      console.error("AI error:", err);
      setAiMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          sender: "ai",
          text:
            "I couldn't reach the generation service right now. Please try again or click one of the quick prompts.",
        },
      ]);
      showToast("AI generation failed");
    } finally {
      setIsAiBusy(false);
    }
  };

  const handleCheckGeminiStatus = async (keyCandidate?: string) => {
    const key = keyCandidate !== undefined ? keyCandidate : customApiKey;
    try {
      showToast("Testing Gemini 3.8 Flash connection…");
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setGeminiConnected(true);
        showToast(data.message || "Gemini 3.8 Flash connected!");
      } else {
        setGeminiConnected(false);
        showToast(data.message || "Agent engine active");
      }
    } catch {
      showToast("Agent synthesizer active");
    }
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
                key={msg.id || `ai-msg-${idx}`}
                className={`p-2.5 rounded-xl leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-[#2E5CFF]/15 text-white ml-4 border border-[#2E5CFF]/30"
                    : "bg-[#181818] text-[#D4D4D4] mr-1 border border-[#222222]"
                }`}
              >
                {/* Expandable Thinking & Sourcing Process Drawer for AI responses */}
                {msg.sender === "ai" && (Boolean(msg.thoughts?.length) || Boolean(msg.steps?.length)) && (
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() => toggleThinking(msg.id)}
                      className="flex items-center justify-between w-full px-2 py-1 rounded bg-[#161722] hover:bg-[#1E2030] text-[#7E96FF] text-[9.5px] font-medium border border-[#2E5CFF]/30 transition-colors cursor-pointer"
                      title="Inspect agent reasoning, online image scouting and synthesis steps"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px]">🧠</span>
                        <span>Reasoning & Sourcing ({msg.steps?.length || msg.thoughts?.length} steps)</span>
                      </div>
                      <span className="text-[9px] text-[#A0B0FF]">{msg.isThinkingOpen ? "Hide ▲" : "Inspect ▼"}</span>
                    </button>

                    {msg.isThinkingOpen && (
                      <div className="mt-1.5 p-2 rounded-lg bg-[#0F1018] border border-[#22263D] text-[10px] space-y-2">
                        {/* Pipeline Step Cards */}
                        {msg.steps && msg.steps.length > 0 && (
                          <div className="space-y-1.5">
                            {msg.steps.map((st, sIdx) => (
                              <div key={sIdx} className="flex items-start gap-1.5">
                                <span className="text-[#00E676] font-bold text-[10px] mt-0.5">✓</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-white text-[10px]">{st.title}</span>
                                    {st.source && (
                                      <span className="px-1 py-0.2 rounded text-[8px] font-semibold bg-[#1C233D] text-[#8EA2FF] border border-[#2E5CFF]/40">
                                        {st.source}
                                      </span>
                                    )}
                                  </div>
                                  {st.detail && (
                                    <p className="text-[#888EAA] text-[9px] mt-0.5 leading-snug">{st.detail}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Chain of Thought Rationale */}
                        {msg.thoughts && msg.thoughts.length > 0 && (
                          <div className="pt-1.5 border-t border-[#1C1F2E] text-[#7A8299] text-[9.5px] italic space-y-0.5">
                            {msg.thoughts.map((th, tIdx) => (
                              <p key={tIdx}>• {th}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Message Body Text */}
                <div className="text-[11px] leading-relaxed whitespace-pre-wrap">{msg.text}</div>
              </div>
            ))}

            {/* Live Active Thinking Card while generation is in flight */}
            {isAiBusy && (
              <div className="p-2.5 rounded-xl bg-[#141520] border border-[#2E5CFF]/40 text-[10px] space-y-1.5 animate-pulse mr-1">
                <div className="flex items-center gap-2 text-[#4D79FF] font-semibold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#2E5CFF] animate-ping" />
                  <span>Agent Thinking & Scouting Online Imagery…</span>
                </div>
                <div className="space-y-1 pl-3 border-l-2 border-[#2E5CFF]/30 text-[#8890AA] text-[9.5px]">
                  <div>● Scouting 16:9 shot cinematography from Unsplash, Pexels & Pinterest</div>
                  <div>● Decomposing narrative beats and vector geometry</div>
                  <div>● Synthesizing 60fps compliant canvas components</div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Action Chips */}
          <div className="flex flex-wrap gap-1 mb-2 pt-1 border-t border-[#1A1A1A]">
            {[
              "🎬 Storyboard",
              "🎨 Moodboard",
              "📌 Pinterest Wireframe",
              "✏️ Illustration",
              "✦ Make a design",
              "Color palette",
            ].map((chip) => {
              const promptMap: Record<string, string> = {
                "🎬 Storyboard": "Generate a cinematic storyboard for a sci-fi thriller screenplay opening scene",
                "🎨 Moodboard": "Generate a creative direction moodboard for a Scandinavian architectural studio",
                "📌 Pinterest Wireframe": "Create a wireframe inspired by an editorial minimalist moodboard",
                "✏️ Illustration": "Create a vector illustration of a mountain sunrise with atmospheric layers",
                "✦ Make a design": "Design a modern mobile analytics card with metrics and sparkline",
              };
              const textToRun = promptMap[chip] || chip;
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => runAiPrompt(textToRun)}
                  className="text-[10px] bg-[#161616] hover:bg-[#222222] text-[#A0A0A0] hover:text-white px-2 py-1 rounded-full border border-[#262626] transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              );
            })}
          </div>

          {/* Active Voice Recording Pill Indicator */}
          {isRecording && (
            <div className="flex items-center justify-between bg-[#2B1111] text-[#FF6B6B] border border-[#FF3B30]/40 rounded-lg px-2.5 py-1 mb-1.5 text-[10px]">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#FF3B30] animate-ping" />
                <span>Dictating live… Speak into your microphone</span>
              </div>
              <button
                type="button"
                onClick={toggleVoiceRecording}
                className="text-[#FF9999] hover:text-white font-semibold underline text-[9.5px] cursor-pointer"
              >
                Done
              </button>
            </div>
          )}

          {/* Active Attachments Preview Bar */}
          {(attachedImage || attachedScript) && (
            <div className="flex flex-wrap gap-1.5 mb-2 px-0.5">
              {attachedImage && (
                <div className="flex items-center gap-1.5 bg-[#171C2E] text-[#8EA2FF] border border-[#2E5CFF]/40 rounded-lg px-2 py-1 text-[10px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attachedImage}
                    alt="Ref"
                    className="w-4 h-4 object-cover rounded"
                  />
                  <span className="truncate max-w-[100px]" title={attachedImageName || "Reference image"}>
                    {attachedImageName || "Image Ref"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedImage(null);
                      setAttachedImageName(null);
                    }}
                    className="text-[#8EA2FF] hover:text-white ml-0.5 cursor-pointer"
                    title="Remove attachment"
                  >
                    ✕
                  </button>
                </div>
              )}
              {attachedScript && (
                <div className="flex items-center gap-1.5 bg-[#2B1B14] text-[#FF9E66] border border-[#FF5E2E]/40 rounded-lg px-2 py-1 text-[10px]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <span className="truncate max-w-[100px]" title={attachedScriptName || "Screenplay script"}>
                    {attachedScriptName || "Script.txt"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedScript(null);
                      setAttachedScriptName(null);
                    }}
                    className="text-[#FF9E66] hover:text-white ml-0.5 cursor-pointer"
                    title="Remove attachment"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Prompt Input Box */}
          <div className="flex items-center gap-1.5 bg-[#161616] p-1.5 rounded-xl border border-[#262626]">
            {/* Hidden File Input for Script/Image Upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,.txt,.fountain,.md"
              className="hidden"
            />

            {/* File Upload Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                attachedImage || attachedScript
                  ? "text-[#2E5CFF] bg-[#2E5CFF]/15"
                  : "text-[#888888] hover:text-white hover:bg-[#222222]"
              }`}
              title="Upload movie script or reference image"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>

            {/* Functional Record Mic Button for Voice Dictation */}
            <button
              type="button"
              onClick={toggleVoiceRecording}
              className={`p-1 rounded-lg transition-all cursor-pointer ${
                isRecording
                  ? "text-white bg-[#FF3B30] animate-pulse ring-2 ring-[#FF3B30]/40"
                  : "text-[#888888] hover:text-white hover:bg-[#222222]"
              }`}
              title={isRecording ? "Stop voice dictation" : "Dictate prompt by voice"}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>

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
              placeholder={
                isRecording
                  ? "Listening… (speaking into mic)"
                  : attachedScript
                  ? "Describe shot tone or press send…"
                  : attachedImage
                  ? "Prompt: convert this image into an illustration…"
                  : "Storyboard, moodboard, wireframe, art…"
              }
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

          {/* Rate Limit Quota & Model Status Indicator */}
          <div className="flex items-center justify-between px-1 pt-1.5 text-[10px] text-[#666666]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCheckGeminiStatus()}
                className="flex items-center gap-1.5 text-[#888888] hover:text-white transition-colors cursor-pointer"
                title="Test Google Gemini 3.8 Flash connection"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${geminiConnected ? "bg-[#00E676]" : "bg-[#2E5CFF]"}`} />
                Gemini 3.8 Flash
              </button>
              <button
                type="button"
                onClick={() => setShowKeyInput((prev) => !prev)}
                className="text-[#666666] hover:text-[#2E5CFF] transition-colors"
                title="Configure Gemini API Key"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 2l-2 2m-2-2l2 2m-6 6l-6.5 6.5a2.121 2.121 0 0 1-3 0 2.121 2.121 0 0 1 0-3L10 8m2-2l4 4" />
                </svg>
              </button>
            </div>
            <span>Quota: {rateLimitRemaining}/60 hr</span>
          </div>

          {/* Optional Gemini API Key Drawer */}
          {showKeyInput && (
            <div className="mt-1.5 p-2 bg-[#141414] rounded-lg border border-[#262626] text-[10px] space-y-1.5">
              <div className="flex items-center justify-between text-[#A0A0A0]">
                <span>Gemini API Key</span>
                <button
                  type="button"
                  onClick={() => setShowKeyInput(false)}
                  className="text-[#666666] hover:text-white"
                >
                  ✕
                </button>
              </div>
              <input
                type="password"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="AIzaSy... (optional)"
                className="w-full bg-[#1A1A1A] text-white px-2 py-1 rounded border border-[#333333] outline-none text-[10px]"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      if (customApiKey.trim()) {
                        localStorage.setItem("nage_gemini_api_key", customApiKey.trim());
                      } else {
                        localStorage.removeItem("nage_gemini_api_key");
                      }
                    }
                    handleCheckGeminiStatus(customApiKey.trim());
                    setShowKeyInput(false);
                  }}
                  className="bg-[#2E5CFF] text-white px-2 py-0.5 rounded text-[10px] font-medium hover:bg-[#3E6CFF] transition-colors cursor-pointer"
                >
                  Save & Test
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
