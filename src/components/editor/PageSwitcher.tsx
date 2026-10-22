"use client";

import React, { useState, useRef, useEffect } from "react";
import { useEditorStore } from "@/lib/canvas/store/editorStore";

export function PageSwitcher() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pages, setPages] = useState<string[]>(["Page 1"]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const showToast = useEditorStore((state) => state.showToast);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleAddPage = () => {
    const nextName = `Page ${pages.length + 1}`;
    setPages([...pages, nextName]);
    setCurrentPageIndex(pages.length);
    setMenuOpen(false);
    showToast(`Created ${nextName}`);
  };

  return (
    <div className="fixed left-11 bottom-8 z-20 select-none" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="bg-[#111111] hover:bg-[#1a1a1a] border border-[#222222] rounded-full px-4 py-2.5 flex items-center gap-2 text-white text-[13px] font-medium transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] cursor-pointer"
        title="Page Switcher"
      >
        <span className="outline-none whitespace-nowrap">
          {pages[currentPageIndex]}
        </span>
        <svg
          width="12"
          height="12"
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

      {/* Pages Dropdown */}
      {menuOpen && (
        <div className="absolute bottom-12 left-0 w-44 bg-[#111111] border border-[#222222] rounded-[16px] p-1.5 shadow-2xl z-30">
          <div className="px-2 py-1.5 text-[11px] font-semibold text-[#555555] uppercase tracking-wider">
            Pages
          </div>
          {pages.map((pageName, idx) => (
            <button
              key={`page-${idx}`}
              type="button"
              onClick={() => {
                setCurrentPageIndex(idx);
                setMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-[13px] rounded-[10px] transition-colors flex items-center justify-between ${
                currentPageIndex === idx
                  ? "bg-[#1A1A1A] text-white"
                  : "text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-white"
              }`}
            >
              <span>{pageName}</span>
              {currentPageIndex === idx && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#2E5CFF]" />
              )}
            </button>
          ))}
          <div className="mt-1 pt-1 border-t border-[#1A1A1A]">
            <button
              type="button"
              onClick={handleAddPage}
              className="w-full text-left px-3 py-1.5 text-[13px] text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A] rounded-[10px] transition-colors flex items-center gap-1.5"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
