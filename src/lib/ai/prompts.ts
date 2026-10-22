import { nanoid } from "nanoid";
import type { CanvasNode } from "../canvas/document/types";
import {
  makeFrame,
  makeRectangle,
  makeText,
  makeEllipse,
} from "../canvas/document/defaults";

export const NAGE_AI_SYSTEM_INSTRUCTION = `
You are the AI design copilot for Nage, a high-performance web design tool with Figma-grade canvas rendering.
When the user asks you to design something, create a color palette, or layout UI components, output a JSON object with:
1. "reply": A friendly, concise design explanation or commentary.
2. "nodes": An optional array of Nage CanvasNode objects to place on the canvas.

Nage Node Types:
- "frame": container with id, name, x, y, width, height, fill { type: "solid", color, opacity }, stroke { color, width, opacity, style }, cornerRadius, children: string[]
- "rectangle": shape with id, name, x, y, width, height, fill, stroke, cornerRadius
- "ellipse": shape with id, name, x, y, width, height, fill, stroke
- "text": text element with id, name, x, y, width, height, content, fontSize, fontWeight, color, textAlign, fontFamily
- "line": line with id, name, x, y, x2, y2, stroke

Color Palette Aesthetic:
Dark theme (#000000 canvas, #0D0D0D frame background, #161616 card surface, #222222 borders, #2E5CFF primary accent, #FFFFFF text, #A0A0A0 muted text).

Always return valid JSON adhering to:
{
  "reply": "string",
  "nodes": [...]
}
`;

/**
 * Fallback generator for offline/demo mode or when Gemini API key is a placeholder.
 * Produces beautiful, authentic Nage UI layouts.
 */
export function generateFallbackDesign(prompt: string, task?: string): { reply: string; nodes: CanvasNode[] } {
  const p = prompt.toLowerCase();
  const originX = 120;
  const originY = 120;

  // 1. Color Palette Request
  if (task === "palette" || p.includes("palette") || p.includes("color")) {
    const frameId = nanoid();
    const frame = makeFrame({
      id: frameId,
      name: "Color Palette",
      x: originX,
      y: originY,
      width: 540,
      height: 150,
      cornerRadius: 16,
      fill: { type: "solid", color: "#0D0D0D", opacity: 1 },
      stroke: { color: "#222222", width: 1, opacity: 1, style: "solid" },
      childIds: [],
    });

    const swatches = [
      { name: "Brand Primary", hex: "#2E5CFF" },
      { name: "Electric Indigo", hex: "#6366F1" },
      { name: "Neon Emerald", hex: "#00E676" },
      { name: "Dark Surface", hex: "#161616" },
      { name: "Muted Slate", hex: "#64748B" },
    ];

    const childNodes: CanvasNode[] = [];
    swatches.forEach((sw, idx) => {
      const swId = nanoid();
      const textId = nanoid();
      frame.childIds.push(swId, textId);

      childNodes.push(
        makeRectangle({
          id: swId,
          name: sw.name,
          x: originX + 24 + idx * 100,
          y: originY + 24,
          width: 80,
          height: 60,
          cornerRadius: 10,
          fill: { type: "solid", color: sw.hex, opacity: 1 },
          stroke: { color: "#333333", width: 1, opacity: 0.5, style: "solid" },
          parentId: frameId,
        })
      );

      childNodes.push(
        makeText({
          id: textId,
          name: `${sw.name} Label`,
          x: originX + 24 + idx * 100,
          y: originY + 92,
          content: `${sw.name}\n${sw.hex}`,
          fontSize: 10,
          color: "#A0A0A0",
          parentId: frameId,
        })
      );
    });

    return {
      reply: "Generated a modern design palette with high-contrast accent colors and dark surface tokens.",
      nodes: [frame, ...childNodes],
    };
  }

  // 2. Feature Cards or Grid
  if (p.includes("card") || p.includes("feature") || p.includes("grid")) {
    const frameId = nanoid();
    const frame = makeFrame({
      id: frameId,
      name: "Feature Highlights",
      x: originX,
      y: originY,
      width: 660,
      height: 240,
      cornerRadius: 20,
      fill: { type: "solid", color: "#0B0B0B", opacity: 1 },
      stroke: { color: "#222222", width: 1, opacity: 1, style: "solid" },
      childIds: [],
    });

    const cards = [
      { title: "Infinite Canvas", desc: "60fps HTML5 Canvas with sub-pixel rendering." },
      { title: "Cloud Realtime", desc: "Collaborate with multi-cursor presence." },
      { title: "Vector Engine", desc: "Export crisp 3x PNG, SVG, and portable JSON." },
    ];

    const childNodes: CanvasNode[] = [];
    cards.forEach((c, idx) => {
      const cardId = nanoid();
      const titleId = nanoid();
      const descId = nanoid();
      frame.childIds.push(cardId, titleId, descId);

      childNodes.push(
        makeRectangle({
          id: cardId,
          name: `Card ${idx + 1}`,
          x: originX + 24 + idx * 206,
          y: originY + 30,
          width: 190,
          height: 180,
          cornerRadius: 14,
          fill: { type: "solid", color: "#141414", opacity: 1 },
          stroke: { color: "#2A2A2A", width: 1, opacity: 1, style: "solid" },
          parentId: frameId,
        })
      );

      childNodes.push(
        makeText({
          id: titleId,
          name: `${c.title} Title`,
          x: originX + 40 + idx * 206,
          y: originY + 54,
          content: c.title,
          fontSize: 15,
          fontWeight: 600,
          color: "#FFFFFF",
          parentId: frameId,
        })
      );

      childNodes.push(
        makeText({
          id: descId,
          name: `${c.title} Desc`,
          x: originX + 40 + idx * 206,
          y: originY + 88,
          width: 158,
          content: c.desc,
          fontSize: 12,
          fontWeight: 400,
          color: "#888888",
          parentId: frameId,
        })
      );
    });

    return {
      reply: "Designed 3 modular feature cards inside a dark container frame.",
      nodes: [frame, ...childNodes],
    };
  }

  // 3. Hero Section (Default Design Layout)
  const heroFrameId = nanoid();
  const heroFrame = makeFrame({
    id: heroFrameId,
    name: "Hero Section",
    x: originX,
    y: originY,
    width: 680,
    height: 380,
    cornerRadius: 24,
    fill: { type: "solid", color: "#0B0B0B", opacity: 1 },
    stroke: { color: "#222222", width: 1, opacity: 1, style: "solid" },
    childIds: [],
  });

  const badgeId = nanoid();
  const badgeTextId = nanoid();
  const headingId = nanoid();
  const subheadId = nanoid();
  const ctaBtnId = nanoid();
  const ctaTextId = nanoid();
  const accentOrbId = nanoid();

  heroFrame.childIds.push(
    accentOrbId,
    badgeId,
    badgeTextId,
    headingId,
    subheadId,
    ctaBtnId,
    ctaTextId
  );

  const heroNodes: CanvasNode[] = [
    heroFrame,
    makeEllipse({
      id: accentOrbId,
      name: "Ambient Light",
      x: originX + 420,
      y: originY + 40,
      width: 200,
      height: 200,
      fill: { type: "solid", color: "#2E5CFF", opacity: 0.15 },
      stroke: { color: "transparent", width: 0, opacity: 0, style: "solid" },
      parentId: heroFrameId,
    }),
    makeRectangle({
      id: badgeId,
      name: "Pill Badge",
      x: originX + 40,
      y: originY + 44,
      width: 140,
      height: 28,
      cornerRadius: 9999,
      fill: { type: "solid", color: "#1A1A1A", opacity: 1 },
      stroke: { color: "#333333", width: 1, opacity: 1, style: "solid" },
      parentId: heroFrameId,
    }),
    makeText({
      id: badgeTextId,
      name: "Badge Text",
      x: originX + 54,
      y: originY + 51,
      content: "✦ Next-Gen Design",
      fontSize: 11,
      fontWeight: 500,
      color: "#2E5CFF",
      parentId: heroFrameId,
    }),
    makeText({
      id: headingId,
      name: "Hero Title",
      x: originX + 40,
      y: originY + 92,
      content: "Craft beautiful web apps\nat the speed of thought.",
      fontSize: 26,
      fontWeight: 700,
      color: "#FFFFFF",
      parentId: heroFrameId,
    }),
    makeText({
      id: subheadId,
      name: "Hero Subhead",
      x: originX + 40,
      y: originY + 176,
      width: 480,
      content:
        "An infinite design canvas engineered for modern builders. Instant collaboration, vector export, and generative AI built right into the core.",
      fontSize: 13,
      fontWeight: 400,
      color: "#888888",
      parentId: heroFrameId,
    }),
    makeRectangle({
      id: ctaBtnId,
      name: "CTA Button",
      x: originX + 40,
      y: originY + 254,
      width: 150,
      height: 42,
      cornerRadius: 12,
      fill: { type: "solid", color: "#2E5CFF", opacity: 1 },
      stroke: { color: "#2E5CFF", width: 1, opacity: 1, style: "solid" },
      parentId: heroFrameId,
    }),
    makeText({
      id: ctaTextId,
      name: "CTA Label",
      x: originX + 72,
      y: originY + 267,
      content: "Get Started Free",
      fontSize: 13,
      fontWeight: 600,
      color: "#FFFFFF",
      parentId: heroFrameId,
    }),
  ];

  return {
    reply: `Crafted a modern Hero layout for "${prompt}". Container frame, typographic hierarchy, ambient lighting, and CTA button created.`,
    nodes: heroNodes,
  };
}
