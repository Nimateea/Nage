"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useEditorStore } from "@/lib/canvas/store/editorStore";
import { renameProjectAction } from "@/lib/supabase/projects";
import { exportToPng, downloadFile } from "@/lib/canvas/export";

interface EditorHeaderProps {
  initialTitle: string;
  projectId: string;
  userEmail?: string;
}

export function EditorHeader({
  initialTitle,
  projectId,
  userEmail,
}: EditorHeaderProps) {
  const [title, setTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const showToast = useEditorStore((state) => state.showToast);
  const setProjectName = useEditorStore((state) => state.setProjectName);
  const saveStatus = useEditorStore((state) => state.saveStatus);
  const lastSavedAt = useEditorStore((state) => state.lastSavedAt);

  const handleTitleSubmit = async () => {
    setIsEditing(false);
    const trimmed = title.trim() || "Untitled";
    setTitle(trimmed);
    setProjectName(trimmed);

    try {
      await renameProjectAction(projectId, trimmed);
    } catch (err) {
      console.error("Failed to rename project:", err);
    }
  };

  const handleShareClick = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast("Link copied to clipboard");
    } else {
      showToast("Failed to copy link");
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleQuickExport = async () => {
    const state = useEditorStore.getState();
    const selectedNodes = state.document.nodes.filter((n) => state.selectedIds.has(n.id));
    const nodesToExport = selectedNodes.length > 0 ? selectedNodes : state.document.nodes;

    if (nodesToExport.length === 0) {
      showToast("Nothing to export");
      return;
    }

    setIsExporting(true);
    try {
      showToast("Generating export…");
      const name = (selectedNodes.length === 1 ? selectedNodes[0].name : state.projectName) || "export";
      const cleanName = name.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
      const blob = await exportToPng(nodesToExport, 2, "#000000");
      downloadFile(blob, `${cleanName}@2x.png`, "image/png");
      showToast(`Exported ${cleanName}@2x.png`);
    } catch (err) {
      console.error("Export error:", err);
      showToast("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : "U";

  return (
    <header className="w-full flex justify-between items-center px-6 py-6 absolute top-0 left-0 z-10 pointer-events-none select-none">
      {/* Left Nav Pill */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-full px-4 py-2 flex items-center gap-3 transition-colors pointer-events-auto cursor-pointer group hover:bg-[#1a1a1a]">
        <Link
          href="/dashboard"
          className="flex items-center text-[#A0A0A0] group-hover:text-white transition-colors"
          title="Back to projects"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>

        {/* Nage Brand */}
        <Link
          href="/dashboard"
          className="text-white text-[20px] tracking-[-0.5px] leading-none"
          style={{ fontFamily: '"Gegola DEMO", sans-serif' }}
        >
          nage
        </Link>

        {/* Project Title + Badge */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                } else if (e.key === "Escape") {
                  setTitle(initialTitle);
                  setIsEditing(false);
                }
              }}
              className="text-white text-[13px] font-medium ml-2 px-1 rounded bg-[#222222] outline-none border border-[#333333] w-32"
              autoFocus
            />
          ) : (
            <span
              onClick={() => {
                setIsEditing(true);
              }}
              className="text-white text-[13px] font-medium ml-2 outline-none cursor-text px-1 rounded hover:bg-[#333333] transition-colors"
              title="Click to rename"
            >
              {title}
            </span>
          )}
          <span className="text-[#555555] text-[13px]">Moodboard</span>

          {/* Cloud Save Icon (just an icon, no text attached) */}
          <div
            className="flex items-center ml-1.5 transition-colors duration-200"
            title={
              saveStatus === "saved"
                ? lastSavedAt
                  ? `Saved to cloud at ${new Date(lastSavedAt).toLocaleTimeString()}`
                  : "All changes saved to cloud"
                : saveStatus === "saving"
                ? "Saving to cloud…"
                : "Unsaved changes"
            }
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-colors duration-300 ${
                saveStatus === "saved"
                  ? "text-[#00E676]" // Active: green
                  : saveStatus === "saving"
                  ? "text-[#00E676] animate-pulse" // Saving: green pulsing
                  : "text-[#666666]" // Not saving: grey
              }`}
            >
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
              {saveStatus === "saved" && (
                <polyline points="9 13 11 15 15 11" strokeWidth="2" />
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* Right Side Buttons */}
      <div className="flex items-center gap-3 pointer-events-auto">
        {/* Quick Export Button */}
        <button
          id="btn-quick-export"
          type="button"
          disabled={isExporting}
          onClick={handleQuickExport}
          className="bg-[#111111] hover:bg-[#1A1A1A] border border-[#1f1f1f] rounded-full px-4 py-2 flex items-center gap-2 text-white text-[13px] transition-colors cursor-pointer disabled:opacity-50"
          title="Quick Export PNG (2x)"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {isExporting ? "Exporting…" : "Export"}
        </button>

        {/* Share Button */}
        <button
          id="btn-share"
          type="button"
          onClick={handleShareClick}
          className="bg-[#111111] hover:bg-[#1A1A1A] border border-[#1f1f1f] rounded-full pl-2 pr-4 py-2 flex items-center gap-2 text-white text-[13px] transition-colors cursor-pointer"
        >
          <div className="w-5 h-5 rounded-full bg-[#1A1A1A] border border-[#222222] text-white text-[11px] font-medium flex items-center justify-center">
            {userInitial}
          </div>
          Share
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    </header>
  );
}
