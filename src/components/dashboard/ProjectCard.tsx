/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatRelativeTime } from "@/lib/utils/time";
import type { Project } from "@/lib/supabase/projects";

interface ProjectCardProps {
  project: Project;
  onRename: (id: string, name: string) => Promise<void>;
  onDuplicate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ProjectCard({
  project,
  onRename,
  onDuplicate,
  onDelete,
}: ProjectCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveRename = async () => {
    setIsEditing(false);
    if (name.trim() && name.trim() !== project.name) {
      await onRename(project.id, name.trim());
    } else {
      setName(project.name);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/dashboard/${project.id}`;
    navigator.clipboard.writeText(url);
    setMenuOpen(false);
  };

  const handleCardClick = () => {
    if (isEditing) return;
    router.push(`/dashboard/${project.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="relative group bg-[#0D0D0D] hover:bg-[#151515] rounded-[16px] p-2 transition-all cursor-pointer"
    >
      {/* Thumbnail Box */}
      <div className="h-[120px] rounded-[12px] bg-[#0A0A0A] overflow-hidden flex items-center justify-center border border-[#1A1A1A]">
        {project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 opacity-25 group-hover:opacity-40 transition-opacity">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 15l6-6 4 4 8-8" />
            </svg>
          </div>
        )}
      </div>

      {/* Info Row */}
      <div className="mt-2.5 px-1 pb-1">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSaveRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveRename();
              if (e.key === "Escape") {
                setName(project.name);
                setIsEditing(false);
              }
            }}
            className="w-full bg-[#1A1A1A] text-white text-[13px] font-medium px-1.5 py-0.5 rounded outline-none border border-[#2E5CFF]"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3
            onDoubleClick={(e) => {
              e.preventDefault();
              setIsEditing(true);
            }}
            title={project.name}
            className="text-white text-[13px] font-medium truncate pr-8 select-none"
          >
            {project.name}
          </h3>
        )}

        <p className="text-[#555555] text-[12px] mt-0.5 select-none">
          Moodboard · {formatRelativeTime(project.updated_at)}
        </p>
      </div>

      {/* More Options Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuOpen(!menuOpen);
        }}
        className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#111111]/80 hover:bg-[#1A1A1A] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
        title="More options"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>

      {/* Popover Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-12 right-2 z-30 w-40 bg-[#111111] border border-[#222222] rounded-[16px] p-1.5 shadow-2xl"
        >
          <button
            onClick={() => {
              setMenuOpen(false);
              setIsEditing(true);
            }}
            className="w-full text-left px-3 py-2 text-[13px] text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A] rounded-[10px] transition-colors"
          >
            Rename
          </button>
          <button
            onClick={async () => {
              setMenuOpen(false);
              await onDuplicate(project.id);
            }}
            className="w-full text-left px-3 py-2 text-[13px] text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A] rounded-[10px] transition-colors"
          >
            Duplicate
          </button>
          <button
            onClick={handleCopyLink}
            className="w-full text-left px-3 py-2 text-[13px] text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A] rounded-[10px] transition-colors"
          >
            Copy link
          </button>
          <div className="h-px bg-[#222222] my-1" />
          <button
            onClick={async () => {
              setMenuOpen(false);
              await onDelete(project.id);
            }}
            className="w-full text-left px-3 py-2 text-[13px] text-[#FF5E2E] hover:bg-[#1A1A1A] rounded-[10px] transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
