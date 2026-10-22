import React from "react";
import { EditorShell } from "@/components/editor/EditorShell";
import {
  makeRectangle,
  makeEllipse,
  makeText,
  makeFrame,
} from "@/lib/canvas/document/defaults";
import type { CanvasDocument } from "@/lib/canvas/document/types";
import type { Tables } from "@/lib/supabase/types";

export const instant = false;

const DEMO_PROJECT: Tables<"projects"> = {
  id: "demo-project",
  name: "Nage Demo Canvas",
  owner_id: "demo-guest",
  thumbnail_url: null,
  created_at: "2026-10-22T00:00:00.000Z",
  updated_at: "2026-10-22T00:00:00.000Z",
};

const INITIAL_DOCUMENT: CanvasDocument = {
  version: 1,
  camera: { x: 0, y: 0, zoom: 1 },
  nodes: [
    // 1. Frame
    makeFrame({
      id: "frame-1",
      name: "Artboard 1",
      x: -280,
      y: -180,
      width: 560,
      height: 360,
      stroke: { color: "#222222", width: 1, opacity: 1, style: "solid" },
      fill: { type: "solid", color: "#0D0D0D", opacity: 1 },
      cornerRadius: 16,
    }),

    // 2. Rectangles inside frame
    makeRectangle({
      id: "rect-blue",
      name: "Primary Accent",
      x: -240,
      y: -140,
      width: 140,
      height: 100,
      fill: { type: "solid", color: "#2E5CFF", opacity: 1 },
      cornerRadius: 12,
    }),

    makeRectangle({
      id: "rect-dark",
      name: "Surface Card",
      x: -80,
      y: -140,
      width: 140,
      height: 100,
      fill: { type: "solid", color: "#1A1A1A", opacity: 1 },
      stroke: { color: "#333333", width: 1, opacity: 1, style: "solid" },
      cornerRadius: 12,
    }),

    // 3. Ellipse
    makeEllipse({
      id: "ellipse-coral",
      name: "Indicator Dot",
      x: 80,
      y: -140,
      width: 100,
      height: 100,
      fill: { type: "solid", color: "#FF5E2E", opacity: 1 },
      stroke: { color: "#FF5E2E", width: 0, opacity: 1, style: "solid" },
    }),

    // 4. Text Header
    makeText({
      id: "text-title",
      name: "Canvas Title",
      x: -240,
      y: -20,
      width: 320,
      height: 40,
      content: "Infinite Canvas 2D Engine",
      fontSize: 22,
      fontWeight: 600,
      color: "#FFFFFF",
    }),

    // 5. Text Subtitle
    makeText({
      id: "text-desc",
      name: "Instructions",
      x: -240,
      y: 40,
      width: 480,
      height: 80,
      content:
        "• Hold Space or use Hand (H) to pan\n• Scroll or Pinch to zoom\n• Click shapes to select with dimension badges\n• Shift + 1 to center view",
      fontSize: 14,
      fontWeight: 400,
      color: "#A0A0A0",
    }),
  ],
};

export default function DemoPage() {
  return (
    <EditorShell
      project={DEMO_PROJECT}
      initialDocument={INITIAL_DOCUMENT}
      userEmail="guest@nage.design"
    />
  );
}
