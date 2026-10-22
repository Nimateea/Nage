"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useEditorStore } from "@/lib/canvas/store/editorStore";
import { renameProjectAction } from "@/lib/supabase/projects";

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
        </div>
      </div>

      {/* Right Side Buttons */}
      <div className="flex items-center gap-4 pointer-events-auto">
        {/* AI Button */}
        <button
          id="btn-ai"
          type="button"
          onClick={() => showToast("AI assistant will be connected in Step 12")}
          className="bg-[#111111] hover:bg-[#1A1A1A] border border-[#1f1f1f] rounded-full px-4 py-2 flex items-center gap-2 text-white text-[13px] transition-colors cursor-pointer"
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
            <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
            <path d="M19 16v4M17 18h4" />
          </svg>
          AI
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
