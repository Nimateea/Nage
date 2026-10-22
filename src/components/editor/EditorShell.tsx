"use client";

import React, { useEffect, useRef } from "react";
import type { CanvasDocument } from "@/lib/canvas/document/types";
import type { Tables } from "@/lib/supabase/types";
import { useEditorStore } from "@/lib/canvas/store/editorStore";
import { useAutoSave } from "@/lib/canvas/hooks/useAutoSave";
import { useRealtimeSync } from "@/lib/canvas/hooks/useRealtimeSync";
import { CanvasStage } from "./canvas/CanvasStage";
import { CanvasRulers } from "./canvas/CanvasRulers";
import { ContextToolbar } from "./ContextToolbar";
import { PropertiesPanel } from "./PropertiesPanel";
import { LayersPanel } from "./LayersPanel";
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
  const initializedProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (initializedProjectIdRef.current === project.id) return;
    initializedProjectIdRef.current = project.id;
    initEditor(project.id, project.name, initialDocument);
  }, [project.id, project.name, initialDocument, initEditor]);

  // Step 9: Debounced auto-save to Supabase Postgres
  useAutoSave(project.id);

  // Step 9: Real-time broadcast and presence for multiplayer cursor sync
  const { broadcastCursor } = useRealtimeSync({
    projectId: project.id,
    userEmail,
  });

  return (
    <div className="w-full h-full relative overflow-hidden bg-black select-none text-white font-sans">
      {/* Top Header */}
      <EditorHeader
        initialTitle={project.name}
        projectId={project.id}
        userEmail={userEmail}
      />

      {/* Rulers & Guides Layer */}
      <CanvasRulers />

      {/* Context Selection Toolbar (Text, Colors, Frame sizes) */}
      <ContextToolbar />

      {/* Properties Panel (Right floating inspector for selected nodes) */}
      <PropertiesPanel />

      {/* Layers Panel (Left floating tree hierarchy) */}
      <LayersPanel />

      {/* 2D Infinite Canvas Host */}
      <CanvasStage onPointerMoveWorld={broadcastCursor} />

      {/* Floating Bottom Toolbar */}
      <Toolbar />

      {/* Modals & Dialogs */}
      <EditorModals />

      {/* Status Toast */}
      <Toast />
    </div>
  );
}
