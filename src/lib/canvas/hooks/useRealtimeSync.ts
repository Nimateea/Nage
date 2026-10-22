"use client";

import { useEffect, useRef, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEditorStore } from "@/lib/canvas/store/editorStore";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Deterministic bright user color from user identifier
const CURSOR_COLORS = [
  "#2E5CFF", // Nage Blue
  "#FF5E2E", // Nage Orange
  "#00E676", // Green
  "#E040FB", // Purple
  "#FFD600", // Yellow
  "#00E5FF", // Cyan
  "#FF1744", // Red
];

function pickColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % CURSOR_COLORS.length;
  return CURSOR_COLORS[idx];
}

interface RealtimeSyncProps {
  projectId: string;
  userEmail?: string;
}

export function useRealtimeSync({ projectId, userEmail }: RealtimeSyncProps) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const myIdRef = useRef<string>("client_local");

  const {
    setRemoteCursor,
    removeRemoteCursor,
    showToast,
  } = useEditorStore();

  const userColor = pickColor(userEmail || "nage_guest");
  const userName = userEmail ? userEmail.split("@")[0] : "Guest";

  // Subscribe to channel
  useEffect(() => {
    if (projectId === "demo-project") return;

    if (typeof window !== "undefined") {
      let storedId = sessionStorage.getItem("nage_client_id");
      if (!storedId) {
        storedId = `client_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem("nage_client_id", storedId);
      }
      myIdRef.current = storedId;
    }

    const currentClientId = myIdRef.current;
    const supabase = getSupabaseBrowserClient();
    const channelName = `nage:project:${projectId}`;

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: currentClientId },
      },
    });

    // Listen to broadcast cursor events
    channel.on(
      "broadcast",
      { event: "cursor" },
      ({ payload }: { payload: { id: string; name: string; x: number; y: number; color: string } }) => {
        if (!payload || payload.id === currentClientId) return;
        setRemoteCursor(payload.id, {
          ...payload,
          lastSeen: Date.now(),
        });
      }
    );

    // Listen to document saved notifications from other clients
    channel.on(
      "broadcast",
      { event: "doc-saved" },
      ({ payload }: { payload: { savedBy: string } }) => {
        if (payload.savedBy !== currentClientId) {
          showToast("Document updated by collaborator");
        }
      }
    );

    // Track presence
    channel.on("presence", { event: "leave" }, ({ key }) => {
      if (key) {
        removeRemoteCursor(key);
      }
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.track({
          id: currentClientId,
          name: userName,
          color: userColor,
          onlineAt: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;

    // Periodic cleanup of inactive remote cursors (older than 10s)
    const cleanupInterval = setInterval(() => {
      const cursors = useEditorStore.getState().remoteCursors;
      const now = Date.now();
      for (const [id, cursor] of Object.entries(cursors)) {
        if (now - cursor.lastSeen > 10000) {
          removeRemoteCursor(id);
        }
      }
    }, 4000);

    return () => {
      clearInterval(cleanupInterval);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [
    projectId,
    userEmail,
    userName,
    userColor,
    setRemoteCursor,
    removeRemoteCursor,
    showToast,
  ]);

  // Broadcast cursor movement throttled
  const lastBroadcastRef = useRef<number>(0);
  const broadcastCursor = useCallback(
    (worldX: number, worldY: number) => {
      if (projectId === "demo-project") return;
      const channel = channelRef.current;
      if (!channel) return;

      const now = Date.now();
      if (now - lastBroadcastRef.current < 40) return; // ~25fps throttle
      lastBroadcastRef.current = now;

      channel.send({
        type: "broadcast",
        event: "cursor",
        payload: {
          id: myIdRef.current,
          name: userName,
          x: Math.round(worldX),
          y: Math.round(worldY),
          color: userColor,
        },
      });
    },
    [projectId, userName, userColor]
  );

  return { broadcastCursor, userColor, userName };
}
