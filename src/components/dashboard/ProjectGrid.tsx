"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ProjectCard } from "./ProjectCard";
import { EmptyState } from "./EmptyState";
import { DashboardHeader } from "./DashboardHeader";
import { NewProjectPrompt } from "./NewProjectPrompt";
import {
  createProjectAction,
  renameProjectAction,
  duplicateProjectAction,
  deleteProjectAction,
  type Project,
} from "@/lib/supabase/projects";

type SortOption = "recent" | "az" | "new";

interface ProjectGridProps {
  initialProjects: Project[];
  userEmail?: string;
  displayName?: string;
  avatarUrl?: string | null;
}

export function ProjectGrid({
  initialProjects,
  userEmail,
  displayName,
  avatarUrl,
}: ProjectGridProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showPrompt, setShowPrompt] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [sortOpen, setSortOpen] = useState(false);

  // Sorting
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      if (sortBy === "az") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "new") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      // default: recent activity
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [projects, sortBy]);

  // Actions
  const handleCreate = async (name?: string, prompt?: string) => {
    try {
      const newProject = await createProjectAction(name, prompt);
      setProjects([newProject, ...projects]);
      setShowPrompt(false);
      // Navigate straight to project canvas
      router.push(`/dashboard/${newProject.id}`);
    } catch (err) {
      console.error("Failed to create project:", err);
    }
  };

  const handleRename = async (id: string, newName: string) => {
    await renameProjectAction(id, newName);
    setProjects(
      projects.map((p) =>
        p.id === id ? { ...p, name: newName, updated_at: new Date().toISOString() } : p
      )
    );
  };

  const handleDuplicate = async (id: string) => {
    const duplicated = await duplicateProjectAction(id);
    setProjects([duplicated, ...projects]);
  };

  const handleDelete = async (id: string) => {
    await deleteProjectAction(id);
    setProjects(projects.filter((p) => p.id !== id));
  };

  if (showPrompt) {
    return (
      <NewProjectPrompt
        onBack={() => setShowPrompt(false)}
        onCreate={handleCreate}
      />
    );
  }

  const sortLabels: Record<SortOption, string> = {
    recent: "Recent activity",
    az: "Alphabetical",
    new: "Date created",
  };

  return (
    <div className="w-full h-full flex flex-col relative bg-black text-white">
      {/* Header */}
      <DashboardHeader
        userEmail={userEmail}
        displayName={displayName}
        avatarUrl={avatarUrl}
        onNewProject={() => setShowPrompt(true)}
      />

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col items-center justify-center p-6 mt-20 relative">
        {projects.length === 0 ? (
          <EmptyState onNewProject={() => setShowPrompt(true)} />
        ) : (
          <div className="w-full h-full max-w-[1280px] px-4 pt-12 flex flex-col">
            {/* Filter / Sort Bar */}
            <div className="flex items-center gap-3 mb-6 relative">
              {/* Sort Menu Button */}
              <div className="relative">
                <button
                  onClick={() => setSortOpen(!sortOpen)}
                  className="bg-[#111111] hover:bg-[#1A1A1A] rounded-full px-4 py-2 flex items-center gap-2 text-white text-[13px] transition-colors"
                >
                  {sortLabels[sortBy]}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {sortOpen && (
                  <div className="absolute top-10 left-0 z-30 w-44 bg-[#111111] border border-[#222222] rounded-[16px] p-1.5 shadow-2xl">
                    {(Object.keys(sortLabels) as SortOption[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSortBy(key);
                          setSortOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-[13px] rounded-[10px] transition-colors ${
                          sortBy === key
                            ? "text-white bg-[#1A1A1A]"
                            : "text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A]"
                        }`}
                      >
                        {sortLabels[key]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Grid of Projects */}
            <div
              className="grid gap-3 w-full pb-16"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              }}
            >
              {sortedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onRename={handleRename}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
