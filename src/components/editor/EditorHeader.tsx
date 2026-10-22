"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useEditorStore } from "@/lib/canvas/store/editorStore";
import { renameProjectAction } from "@/lib/supabase/projects";
import { exportToPng, exportToSvg, exportToJson, downloadFile } from "@/lib/canvas/export";

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

  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"png" | "svg" | "json">("png");
  const [exportScale, setExportScale] = useState<1 | 2 | 3>(2);
  const [includeBackground, setIncludeBackground] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    if (!exportOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [exportOpen]);

  const handlePerformExport = async () => {
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
      const bgColor = includeBackground ? "#000000" : null;

      if (exportFormat === "png") {
        const blob = await exportToPng(nodesToExport, exportScale, bgColor);
        downloadFile(blob, `${cleanName}@${exportScale}x.png`, "image/png");
        showToast(`Exported ${cleanName}@${exportScale}x.png`);
      } else if (exportFormat === "svg") {
        const svgStr = exportToSvg(nodesToExport, bgColor);
        downloadFile(svgStr, `${cleanName}.svg`, "image/svg+xml");
        showToast(`Exported ${cleanName}.svg`);
      } else if (exportFormat === "json") {
        const jsonStr = exportToJson(nodesToExport, cleanName);
        downloadFile(jsonStr, `${cleanName}.json`, "application/json");
        showToast(`Exported ${cleanName}.json`);
      }

      setExportOpen(false);
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
        {/* Export Button with Dropdown Beside It */}
        <div className="relative flex items-center" ref={exportMenuRef}>
          <div
            className={`bg-[#111111] hover:bg-[#1A1A1A] border ${
              exportOpen ? "border-[#2E5CFF]" : "border-[#1f1f1f]"
            } rounded-full flex items-center transition-colors`}
          >
            {/* Export Button */}
            <button
              id="btn-quick-export"
              type="button"
              onClick={() => setExportOpen((prev) => !prev)}
              className="pl-3.5 pr-1.5 py-2 flex items-center gap-1.5 text-white text-[13px] hover:text-white cursor-pointer select-none"
              title="Export"
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
              <span>Export</span>
            </button>

            {/* Separator */}
            <div className="w-[1px] h-3.5 bg-[#252525]" />

            {/* Dropdown Chevron Button Beside Export Button */}
            <button
              id="btn-export-dropdown"
              type="button"
              onClick={() => setExportOpen((prev) => !prev)}
              className={`pl-1.5 pr-3 py-2 flex items-center justify-center text-[#888888] hover:text-white cursor-pointer transition-colors ${
                exportOpen ? "text-white" : ""
              }`}
              title="Export options"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${exportOpen ? "rotate-180 text-white" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {/* Export Dropdown Menu Panel */}
          {exportOpen && (
            <div
              className="absolute right-0 top-[calc(100%+8px)] w-[270px] bg-[#111111] border border-[#222222] rounded-2xl p-4 shadow-2xl z-50 text-xs select-none"
              style={{ boxShadow: "0 20px 40px rgba(0, 0, 0, 0.7)" }}
            >
              {/* Dropdown Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1A1A1A]">
                <div className="text-white font-medium text-[13px]">Export</div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1A1A1A] text-[#888888] border border-[#262626]">
                  {useEditorStore.getState().selectedIds.size > 0
                    ? `${useEditorStore.getState().selectedIds.size} selected`
                    : "Canvas"}
                </span>
              </div>

              {/* Format Tabs */}
              <div className="mb-3">
                <div className="text-[#888888] text-[11px] font-medium mb-1.5">Format</div>
                <div className="flex bg-[#161616] rounded-lg p-0.5 border border-[#222222]">
                  {(["png", "svg", "json"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setExportFormat(fmt)}
                      className={`flex-1 py-1 text-[11px] font-medium rounded-md uppercase transition-colors cursor-pointer ${
                        exportFormat === fmt ? "bg-[#2A2A2A] text-white" : "text-[#777777] hover:text-white"
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution Scale (for PNG) */}
              {exportFormat === "png" && (
                <div className="mb-3">
                  <div className="text-[#888888] text-[11px] font-medium mb-1.5">Resolution</div>
                  <div className="flex bg-[#161616] rounded-lg p-0.5 border border-[#222222]">
                    {([1, 2, 3] as const).map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setExportScale(sc)}
                        className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                          exportScale === sc ? "bg-[#2A2A2A] text-white" : "text-[#777777] hover:text-white"
                        }`}
                      >
                        {sc}x
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Background Checkbox */}
              {exportFormat !== "json" && (
                <label className="flex items-center gap-2 mb-4 text-[#888888] hover:text-white cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={includeBackground}
                    onChange={(e) => setIncludeBackground(e.target.checked)}
                    className="rounded border-[#333333] bg-[#161616] text-[#2E5CFF] accent-[#2E5CFF] cursor-pointer"
                  />
                  Include dark background (#000000)
                </label>
              )}

              {/* Action Button */}
              <button
                type="button"
                disabled={isExporting}
                onClick={handlePerformExport}
                className="w-full h-8 rounded-lg bg-[#2E5CFF] hover:bg-[#254ED9] text-white font-medium text-[12px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-md"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {isExporting
                  ? "Exporting…"
                  : useEditorStore.getState().selectedIds.size > 0
                  ? `Export Selection (${exportFormat.toUpperCase()})`
                  : `Export Canvas (${exportFormat.toUpperCase()})`}
              </button>
            </div>
          )}
        </div>

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
