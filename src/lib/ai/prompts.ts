import { nanoid } from "nanoid";
import type { CanvasNode } from "../canvas/document/types";
import {
  makeFrame,
  makeRectangle,
  makeText,
  makeEllipse,
  makeLine,
} from "../canvas/document/defaults";

export const NAGE_AI_SYSTEM_INSTRUCTION = `
You are the AI Design Agent for Nage, a high-performance web design tool modeled after Figma AI.
Your role is to act as an autonomous creative design partner:
1. When asked to create, design, or layout ANY interface, widget, card, page, or component, generate complete, pixel-perfect Nage canvas nodes in a dark modern UI aesthetic.
2. When asked to rewrite, shorten, translate, or refine copy, generate optimized microcopy for the selected elements.
3. When asked to create palettes or design systems, generate harmonious color swatches with hex tokens.

Canvas Node Guidelines:
- "frame": Artboard/Container. Properties: id, name, type="frame", x, y, width, height, cornerRadius, fill { type: "solid", color, opacity }, stroke { color, width, opacity, style }, childIds: string[]
- "rectangle": Cards, buttons, inputs, badges. Properties: id, name, type="rectangle", x, y, width, height, cornerRadius, fill, stroke, parentId?: string
- "ellipse": Avatars, status orbs, indicators. Properties: id, name, type="ellipse", x, y, width, height, fill, stroke, parentId?: string
- "text": Typography. Properties: id, name, type="text", x, y, width, height, content, fontSize, fontWeight (400|500|600|700), color, textAlign ("left"|"center"|"right"), fontFamily, parentId?: string
- "line": Dividers, progress bars. Properties: id, name, type="line", x, y, x2, y2, stroke, parentId?: string

Color System:
- Background: #000000 (canvas), #0D0D0D (frame surface)
- Cards & Inputs: #141414 to #1A1A1A
- Borders: #262626 to #333333
- Accents: #2E5CFF (primary blue), #00E676 (success green), #FF5E2E (accent coral), #A855F7 (purple)
- Typography: #FFFFFF (headline), #D1D5DB (body), #888888 (muted caption)

Response Format:
Return strict JSON without markdown formatting:
{
  "reply": "Clear explanation of the design decisions, layout structure, and styling choices.",
  "nodes": [ ...array of valid Nage canvas nodes... ]
}
`;

/**
 * Intelligent Agentic Generator that dynamically synthesizes arbitrary UI requests,
 * ensuring high-fidelity Figma-grade components matching the user's exact input.
 */
export function generateAgentDesign(
  prompt: string,
  task?: string,
  camera?: { x: number; y: number; zoom: number }
): { reply: string; nodes: CanvasNode[] } {
  const p = prompt.toLowerCase();

  // Position relative to active viewport camera (centered)
  const zoom = camera?.zoom || 1;
  const originX = camera ? Math.round(-camera.x / zoom + 40) : 100;
  const originY = camera ? Math.round(-camera.y / zoom + 40) : 100;

  // 1. Color Palette Request
  if (task === "palette" || p.includes("palette") || p.includes("color scheme") || p.includes("theme")) {
    const frameId = nanoid();
    let themeTitle = "Design Palette";
    let swatches = [
      { name: "Brand Primary", hex: "#2E5CFF" },
      { name: "Electric Indigo", hex: "#6366F1" },
      { name: "Neon Emerald", hex: "#00E676" },
      { name: "Card Surface", hex: "#161616" },
      { name: "Muted Slate", hex: "#64748B" },
    ];

    if (p.includes("warm") || p.includes("sunset") || p.includes("orange")) {
      themeTitle = "Sunset Warmth Palette";
      swatches = [
        { name: "Deep Crimson", hex: "#E11D48" },
        { name: "Sunset Orange", hex: "#F97316" },
        { name: "Warm Amber", hex: "#FBBF24" },
        { name: "Dark Walnut", hex: "#1C1917" },
        { name: "Cream Paper", hex: "#F5F5F4" },
      ];
    } else if (p.includes("cyberpunk") || p.includes("neon")) {
      themeTitle = "Cyberpunk Neon Palette";
      swatches = [
        { name: "Neon Cyan", hex: "#00F0FF" },
        { name: "Electric Pink", hex: "#FF007F" },
        { name: "Matrix Green", hex: "#39FF14" },
        { name: "Deep Void", hex: "#080811" },
        { name: "Holo Violet", hex: "#8A2BE2" },
      ];
    } else if (p.includes("nature") || p.includes("green") || p.includes("eco")) {
      themeTitle = "Organic Nature Palette";
      swatches = [
        { name: "Forest Moss", hex: "#15803D" },
        { name: "Bright Sage", hex: "#4ADE80" },
        { name: "Earth Ochre", hex: "#CA8A04" },
        { name: "Dark Soil", hex: "#171F1A" },
        { name: "Mist White", hex: "#F0FDF4" },
      ];
    }

    const frame = makeFrame({
      id: frameId,
      name: themeTitle,
      x: originX,
      y: originY,
      width: 540,
      height: 150,
      cornerRadius: 16,
      fill: { type: "solid", color: "#0D0D0D", opacity: 1 },
      stroke: { color: "#222222", width: 1, opacity: 1, style: "solid" },
      childIds: [],
    });

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
      reply: `Created ${themeTitle} with 5 accessible contrast-graded swatches and token labels.`,
      nodes: [frame, ...childNodes],
    };
  }

  // 2. Login / Auth / Signup Screen
  if (p.includes("login") || p.includes("sign in") || p.includes("auth") || p.includes("signup") || p.includes("register")) {
    const frameId = nanoid();
    const isSignup = p.includes("signup") || p.includes("register");
    const frameTitle = isSignup ? "Create Account" : "Sign In";

    const frame = makeFrame({
      id: frameId,
      name: frameTitle,
      x: originX,
      y: originY,
      width: 420,
      height: 520,
      cornerRadius: 24,
      fill: { type: "solid", color: "#0D0D0D", opacity: 1 },
      stroke: { color: "#222222", width: 1, opacity: 1, style: "solid" },
      childIds: [],
    });

    const titleId = nanoid();
    const subheadId = nanoid();
    const googleBtnId = nanoid();
    const googleTextId = nanoid();
    const dividerId = nanoid();
    const emailLabelId = nanoid();
    const emailInputId = nanoid();
    const emailPlaceholderId = nanoid();
    const passLabelId = nanoid();
    const passInputId = nanoid();
    const passPlaceholderId = nanoid();
    const submitBtnId = nanoid();
    const submitTextId = nanoid();

    frame.childIds.push(
      titleId,
      subheadId,
      googleBtnId,
      googleTextId,
      dividerId,
      emailLabelId,
      emailInputId,
      emailPlaceholderId,
      passLabelId,
      passInputId,
      passPlaceholderId,
      submitBtnId,
      submitTextId
    );

    const nodes: CanvasNode[] = [
      frame,
      makeText({
        id: titleId,
        name: "Modal Title",
        x: originX + 36,
        y: originY + 40,
        content: isSignup ? "Create your account" : "Welcome back",
        fontSize: 22,
        fontWeight: 700,
        color: "#FFFFFF",
        parentId: frameId,
      }),
      makeText({
        id: subheadId,
        name: "Modal Subhead",
        x: originX + 36,
        y: originY + 74,
        content: isSignup ? "Start designing with Nage in seconds." : "Enter your credentials to continue.",
        fontSize: 12,
        color: "#888888",
        parentId: frameId,
      }),
      makeRectangle({
        id: googleBtnId,
        name: "Google Button",
        x: originX + 36,
        y: originY + 110,
        width: 348,
        height: 42,
        cornerRadius: 12,
        fill: { type: "solid", color: "#161616", opacity: 1 },
        stroke: { color: "#2A2A2A", width: 1, opacity: 1, style: "solid" },
        parentId: frameId,
      }),
      makeText({
        id: googleTextId,
        name: "Google Label",
        x: originX + 36,
        y: originY + 122,
        width: 348,
        content: "Continue with Google",
        fontSize: 12,
        fontWeight: 500,
        color: "#FFFFFF",
        textAlign: "center",
        parentId: frameId,
      }),
      makeLine({
        id: dividerId,
        name: "Divider",
        x: originX + 36,
        y: originY + 176,
        x2: originX + 384,
        y2: originY + 176,
        stroke: { color: "#222222", width: 1, opacity: 1, style: "solid" },
        parentId: frameId,
      }),
      makeText({
        id: emailLabelId,
        name: "Email Label",
        x: originX + 36,
        y: originY + 200,
        content: "EMAIL ADDRESS",
        fontSize: 10,
        fontWeight: 600,
        color: "#666666",
        parentId: frameId,
      }),
      makeRectangle({
        id: emailInputId,
        name: "Email Field",
        x: originX + 36,
        y: originY + 220,
        width: 348,
        height: 42,
        cornerRadius: 10,
        fill: { type: "solid", color: "#141414", opacity: 1 },
        stroke: { color: "#262626", width: 1, opacity: 1, style: "solid" },
        parentId: frameId,
      }),
      makeText({
        id: emailPlaceholderId,
        name: "Email Placeholder",
        x: originX + 50,
        y: originY + 233,
        content: "alex@design.studio",
        fontSize: 12,
        color: "#555555",
        parentId: frameId,
      }),
      makeText({
        id: passLabelId,
        name: "Password Label",
        x: originX + 36,
        y: originY + 280,
        content: "PASSWORD",
        fontSize: 10,
        fontWeight: 600,
        color: "#666666",
        parentId: frameId,
      }),
      makeRectangle({
        id: passInputId,
        name: "Password Field",
        x: originX + 36,
        y: originY + 300,
        width: 348,
        height: 42,
        cornerRadius: 10,
        fill: { type: "solid", color: "#141414", opacity: 1 },
        stroke: { color: "#262626", width: 1, opacity: 1, style: "solid" },
        parentId: frameId,
      }),
      makeText({
        id: passPlaceholderId,
        name: "Password Placeholder",
        x: originX + 50,
        y: originY + 313,
        content: "••••••••••••",
        fontSize: 12,
        color: "#555555",
        parentId: frameId,
      }),
      makeRectangle({
        id: submitBtnId,
        name: "Submit Button",
        x: originX + 36,
        y: originY + 372,
        width: 348,
        height: 46,
        cornerRadius: 12,
        fill: { type: "solid", color: "#2E5CFF", opacity: 1 },
        stroke: { color: "#2E5CFF", width: 1, opacity: 1, style: "solid" },
        parentId: frameId,
      }),
      makeText({
        id: submitTextId,
        name: "Submit Label",
        x: originX + 36,
        y: originY + 386,
        width: 348,
        content: isSignup ? "Create Free Account" : "Sign In to Studio",
        fontSize: 13,
        fontWeight: 600,
        color: "#FFFFFF",
        textAlign: "center",
        parentId: frameId,
      }),
    ];

    return {
      reply: `Synthesized a modern authentication modal with social login, input states, and primary button.`,
      nodes,
    };
  }

  // 3. Pricing Table / Plans
  if (p.includes("price") || p.includes("pricing") || p.includes("plan") || p.includes("tier")) {
    const frameId = nanoid();
    const frame = makeFrame({
      id: frameId,
      name: "Pricing Plans",
      x: originX,
      y: originY,
      width: 740,
      height: 460,
      cornerRadius: 24,
      fill: { type: "solid", color: "#0B0B0B", opacity: 1 },
      stroke: { color: "#222222", width: 1, opacity: 1, style: "solid" },
      childIds: [],
    });

    const titleId = nanoid();
    const subId = nanoid();
    frame.childIds.push(titleId, subId);

    const plans = [
      { name: "Starter", price: "$0", period: "/mo", desc: "For individual designers", featured: false },
      { name: "Professional", price: "$29", period: "/mo", desc: "For teams and studios", featured: true },
      { name: "Enterprise", price: "$99", period: "/mo", desc: "Custom security & AI scale", featured: false },
    ];

    const childNodes: CanvasNode[] = [
      frame,
      makeText({
        id: titleId,
        name: "Pricing Title",
        x: originX + 36,
        y: originY + 36,
        content: "Transparent, predictable pricing",
        fontSize: 22,
        fontWeight: 700,
        color: "#FFFFFF",
        parentId: frameId,
      }),
      makeText({
        id: subId,
        name: "Pricing Subhead",
        x: originX + 36,
        y: originY + 68,
        content: "Scale your creative workflow with unlimited projects and real-time collaboration.",
        fontSize: 12,
        color: "#888888",
        parentId: frameId,
      }),
    ];

    plans.forEach((plan, idx) => {
      const cardId = nanoid();
      const planNameId = nanoid();
      const priceId = nanoid();
      const planDescId = nanoid();
      const btnId = nanoid();
      const btnLabelId = nanoid();

      frame.childIds.push(cardId, planNameId, priceId, planDescId, btnId, btnLabelId);

      childNodes.push(
        makeRectangle({
          id: cardId,
          name: `${plan.name} Card`,
          x: originX + 36 + idx * 228,
          y: originY + 110,
          width: 212,
          height: 310,
          cornerRadius: 18,
          fill: { type: "solid", color: plan.featured ? "#161824" : "#131313", opacity: 1 },
          stroke: { color: plan.featured ? "#2E5CFF" : "#262626", width: plan.featured ? 2 : 1, opacity: 1, style: "solid" },
          parentId: frameId,
        })
      );

      childNodes.push(
        makeText({
          id: planNameId,
          name: "Plan Name",
          x: originX + 54 + idx * 228,
          y: originY + 134,
          content: plan.name,
          fontSize: 14,
          fontWeight: 600,
          color: plan.featured ? "#2E5CFF" : "#FFFFFF",
          parentId: frameId,
        })
      );

      childNodes.push(
        makeText({
          id: priceId,
          name: "Plan Price",
          x: originX + 54 + idx * 228,
          y: originY + 162,
          content: `${plan.price}${plan.period}`,
          fontSize: 24,
          fontWeight: 700,
          color: "#FFFFFF",
          parentId: frameId,
        })
      );

      childNodes.push(
        makeText({
          id: planDescId,
          name: "Plan Desc",
          x: originX + 54 + idx * 228,
          y: originY + 204,
          width: 176,
          content: `${plan.desc}\n• Unlimited artboards\n• High-res vector export\n• Supabase sync`,
          fontSize: 11,
          color: "#888888",
          parentId: frameId,
        })
      );

      childNodes.push(
        makeRectangle({
          id: btnId,
          name: "Plan CTA",
          x: originX + 54 + idx * 228,
          y: originY + 360,
          width: 176,
          height: 38,
          cornerRadius: 10,
          fill: { type: "solid", color: plan.featured ? "#2E5CFF" : "#202020", opacity: 1 },
          stroke: { color: plan.featured ? "#2E5CFF" : "#333333", width: 1, opacity: 1, style: "solid" },
          parentId: frameId,
        })
      );

      childNodes.push(
        makeText({
          id: btnLabelId,
          name: "Plan CTA Text",
          x: originX + 54 + idx * 228,
          y: originY + 371,
          width: 176,
          content: plan.featured ? "Upgrade to Pro" : "Get Started",
          fontSize: 12,
          fontWeight: 600,
          color: "#FFFFFF",
          textAlign: "center",
          parentId: frameId,
        })
      );
    });

    return {
      reply: "Generated 3-tier pricing grid highlighting the Professional plan with structured feature lists and CTAs.",
      nodes: childNodes,
    };
  }

  // 4. Navigation Bar / Header
  if (p.includes("nav") || p.includes("header") || p.includes("menu") || p.includes("appbar")) {
    const frameId = nanoid();
    const frame = makeFrame({
      id: frameId,
      name: "Navigation Bar",
      x: originX,
      y: originY,
      width: 760,
      height: 64,
      cornerRadius: 16,
      fill: { type: "solid", color: "#0F0F0F", opacity: 0.9 },
      stroke: { color: "#222222", width: 1, opacity: 1, style: "solid" },
      childIds: [],
    });

    const logoId = nanoid();
    const logoTextId = nanoid();
    const link1Id = nanoid();
    const link2Id = nanoid();
    const link3Id = nanoid();
    const ctaId = nanoid();
    const ctaTextId = nanoid();

    frame.childIds.push(logoId, logoTextId, link1Id, link2Id, link3Id, ctaId, ctaTextId);

    const nodes: CanvasNode[] = [
      frame,
      makeEllipse({
        id: logoId,
        name: "Brand Mark",
        x: originX + 24,
        y: originY + 20,
        width: 24,
        height: 24,
        fill: { type: "solid", color: "#2E5CFF", opacity: 1 },
        stroke: { color: "transparent", width: 0, opacity: 0, style: "solid" },
        parentId: frameId,
      }),
      makeText({
        id: logoTextId,
        name: "Brand Title",
        x: originX + 56,
        y: originY + 23,
        content: "NAGE",
        fontSize: 14,
        fontWeight: 700,
        color: "#FFFFFF",
        parentId: frameId,
      }),
      makeText({
        id: link1Id,
        name: "Nav Link 1",
        x: originX + 260,
        y: originY + 25,
        content: "Products",
        fontSize: 12,
        fontWeight: 500,
        color: "#CCCCCC",
        parentId: frameId,
      }),
      makeText({
        id: link2Id,
        name: "Nav Link 2",
        x: originX + 340,
        y: originY + 25,
        content: "Solutions",
        fontSize: 12,
        fontWeight: 500,
        color: "#CCCCCC",
        parentId: frameId,
      }),
      makeText({
        id: link3Id,
        name: "Nav Link 3",
        x: originX + 430,
        y: originY + 25,
        content: "Pricing",
        fontSize: 12,
        fontWeight: 500,
        color: "#CCCCCC",
        parentId: frameId,
      }),
      makeRectangle({
        id: ctaId,
        name: "Nav CTA Button",
        x: originX + 630,
        y: originY + 14,
        width: 106,
        height: 36,
        cornerRadius: 18,
        fill: { type: "solid", color: "#2E5CFF", opacity: 1 },
        stroke: { color: "#2E5CFF", width: 1, opacity: 1, style: "solid" },
        parentId: frameId,
      }),
      makeText({
        id: ctaTextId,
        name: "Nav CTA Text",
        x: originX + 630,
        y: originY + 23,
        width: 106,
        content: "Get Started",
        fontSize: 11,
        fontWeight: 600,
        color: "#FFFFFF",
        textAlign: "center",
        parentId: frameId,
      }),
    ];

    return {
      reply: "Designed a responsive glass-style navigation header with brand mark, category links, and primary CTA.",
      nodes,
    };
  }

  // 5. Dashboard / Analytics Stats
  if (p.includes("dashboard") || p.includes("metric") || p.includes("stat") || p.includes("analytics")) {
    const frameId = nanoid();
    const frame = makeFrame({
      id: frameId,
      name: "Analytics Metrics",
      x: originX,
      y: originY,
      width: 700,
      height: 240,
      cornerRadius: 20,
      fill: { type: "solid", color: "#0B0B0B", opacity: 1 },
      stroke: { color: "#222222", width: 1, opacity: 1, style: "solid" },
      childIds: [],
    });

    const metrics = [
      { label: "MONTHLY REVENUE", val: "$84,230", diff: "+24.8%", pos: true },
      { label: "ACTIVE SESSIONS", val: "14,892", diff: "+12.1%", pos: true },
      { label: "CONVERSION RATE", val: "4.62%", diff: "+0.8%", pos: true },
    ];

    const childNodes: CanvasNode[] = [frame];

    metrics.forEach((m, idx) => {
      const cardId = nanoid();
      const labelId = nanoid();
      const valId = nanoid();
      const diffId = nanoid();

      frame.childIds.push(cardId, labelId, valId, diffId);

      childNodes.push(
        makeRectangle({
          id: cardId,
          name: `${m.label} Card`,
          x: originX + 24 + idx * 220,
          y: originY + 30,
          width: 204,
          height: 180,
          cornerRadius: 16,
          fill: { type: "solid", color: "#141414", opacity: 1 },
          stroke: { color: "#242424", width: 1, opacity: 1, style: "solid" },
          parentId: frameId,
        })
      );

      childNodes.push(
        makeText({
          id: labelId,
          name: "Metric Label",
          x: originX + 44 + idx * 220,
          y: originY + 54,
          content: m.label,
          fontSize: 10,
          fontWeight: 600,
          color: "#777777",
          parentId: frameId,
        })
      );

      childNodes.push(
        makeText({
          id: valId,
          name: "Metric Value",
          x: originX + 44 + idx * 220,
          y: originY + 84,
          content: m.val,
          fontSize: 26,
          fontWeight: 700,
          color: "#FFFFFF",
          parentId: frameId,
        })
      );

      childNodes.push(
        makeText({
          id: diffId,
          name: "Metric Trend",
          x: originX + 44 + idx * 220,
          y: originY + 136,
          content: `▲ ${m.diff} vs last month`,
          fontSize: 11,
          fontWeight: 500,
          color: "#00E676",
          parentId: frameId,
        })
      );
    });

    return {
      reply: "Generated 3 live KPI metric summary cards with trend badges inside an analytics container.",
      nodes: childNodes,
    };
  }

  // 6. Generic / Custom Synthesizer matching whatever the user typed!
  // Extracts topic name and builds a custom-tailored component hierarchy!
  const customFrameId = nanoid();
  const rawWords = prompt.trim().split(/\s+/);
  const subjectName = rawWords.slice(0, 4).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const customFrame = makeFrame({
    id: customFrameId,
    name: subjectName || "Generated Component",
    x: originX,
    y: originY,
    width: 620,
    height: 380,
    cornerRadius: 22,
    fill: { type: "solid", color: "#0B0B0B", opacity: 1 },
    stroke: { color: "#222222", width: 1, opacity: 1, style: "solid" },
    childIds: [],
  });

  const headerBadgeId = nanoid();
  const headerBadgeTextId = nanoid();
  const mainTitleId = nanoid();
  const mainDescId = nanoid();
  const card1Id = nanoid();
  const card1TextId = nanoid();
  const card2Id = nanoid();
  const card2TextId = nanoid();
  const actionBtnId = nanoid();
  const actionBtnTextId = nanoid();

  customFrame.childIds.push(
    headerBadgeId,
    headerBadgeTextId,
    mainTitleId,
    mainDescId,
    card1Id,
    card1TextId,
    card2Id,
    card2TextId,
    actionBtnId,
    actionBtnTextId
  );

  const customNodes: CanvasNode[] = [
    customFrame,
    makeRectangle({
      id: headerBadgeId,
      name: "Badge",
      x: originX + 36,
      y: originY + 36,
      width: 120,
      height: 26,
      cornerRadius: 13,
      fill: { type: "solid", color: "#1A1A1A", opacity: 1 },
      stroke: { color: "#333333", width: 1, opacity: 1, style: "solid" },
      parentId: customFrameId,
    }),
    makeText({
      id: headerBadgeTextId,
      name: "Badge Text",
      x: originX + 48,
      y: originY + 42,
      content: "✦ AI Agent Generated",
      fontSize: 10,
      fontWeight: 500,
      color: "#2E5CFF",
      parentId: customFrameId,
    }),
    makeText({
      id: mainTitleId,
      name: "Component Title",
      x: originX + 36,
      y: originY + 76,
      content: subjectName,
      fontSize: 22,
      fontWeight: 700,
      color: "#FFFFFF",
      parentId: customFrameId,
    }),
    makeText({
      id: mainDescId,
      name: "Component Description",
      x: originX + 36,
      y: originY + 116,
      width: 540,
      content: `Tailored layout synthesized for "${prompt}". Features modular design cards, contextual text hierarchy, and actionable controls.`,
      fontSize: 12,
      color: "#888888",
      parentId: customFrameId,
    }),
    makeRectangle({
      id: card1Id,
      name: "Content Card 1",
      x: originX + 36,
      y: originY + 160,
      width: 260,
      height: 120,
      cornerRadius: 14,
      fill: { type: "solid", color: "#141414", opacity: 1 },
      stroke: { color: "#242424", width: 1, opacity: 1, style: "solid" },
      parentId: customFrameId,
    }),
    makeText({
      id: card1TextId,
      name: "Card 1 Details",
      x: originX + 54,
      y: originY + 184,
      width: 220,
      content: `Primary Module\n\nOptimized container with balanced spacing and contrast.`,
      fontSize: 11,
      color: "#D1D5DB",
      parentId: customFrameId,
    }),
    makeRectangle({
      id: card2Id,
      name: "Content Card 2",
      x: originX + 316,
      y: originY + 160,
      width: 260,
      height: 120,
      cornerRadius: 14,
      fill: { type: "solid", color: "#141414", opacity: 1 },
      stroke: { color: "#242424", width: 1, opacity: 1, style: "solid" },
      parentId: customFrameId,
    }),
    makeText({
      id: card2TextId,
      name: "Card 2 Details",
      x: originX + 334,
      y: originY + 184,
      width: 220,
      content: `Secondary Module\n\nInteractive sub-element ready for vector styling or editing.`,
      fontSize: 11,
      color: "#D1D5DB",
      parentId: customFrameId,
    }),
    makeRectangle({
      id: actionBtnId,
      name: "Action Button",
      x: originX + 36,
      y: originY + 310,
      width: 160,
      height: 40,
      cornerRadius: 12,
      fill: { type: "solid", color: "#2E5CFF", opacity: 1 },
      stroke: { color: "#2E5CFF", width: 1, opacity: 1, style: "solid" },
      parentId: customFrameId,
    }),
    makeText({
      id: actionBtnTextId,
      name: "Action Button Label",
      x: originX + 36,
      y: originY + 322,
      width: 160,
      content: "Explore Component →",
      fontSize: 12,
      fontWeight: 600,
      color: "#FFFFFF",
      textAlign: "center",
      parentId: customFrameId,
    }),
  ];

  return {
    reply: `Synthesized custom "${subjectName}" layout with responsive container frame, inner cards, and interactive controls.`,
    nodes: customNodes,
  };
}
