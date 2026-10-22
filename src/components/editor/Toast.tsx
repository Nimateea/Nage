"use client";

import React from "react";
import { useEditorStore } from "@/lib/canvas/store/editorStore";

export function Toast() {
  const toastMessage = useEditorStore((state) => state.toastMessage);

  if (!toastMessage) return null;

  return (
    <div
      role="status"
      className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 bg-[#111111] border border-[#222222] rounded-full px-5 py-2.5 text-[13px] text-white shadow-xl transition-all pointer-events-none animate-in fade-in"
    >
      {toastMessage}
    </div>
  );
}
