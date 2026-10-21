/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useRef, useEffect } from "react";
import { signOutAction } from "@/lib/supabase/actions";

interface DashboardHeaderProps {
  userEmail?: string;
  displayName?: string;
  avatarUrl?: string | null;
  onNewProject: () => void;
}

export function DashboardHeader({
  userEmail,
  displayName,
  avatarUrl,
  onNewProject,
}: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const initial = (displayName || userEmail || "U")[0].toUpperCase();

  return (
    <header className="w-full flex justify-between items-center px-10 py-8 absolute top-0 left-0 z-20 pointer-events-auto">
      {/* Logo */}
      <div
        className="text-white text-[30px] select-none tracking-[-1px] font-normal"
        style={{ fontFamily: '"Gegola DEMO", sans-serif' }}
      >
        nage
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* New Project Button */}
        <button
          onClick={onNewProject}
          className="bg-white hover:bg-[#E5E5E5] text-black px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all active:scale-[0.98]"
        >
          New Project
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
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Profile Avatar Button */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 rounded-full bg-[#1A1A1A] hover:border-[#555555] border border-[#222222] text-white text-sm font-medium flex items-center justify-center transition-all overflow-hidden"
            title="Profile"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{initial}</span>
            )}
          </button>

          {/* Profile Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 top-12 z-30 w-56 bg-[#111111] border border-[#222222] rounded-[20px] p-2 shadow-2xl">
              <div className="px-3.5 py-2.5 border-b border-[#1A1A1A]">
                <p className="text-white text-[13px] font-medium truncate">
                  {displayName || "User"}
                </p>
                <p className="text-[#888888] text-[12px] truncate">{userEmail}</p>
              </div>
              <form action={signOutAction} className="mt-1">
                <button
                  type="submit"
                  className="w-full text-left px-3.5 py-2 text-[13px] text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A] rounded-[12px] transition-colors"
                >
                  Log out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
