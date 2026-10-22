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

export default function DemoPage() {
  const demoProject: Tables<"projects"> = {
    id: "demo-project",
    name: "Nage Demo Canvas",
    owner_id: "demo-guest",
    thumbnail_url: null,
    created_at: "2026-10-22T00:00:00.000Z",
    updated_at: "2026-10-22T00:00:00.000Z",
  };

  const initialDocument: CanvasDocument = {
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
        id: "ellipse-accent",
        name: "Circle Glow",
        x: 80,
        y: -140,
        width: 100,
        height: 100,
        fill: { type: "solid", color: "#FFFFFF", opacity: 0.9 },
      }),

      // 4. Text Nodes
      makeText({
        id: "text-title",
        name: "Title",
        x: -240,
        y: -10,
        width: 460,
        height: 40,
        content: "Nage Infinite Canvas Engine",
        fontSize: 22,
        fontWeight: 600,
        color: "#FFFFFF",
      }),

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

  return (
    <EditorShell
      project={demoProject}
      initialDocument={initialDocument}
      userEmail="guest@nage.design"
    />
  );
}
