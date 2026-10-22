"use client";

import React, { useEffect } from "react";
import type { CanvasDocument } from "@/lib/canvas/document/types";
import type { Tables } from "@/lib/supabase/types";
import { useEditorStore } from "@/lib/canvas/store/editorStore";
import { CanvasStage } from "./canvas/CanvasStage";
import { Toolbar } from "./Toolbar";
import { EditorHeader } from "./EditorHeader";
import { EditorModals } from "./EditorModals";
import { Toast } from "./Toast";

interface EditorShellProps {
  project: Tables<"projects">;
  initialDocument: CanvasDocument;
  userEmail?: string;
}

export function EditorShell({
  project,
  initialDocument,
  userEmail,
}: EditorShellProps) {
  const initEditor = useEditorStore((state) => state.initEditor);

  useEffect(() => {
    initEditor(project.id, project.name, initialDocument);
  }, [project.id, project.name, initialDocument, initEditor]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black select-none text-white font-sans">
      {/* Top Header */}
      <EditorHeader
        initialTitle={project.name}
        projectId={project.id}
        userEmail={userEmail}
      />

      {/* 2D Infinite Canvas Host */}
      <CanvasStage />

      {/* Floating Bottom Toolbar */}
      <Toolbar />

      {/* Modals & Dialogs */}
      <EditorModals />

      {/* Status Toast */}
      <Toast />
    </div>
  );
}
