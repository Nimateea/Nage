import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const instant = false;

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .single();

  if (!project) notFound();

  return (
    <div className="w-full h-full flex flex-col relative bg-black select-none overflow-hidden text-white">
      {/* Top Header matching Nage prototype */}
      <header className="w-full flex justify-between items-center px-6 py-6 absolute top-0 left-0 z-10 pointer-events-none">
        {/* Left Nav */}
        <Link
          href="/dashboard"
          className="bg-[#111111] hover:bg-[#1A1A1A] rounded-full px-4 py-2 flex items-center gap-3 transition-colors pointer-events-auto cursor-pointer"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#A0A0A0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span
            className="text-white text-[20px] tracking-[-0.5px] leading-none"
            style={{ fontFamily: '"Gegola DEMO", sans-serif' }}
          >
            nage
          </span>
          <div className="flex items-center gap-2">
            <span className="text-white text-[13px] font-medium ml-2">
              {project.name}
            </span>
            <span className="text-[#555555] text-[13px]">Moodboard</span>
          </div>
        </Link>

        {/* Right Nav */}
        <div className="flex items-center gap-4 pointer-events-auto">
          <button
            type="button"
            className="bg-[#111111] hover:bg-[#1A1A1A] text-white rounded-full px-4 py-2 text-[13px] flex items-center gap-2 transition-colors"
          >
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

      {/* Canvas Area Placeholder for Step 4 */}
      <main className="w-full h-full flex items-center justify-center text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#111111] border border-[#222222] flex items-center justify-center text-[#888888]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </div>
          <h2 className="text-white text-[15px] font-medium">Canvas Workspace</h2>
          <p className="text-[#555555] text-[13px]">
            Infinite Canvas 2D engine with pan, zoom, and drawing tools will be added in Step 4.
          </p>
        </div>
      </main>
    </div>
  );
}
