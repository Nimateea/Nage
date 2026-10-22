"use client";

import { useEffect, useRef, useCallback } from "react";
import { useEditorStore } from "@/lib/canvas/store/editorStore";
import { saveProjectDocumentAction } from "@/lib/supabase/projects";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function useAutoSave(projectId: string) {
  const { document, saveStatus, setSaveStatus, showToast } = useEditorStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedVersionRef = useRef<string>("");

  const saveNow = useCallback(async () => {
    if (projectId === "demo-project") {
      setSaveStatus("saved");
      return;
    }

    const currentDoc = useEditorStore.getState().document;
    const docHash = JSON.stringify(currentDoc);

    if (docHash === lastSavedVersionRef.current) {
      setSaveStatus("saved");
      return;
    }

    try {
      setSaveStatus("saving");
      await saveProjectDocumentAction(
        projectId,
        currentDoc as unknown as Record<string, unknown>
      );
      lastSavedVersionRef.current = docHash;
      setSaveStatus("saved");

      // Notify collaborators of saved document version
      try {
        if (typeof window !== "undefined") {
          const myId = sessionStorage.getItem("nage_client_id") || "local";
          const supabase = getSupabaseBrowserClient();
          const ch = supabase.channel(`nage:project:${projectId}`);
          ch.send({
            type: "broadcast",
            event: "doc-saved",
            payload: { savedBy: myId },
          });
        }
      } catch {}
    } catch (err) {
      console.error("Auto-save failed:", err);
      setSaveStatus("error");
    }
  }, [projectId, setSaveStatus]);

  // Debounced auto-save effect
  useEffect(() => {
    if (projectId === "demo-project") return;
    if (saveStatus !== "unsaved") return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      saveNow();
    }, 1200);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [document, saveStatus, projectId, saveNow]);

  // Keyboard shortcut: Cmd+S / Ctrl+S to save immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveNow().then(() => showToast("Document saved"));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveNow, showToast]);

  // Warn before closing tab if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === "unsaved" || saveStatus === "saving") {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus]);

  return { saveNow, saveStatus };
}
