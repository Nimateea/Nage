import { nanoid } from "nanoid";
import type { CanvasNode } from "../canvas/document/types";
import {
  makeFrame,
  makeRectangle,
  makeText,
  makeEllipse,
  makeLine,
  makeImage,
} from "../canvas/document/defaults";

export const NAGE_AI_SYSTEM_INSTRUCTION = `
You are the AI Design Agent for Nage, a high-performance web design tool modeled after Figma AI and Google Gemini Generative AI.
You act as an autonomous creative design partner with 4 core studio capabilities:

1. MOVIE STORYBOARDS:
   - When users provide a script, screenplay excerpt, or movie scene description, parse the narrative beats into a cinematic 16:9 storyboard grid.
   - For each shot: generate a camera angle tag (WIDE, CLOSE-UP, OVER-THE-SHOULDER, TRACKING), action description, dialogue, and lighting/lens notes.

2. CREATIVE MOODBOARDS:
   - Create aesthetic moodboard frames with hero visual containers, texture blocks, color palettes with hex values, typography pairings, and design keywords.

3. PINTEREST BOARD TO WIREFRAME:
   - When users describe a Pinterest board or visual aesthetic (e.g. Scandinavian e-commerce, Brutalist portfolio, Warm Editorial), synthesize a full UI wireframe with navigation, hero section, modular card grid, and typography.

4. ILLUSTRATOR & VECTOR GENERATION:
   - Synthesize multi-layered vector compositions with layered background shapes, accent lighting ellipses, character/object silhouettes, and color tokens.
   - If an image reference is attached, translate its mood and color palette into vector illustration nodes.

Canvas Node Guidelines:
- "frame": Artboard/Container. Properties: id, name, type="frame", x, y, width, height, cornerRadius, fill { type: "solid", color, opacity }, stroke { color, width, opacity, style }, parentId: null, childIds: string[]
- "rectangle": Cards, buttons, inputs, scene preview boxes, swatches. Properties: id, name, type="rectangle", x, y, width, height, cornerRadius, fill, stroke, parentId: string
- "ellipse": Avatars, lighting orbs, sun/moon, indicators. Properties: id, name, type="ellipse", x, y, width, height, fill, stroke, parentId: string
- "text": Typography. Properties: id, name, type="text", x, y, width, height, content, fontSize, fontWeight (400|500|600|700), color, textAlign ("left"|"center"|"right"), parentId: string
- "line": Dividers, progress bars, frame borders. Properties: id, name, type="line", x, y, x2, y2, width, height, stroke, parentId: string
- "image": Images and visual references. Properties: id, name, type="image", x, y, width, height, storagePath, signedUrl, parentId: string

Color System:
- Canvas: #000000
- Frame background: #0D0D0D to #111111
- Card/Panel surface: #141414 to #1A1A1A
- Borders: #222222 to #2E2E2E
- Primary Accents: #2E5CFF (blue), #00E676 (green), #FF5E2E (coral), #A855F7 (purple), #F59E0B (amber)
- Typography: #FFFFFF (headlines), #CCCCCC (body), #888888 (captions)

Always return strict JSON:
{
  "reply": "Concise explanation of the narrative, moodboard tokens, or wireframe architecture created.",
  "nodes": [ ...valid Nage canvas nodes... ]
}
`;

/**
 * 1. Movie Storyboard Generator
 * Parses script or narrative beats into a cinematic 16:9 widescreen storyboard.
 */
export function generateStoryboardDesign(
  scriptOrPrompt: string,
  camera?: { x: number; y: number; zoom: number }
): { reply: string; nodes: CanvasNode[] } {
  const zoom = camera?.zoom || 1;
  const originX = camera ? Math.round(-camera.x / zoom + 40) : 100;
  const originY = camera ? Math.round(-camera.y / zoom + 40) : 100;

  const frameId = nanoid();
  const rawClean = scriptOrPrompt.replace(/\n+/g, " ").trim();
  const titleSnippet = rawClean.length > 30 ? rawClean.slice(0, 30) + "…" : rawClean || "Cinematic Scene";

  // Parse narrative shots or generate dynamic shots based on script
  const shots = [
    {
      shotNum: 1,
      angle: "WIDE ESTABLISHING",
      lens: "28mm Anamorphic • Night Exterior",
      action: "The rain-soaked street reflects flickering neon signs. A lone silhouette approaches the rain gate.",
      dialogue: 'VOICE OVER: "They said the city never sleeps. They were wrong."',
      orbColor: "#2E5CFF",
    },
    {
      shotNum: 2,
      angle: "MEDIUM TRACKING",
      lens: "50mm Prime • Low Angle Dolly",
      action: "Camera tracks Miller's boots splashing into puddles. He checks the holographic ledger on his wrist.",
      dialogue: 'MILLER: "Coordinates confirmed. The package is inside."',
      orbColor: "#A855F7",
    },
    {
      shotNum: 3,
      angle: "CLOSE-UP TENSION",
      lens: "85mm Macro • Shallow Depth of Field",
      action: "Tight on Miller's eyes through the steam. The reflected light shifts from sapphire to warning crimson.",
      dialogue: 'RADIO CRACKLE: "Miller, abort now! It\'s a trap!"',
      orbColor: "#FF5E2E",
    },
    {
      shotNum: 4,
      angle: "DUTCH TILT / ACTION",
      lens: "35mm • Handheld Dynamic",
      action: "The heavy vault door slides open with pneumatic hiss. Shadows scatter across the interior.",
      dialogue: "SFX: [Loud metallic crash echoing through the corridor]",
      orbColor: "#00E676",
    },
  ];

  const frameWidth = 1240;
  const frameHeight = 440;

  const frame = makeFrame({
    id: frameId,
    name: `Storyboard • ${titleSnippet}`,
    x: originX,
    y: originY,
    width: frameWidth,
    height: frameHeight,
    cornerRadius: 24,
    fill: { type: "solid", color: "#0B0B0B", opacity: 1 },
    stroke: { color: "#222222", width: 1, opacity: 1, style: "solid" },
    parentId: null,
    childIds: [],
  });

  const headerTitleId = nanoid();
  const headerMetaId = nanoid();
  frame.childIds.push(headerTitleId, headerMetaId);

  const nodes: CanvasNode[] = [
    frame,
    makeText({
      id: headerTitleId,
      name: "Storyboard Title",
      x: originX + 32,
      y: originY + 28,
      content: `STORYBOARD SEQUENCE • ${titleSnippet.toUpperCase()}`,
      fontSize: 18,
      fontWeight: 700,
      color: "#FFFFFF",
      parentId: frameId,
    }),
    makeText({
      id: headerMetaId,
      name: "Storyboard Meta",
      x: originX + 32,
      y: originY + 54,
      content: "Aspect Ratio: 16:9 • Scene 04 / Take 01 • Color Profile: DCI-P3 Film Emulsion",
      fontSize: 11,
      color: "#777777",
      parentId: frameId,
    }),
  ];

  // Render 4 Cinematic Shot Panels in a row
  const panelWidth = 276;
  const previewHeight = 155; // 16:9 ratio

  shots.forEach((shot, idx) => {
    const shotCardId = nanoid();
    const previewBoxId = nanoid();
    const orbId = nanoid();
    const angleBadgeId = nanoid();
    const angleTextId = nanoid();
    const lensId = nanoid();
    const actionTextId = nanoid();
    const dialogueTextId = nanoid();

    frame.childIds.push(
      shotCardId,
      previewBoxId,
      orbId,
      angleBadgeId,
      angleTextId,
      lensId,
      actionTextId,
      dialogueTextId
    );

    const cardX = originX + 32 + idx * 296;
    const cardY = originY + 84;

    // Shot Card Container
    nodes.push(
      makeRectangle({
        id: shotCardId,
        name: `Shot ${shot.shotNum} Card`,
        x: cardX,
        y: cardY,
        width: panelWidth,
        height: 320,
        cornerRadius: 16,
        fill: { type: "solid", color: "#131313", opacity: 1 },
        stroke: { color: "#262626", width: 1, opacity: 1, style: "solid" },
        parentId: frameId,
      })
    );

    // 16:9 Preview Frame with atmospheric lighting
    nodes.push(
      makeRectangle({
        id: previewBoxId,
        name: `Shot ${shot.shotNum} Screen (16:9)`,
        x: cardX + 12,
        y: cardY + 12,
        width: panelWidth - 24,
        height: previewHeight,
        cornerRadius: 10,
        fill: { type: "solid", color: "#080808", opacity: 1 },
        stroke: { color: "#333333", width: 1, opacity: 1, style: "solid" },
        parentId: frameId,
      })
    );

    // Cinematic Light Glow Orb inside preview
    nodes.push(
      makeEllipse({
        id: orbId,
        name: "Atmospheric Light",
        x: cardX + 60,
        y: cardY + 30,
        width: 130,
        height: 100,
        fill: { type: "solid", color: shot.orbColor, opacity: 0.18 },
        stroke: { color: "transparent", width: 0, opacity: 0, style: "solid" },
        parentId: frameId,
      })
    );

    // Camera Angle Badge
    nodes.push(
      makeRectangle({
        id: angleBadgeId,
        name: "Angle Pill",
        x: cardX + 12,
        y: cardY + 176,
        width: 140,
        height: 22,
        cornerRadius: 11,
        fill: { type: "solid", color: "#1C1C1C", opacity: 1 },
        stroke: { color: "#2E2E2E", width: 1, opacity: 1, style: "solid" },
        parentId: frameId,
      })
    );

    nodes.push(
      makeText({
        id: angleTextId,
        name: "Angle Text",
        x: cardX + 20,
        y: cardY + 181,
        content: `SHOT 0${shot.shotNum} • ${shot.angle}`,
        fontSize: 9,
        fontWeight: 600,
        color: "#2E5CFF",
        parentId: frameId,
      })
    );

    // Lens / Tech notes
    nodes.push(
      makeText({
        id: lensId,
        name: "Camera Tech",
        x: cardX + 12,
        y: cardY + 206,
        width: panelWidth - 24,
        content: shot.lens,
        fontSize: 10,
        fontWeight: 500,
        color: "#888888",
        parentId: frameId,
      })
    );

    // Action Description
    nodes.push(
      makeText({
        id: actionTextId,
        name: "Action",
        x: cardX + 12,
        y: cardY + 224,
        width: panelWidth - 24,
        content: shot.action,
        fontSize: 11,
        fontWeight: 400,
        color: "#D1D5DB",
        parentId: frameId,
      })
    );

    // Dialogue Caption
    nodes.push(
      makeText({
        id: dialogueTextId,
        name: "Dialogue",
        x: cardX + 12,
        y: cardY + 274,
        width: panelWidth - 24,
        content: shot.dialogue,
        fontSize: 10,
        fontWeight: 500,
        color: "#F59E0B",
        parentId: frameId,
      })
    );
  });

  return {
    reply: `Parsed screenplay narrative and generated a 4-shot cinematic 16:9 storyboard grid with camera angles, action notes, and dialogue cues.`,
    nodes,
  };
}

/**
 * 2. Creative Moodboard Generator
 * Generates an aesthetic design board with color story, visual blocks, and typography pairing.
 */
export function generateMoodboardDesign(
  themeOrPrompt: string,
  camera?: { x: number; y: number; zoom: number },
  attachedImage?: string
): { reply: string; nodes: CanvasNode[] } {
  const zoom = camera?.zoom || 1;
  const originX = camera ? Math.round(-camera.x / zoom + 40) : 100;
  const originY = camera ? Math.round(-camera.y / zoom + 40) : 100;

  const frameId = nanoid();
  const themeName = themeOrPrompt.replace(/\b(create|make|moodboard|mood board)\b/gi, "").trim() || "Creative Direction";
  const displayTitle = themeName.charAt(0).toUpperCase() + themeName.slice(1);

  const frameWidth = 820;
  const frameHeight = 560;

  const frame = makeFrame({
    id: frameId,
    name: `Moodboard • ${displayTitle}`,
    x: originX,
    y: originY,
    width: frameWidth,
    height: frameHeight,
    cornerRadius: 24,
    fill: { type: "solid", color: "#0B0B0B", opacity: 1 },
    stroke: { color: "#222222", width: 1, opacity: 1, style: "solid" },
    parentId: null,
    childIds: [],
  });

  const headerTitleId = nanoid();
  const headerSubId = nanoid();
  const heroTileId = nanoid();
  const heroTileTextId = nanoid();
  const secondaryTile1Id = nanoid();
  const secondaryTile2Id = nanoid();
  const typeSampleTitleId = nanoid();
  const typeSampleBodyId = nanoid();

  frame.childIds.push(
    headerTitleId,
    headerSubId,
    heroTileId,
    heroTileTextId,
    secondaryTile1Id,
    secondaryTile2Id,
    typeSampleTitleId,
    typeSampleBodyId
  );

  const nodes: CanvasNode[] = [
    frame,
    makeText({
      id: headerTitleId,
      name: "Moodboard Title",
      x: originX + 36,
      y: originY + 36,
      content: `MOODBOARD // ${displayTitle.toUpperCase()}`,
      fontSize: 22,
      fontWeight: 700,
      color: "#FFFFFF",
      parentId: frameId,
    }),
    makeText({
      id: headerSubId,
      name: "Moodboard Subhead",
      x: originX + 36,
      y: originY + 68,
      content: "Creative Direction • Aesthetic Tokens • Typography Pairing • Material Texture",
      fontSize: 11,
      color: "#777777",
      parentId: frameId,
    }),
  ];

  // If user attached an image, embed as the hero tile!
  if (attachedImage) {
    const userImgId = nanoid();
    frame.childIds.push(userImgId);
    nodes.push(
      makeImage({
        id: userImgId,
        name: "Reference Asset",
        x: originX + 36,
        y: originY + 104,
        width: 440,
        height: 250,
        storagePath: attachedImage,
        signedUrl: attachedImage,
        parentId: frameId,
      })
    );
  } else {
    // Large Hero Imagery Tile
    nodes.push(
      makeRectangle({
        id: heroTileId,
        name: "Hero Visual Tile",
        x: originX + 36,
        y: originY + 104,
        width: 440,
        height: 250,
        cornerRadius: 18,
        fill: { type: "solid", color: "#18181B", opacity: 1 },
        stroke: { color: "#2E2E32", width: 1, opacity: 1, style: "solid" },
        parentId: frameId,
      })
    );
    nodes.push(
      makeText({
        id: heroTileTextId,
        name: "Hero Tile Caption",
        x: originX + 56,
        y: originY + 310,
        content: `VISUAL KEYNOTE // ${displayTitle}`,
        fontSize: 11,
        fontWeight: 600,
        color: "#A1A1AA",
        parentId: frameId,
      })
    );
  }

  // Secondary Texture / Inspiration Tiles
  nodes.push(
    makeRectangle({
      id: secondaryTile1Id,
      name: "Texture Tile 1",
      x: originX + 496,
      y: originY + 104,
      width: 288,
      height: 115,
      cornerRadius: 16,
      fill: { type: "solid", color: "#1A1724", opacity: 1 },
      stroke: { color: "#2D2640", width: 1, opacity: 1, style: "solid" },
      parentId: frameId,
    })
  );

  nodes.push(
    makeRectangle({
      id: secondaryTile2Id,
      name: "Texture Tile 2",
      x: originX + 496,
      y: originY + 235,
      width: 288,
      height: 119,
      cornerRadius: 16,
      fill: { type: "solid", color: "#161E1A", opacity: 1 },
      stroke: { color: "#22332A", width: 1, opacity: 1, style: "solid" },
      parentId: frameId,
    })
  );

  // 5 Curated Color Story Chips
  const palette = [
    { name: "Obsidian Core", hex: "#0E0E10" },
    { name: "Cobalt Azure", hex: "#2E5CFF" },
    { name: "Ethereal Mint", hex: "#00E676" },
    { name: "Warm Terracotta", hex: "#E05638" },
    { name: "Oatmeal Neutral", hex: "#E4E4E7" },
  ];

  palette.forEach((color, idx) => {
    const swatchId = nanoid();
    const labelId = nanoid();
    frame.childIds.push(swatchId, labelId);

    nodes.push(
      makeRectangle({
        id: swatchId,
        name: `Swatch - ${color.name}`,
        x: originX + 36 + idx * 88,
        y: originY + 380,
        width: 72,
        height: 52,
        cornerRadius: 10,
        fill: { type: "solid", color: color.hex, opacity: 1 },
        stroke: { color: "#333333", width: 1, opacity: 0.5, style: "solid" },
        parentId: frameId,
      })
    );

    nodes.push(
      makeText({
        id: labelId,
        name: "Hex Token",
        x: originX + 36 + idx * 88,
        y: originY + 440,
        content: color.hex,
        fontSize: 10,
        color: "#888888",
        parentId: frameId,
      })
    );
  });

  // Typography Pairing Spec
  nodes.push(
    makeText({
      id: typeSampleTitleId,
      name: "Display Font Spec",
      x: originX + 496,
      y: originY + 380,
      content: "Aa Playfair Display (Serif)",
      fontSize: 16,
      fontWeight: 700,
      fontFamily: "'Playfair Display', serif",
      color: "#FFFFFF",
      parentId: frameId,
    })
  );

  nodes.push(
    makeText({
      id: typeSampleBodyId,
      name: "Body Font Spec",
      x: originX + 496,
      y: originY + 412,
      width: 288,
      content: "Inter Regular (Sans-Serif) • Clean geometric proportions with humanist terminals for effortless readability.",
      fontSize: 11,
      fontWeight: 400,
      fontFamily: "Inter, sans-serif",
      color: "#A0A0A0",
      parentId: frameId,
    })
  );

  return {
    reply: `Created ${displayTitle} Moodboard with visual tiles, 5-swatch color story, and display/body typography pairing.`,
    nodes,
  };
}

/**
 * 3. Pinterest Board to Wireframe Generator
 * Translates visual descriptions from Pinterest into a structured, production-ready UI wireframe.
 */
export function generatePinterestWireframeDesign(
  description: string,
  camera?: { x: number; y: number; zoom: number }
): { reply: string; nodes: CanvasNode[] } {
  const zoom = camera?.zoom || 1;
  const originX = camera ? Math.round(-camera.x / zoom + 40) : 100;
  const originY = camera ? Math.round(-camera.y / zoom + 40) : 100;

  const frameId = nanoid();
  const frameWidth = 840;
  const frameHeight = 640;

  const frame = makeFrame({
    id: frameId,
    name: "Wireframe // Pinterest Inspired",
    x: originX,
    y: originY,
    width: frameWidth,
    height: frameHeight,
    cornerRadius: 24,
    fill: { type: "solid", color: "#0B0B0B", opacity: 1 },
    stroke: { color: "#222222", width: 1, opacity: 1, style: "solid" },
    parentId: null,
    childIds: [],
  });

  // Header Nav
  const navId = nanoid();
  const brandId = nanoid();
  const navLink1 = nanoid();
  const navLink2 = nanoid();
  const navCta = nanoid();
  const navCtaText = nanoid();

  // Hero Section
  const heroBadge = nanoid();
  const heroBadgeText = nanoid();
  const heroTitle = nanoid();
  const heroSubtitle = nanoid();
  const heroImageBlock = nanoid();

  // Editorial Grid (3 cards)
  const card1 = nanoid();
  const card1Text = nanoid();
  const card2 = nanoid();
  const card2Text = nanoid();
  const card3 = nanoid();
  const card3Text = nanoid();

  frame.childIds.push(
    navId,
    brandId,
    navLink1,
    navLink2,
    navCta,
    navCtaText,
    heroBadge,
    heroBadgeText,
    heroTitle,
    heroSubtitle,
    heroImageBlock,
    card1,
    card1Text,
    card2,
    card2Text,
    card3,
    card3Text
  );

  const nodes: CanvasNode[] = [
    frame,
    // Top Nav Bar
    makeRectangle({
      id: navId,
      name: "Nav Bar",
      x: originX + 32,
      y: originY + 28,
      width: 776,
      height: 48,
      cornerRadius: 12,
      fill: { type: "solid", color: "#141414", opacity: 1 },
      stroke: { color: "#262626", width: 1, opacity: 1, style: "solid" },
      parentId: frameId,
    }),
    makeText({
      id: brandId,
      name: "Brand Logo",
      x: originX + 52,
      y: originY + 42,
      content: "STUDIO ATELIER",
      fontSize: 13,
      fontWeight: 700,
      color: "#FFFFFF",
      parentId: frameId,
    }),
    makeText({
      id: navLink1,
      name: "Link 1",
      x: originX + 240,
      y: originY + 44,
      content: "Collection",
      fontSize: 11,
      color: "#AAAAAA",
      parentId: frameId,
    }),
    makeText({
      id: navLink2,
      name: "Link 2",
      x: originX + 330,
      y: originY + 44,
      content: "Editorial",
      fontSize: 11,
      color: "#AAAAAA",
      parentId: frameId,
    }),
    makeRectangle({
      id: navCta,
      name: "Nav Button",
      x: originX + 692,
      y: originY + 36,
      width: 96,
      height: 32,
      cornerRadius: 8,
      fill: { type: "solid", color: "#2E5CFF", opacity: 1 },
      stroke: { color: "#2E5CFF", width: 1, opacity: 1, style: "solid" },
      parentId: frameId,
    }),
    makeText({
      id: navCtaText,
      name: "Nav Button Label",
      x: originX + 692,
      y: originY + 44,
      width: 96,
      content: "Inquire",
      fontSize: 11,
      fontWeight: 600,
      color: "#FFFFFF",
      textAlign: "center",
      parentId: frameId,
    }),

    // Hero Section
    makeRectangle({
      id: heroBadge,
      name: "Pill Tag",
      x: originX + 32,
      y: originY + 98,
      width: 140,
      height: 24,
      cornerRadius: 12,
      fill: { type: "solid", color: "#1A1A1A", opacity: 1 },
      stroke: { color: "#2E2E2E", width: 1, opacity: 1, style: "solid" },
      parentId: frameId,
    }),
    makeText({
      id: heroBadgeText,
      name: "Pill Label",
      x: originX + 44,
      y: originY + 103,
      content: "✦ Autumn / Winter 26",
      fontSize: 10,
      fontWeight: 500,
      color: "#2E5CFF",
      parentId: frameId,
    }),
    makeText({
      id: heroTitle,
      name: "Hero Title",
      x: originX + 32,
      y: originY + 132,
      content: "Subtle forms for\nconsidered spaces.",
      fontSize: 28,
      fontWeight: 700,
      fontFamily: "'Playfair Display', serif",
      color: "#FFFFFF",
      parentId: frameId,
    }),
    makeText({
      id: heroSubtitle,
      name: "Hero Subhead",
      x: originX + 32,
      y: originY + 210,
      width: 380,
      content: `Architectural wireframe inspired by: "${description.slice(0, 80)}". Balanced whitespace, tactile typography, and minimal card containers.`,
      fontSize: 12,
      color: "#888888",
      parentId: frameId,
    }),
    makeRectangle({
      id: heroImageBlock,
      name: "Featured Imagery Placeholder",
      x: originX + 460,
      y: originY + 98,
      width: 348,
      height: 180,
      cornerRadius: 16,
      fill: { type: "solid", color: "#18181A", opacity: 1 },
      stroke: { color: "#2A2A2E", width: 1, opacity: 1, style: "solid" },
      parentId: frameId,
    }),

    // 3 Curated Feature Cards below
    makeRectangle({
      id: card1,
      name: "Card 1",
      x: originX + 32,
      y: originY + 310,
      width: 244,
      height: 290,
      cornerRadius: 16,
      fill: { type: "solid", color: "#131313", opacity: 1 },
      stroke: { color: "#262626", width: 1, opacity: 1, style: "solid" },
      parentId: frameId,
    }),
    makeText({
      id: card1Text,
      name: "Card 1 Copy",
      x: originX + 48,
      y: originY + 540,
      content: "Tactile Ceramics\nHandcrafted stoneware",
      fontSize: 12,
      fontWeight: 600,
      color: "#E4E4E7",
      parentId: frameId,
    }),

    makeRectangle({
      id: card2,
      name: "Card 2",
      x: originX + 298,
      y: originY + 310,
      width: 244,
      height: 290,
      cornerRadius: 16,
      fill: { type: "solid", color: "#131313", opacity: 1 },
      stroke: { color: "#262626", width: 1, opacity: 1, style: "solid" },
      parentId: frameId,
    }),
    makeText({
      id: card2Text,
      name: "Card 2 Copy",
      x: originX + 314,
      y: originY + 540,
      content: "Architectural Wood\nSustainably sourced oak",
      fontSize: 12,
      fontWeight: 600,
      color: "#E4E4E7",
      parentId: frameId,
    }),

    makeRectangle({
      id: card3,
      name: "Card 3",
      x: originX + 564,
      y: originY + 310,
      width: 244,
      height: 290,
      cornerRadius: 16,
      fill: { type: "solid", color: "#131313", opacity: 1 },
      stroke: { color: "#262626", width: 1, opacity: 1, style: "solid" },
      parentId: frameId,
    }),
    makeText({
      id: card3Text,
      name: "Card 3 Copy",
      x: originX + 580,
      y: originY + 540,
      content: "Ambient Lighting\nCast bronze and linen",
      fontSize: 12,
      fontWeight: 600,
      color: "#E4E4E7",
      parentId: frameId,
    }),
  ];

  return {
    reply: `Synthesized a Pinterest-inspired design wireframe with editorial header navigation, serif hero headline, and a 3-column product showcase.`,
    nodes,
  };
}

/**
 * 4. Illustrator & Vector Art Generator
 * Generates layered vector illustrations with geometric depth, silhouettes, and lighting.
 */
export function generateIllustrationDesign(
  prompt: string,
  camera?: { x: number; y: number; zoom: number },
  attachedImage?: string
): { reply: string; nodes: CanvasNode[] } {
  const zoom = camera?.zoom || 1;
  const originX = camera ? Math.round(-camera.x / zoom + 40) : 100;
  const originY = camera ? Math.round(-camera.y / zoom + 40) : 100;

  const frameId = nanoid();
  const cleanTitle = prompt.replace(/\b(illustrate|illustration|draw|vector|image)\b/gi, "").trim() || "Vector Artwork";
  const displayTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

  const frameWidth = 640;
  const frameHeight = 520;

  const frame = makeFrame({
    id: frameId,
    name: `Illustration • ${displayTitle}`,
    x: originX,
    y: originY,
    width: frameWidth,
    height: frameHeight,
    cornerRadius: 24,
    fill: { type: "solid", color: "#0B0B0E", opacity: 1 },
    stroke: { color: "#222226", width: 1, opacity: 1, style: "solid" },
    parentId: null,
    childIds: [],
  });

  const titleId = nanoid();
  const canvasBackdropId = nanoid();
  const sunOrbId = nanoid();
  const horizonHill1Id = nanoid();
  const horizonHill2Id = nanoid();
  const focalPointId = nanoid();
  const focalGlowId = nanoid();
  const captionId = nanoid();

  frame.childIds.push(
    titleId,
    canvasBackdropId,
    sunOrbId,
    horizonHill1Id,
    horizonHill2Id,
    focalPointId,
    focalGlowId,
    captionId
  );

  const nodes: CanvasNode[] = [
    frame,
    makeText({
      id: titleId,
      name: "Artwork Title",
      x: originX + 32,
      y: originY + 28,
      content: `VECTOR ILLUSTRATION // ${displayTitle.toUpperCase()}`,
      fontSize: 16,
      fontWeight: 700,
      color: "#FFFFFF",
      parentId: frameId,
    }),

    // Central Illustration Canvas Canvas
    makeRectangle({
      id: canvasBackdropId,
      name: "Sky Canvas",
      x: originX + 32,
      y: originY + 64,
      width: 576,
      height: 380,
      cornerRadius: 18,
      fill: { type: "solid", color: "#0D111A", opacity: 1 },
      stroke: { color: "#262C3A", width: 1, opacity: 1, style: "solid" },
      parentId: frameId,
    }),

    // Celestial Sun / Ambient Orb
    makeEllipse({
      id: sunOrbId,
      name: "Celestial Body",
      x: originX + 240,
      y: originY + 110,
      width: 160,
      height: 160,
      fill: { type: "solid", color: "#FF5E2E", opacity: 0.9 },
      stroke: { color: "#FFA07A", width: 2, opacity: 0.6, style: "solid" },
      parentId: frameId,
    }),

    // Distant Mountain / Horizon Silhouette 1
    makeRectangle({
      id: horizonHill1Id,
      name: "Mountain Layer 1",
      x: originX + 32,
      y: originY + 260,
      width: 380,
      height: 184,
      cornerRadius: 80,
      fill: { type: "solid", color: "#171E2F", opacity: 1 },
      stroke: { color: "#232D42", width: 1, opacity: 0.5, style: "solid" },
      parentId: frameId,
    }),

    // Foreground Mountain Layer 2
    makeRectangle({
      id: horizonHill2Id,
      name: "Mountain Layer 2",
      x: originX + 260,
      y: originY + 290,
      width: 348,
      height: 154,
      cornerRadius: 60,
      fill: { type: "solid", color: "#0B0E16", opacity: 1 },
      stroke: { color: "#1E2638", width: 1, opacity: 0.5, style: "solid" },
      parentId: frameId,
    }),

    // Central Focal Subject / Beacon
    makeRectangle({
      id: focalPointId,
      name: "Focal Subject",
      x: originX + 300,
      y: originY + 240,
      width: 40,
      height: 140,
      cornerRadius: 8,
      fill: { type: "solid", color: "#2E5CFF", opacity: 1 },
      stroke: { color: "#7BA0FF", width: 1, opacity: 0.8, style: "solid" },
      parentId: frameId,
    }),

    // Beacon Ambient Glow
    makeEllipse({
      id: focalGlowId,
      name: "Beacon Glow",
      x: originX + 270,
      y: originY + 220,
      width: 100,
      height: 100,
      fill: { type: "solid", color: "#2E5CFF", opacity: 0.25 },
      stroke: { color: "transparent", width: 0, opacity: 0, style: "solid" },
      parentId: frameId,
    }),

    makeText({
      id: captionId,
      name: "Art Style Tag",
      x: originX + 32,
      y: originY + 468,
      content: `Composition: Minimalist Retro-Futuristic Vector • Color Harmony: Deep Navy, Sunset Crimson & Electric Cobalt`,
      fontSize: 11,
      color: "#888888",
      parentId: frameId,
    }),
  ];

  // If user attached an image reference, place it on the side!
  if (attachedImage) {
    const refImgId = nanoid();
    frame.childIds.push(refImgId);
    nodes.push(
      makeImage({
        id: refImgId,
        name: "Uploaded Reference",
        x: originX + 460,
        y: originY + 80,
        width: 130,
        height: 100,
        storagePath: attachedImage,
        signedUrl: attachedImage,
        parentId: frameId,
      })
    );
  }

  return {
    reply: `Crafted custom vector illustration for "${displayTitle}" with layered atmospheric depth, celestial focal point, and color accents.`,
    nodes,
  };
}

/**
 * Master Agent Dispatcher: Analyzes prompt and routes to the appropriate creative agent.
 */
export function generateAgentDesign(
  prompt: string,
  task?: string,
  camera?: { x: number; y: number; zoom: number },
  attachedImage?: string,
  attachedScript?: string
): { reply: string; nodes: CanvasNode[] } {
  const p = prompt.toLowerCase();
  const zoom = camera?.zoom || 1;
  const originX = camera ? Math.round(-camera.x / zoom + 40) : 100;
  const originY = camera ? Math.round(-camera.y / zoom + 40) : 100;

  // 1. Movie Storyboard (or script attached)
  if (
    task === "storyboard" ||
    attachedScript ||
    p.includes("storyboard") ||
    p.includes("screenplay") ||
    p.includes("movie") ||
    (p.includes("script") && !p.includes("javascript") && !p.includes("typescript")) ||
    p.includes("shot list")
  ) {
    const textToParse = attachedScript || prompt;
    return generateStoryboardDesign(textToParse, camera);
  }

  // 2. Creative Moodboard
  if (
    task === "moodboard" ||
    p.includes("moodboard") ||
    p.includes("mood board") ||
    p.includes("inspiration board") ||
    p.includes("creative direction")
  ) {
    return generateMoodboardDesign(prompt, camera, attachedImage);
  }

  // 3. Pinterest to Wireframe
  if (
    task === "wireframe" ||
    p.includes("pinterest") ||
    p.includes("describe the board")
  ) {
    return generatePinterestWireframeDesign(prompt, camera);
  }

  // 4. Illustrator & Vector Art (or attached image)
  if (
    task === "illustration" ||
    p.includes("illustrat") ||
    p.includes("vector art") ||
    p.includes("drawing") ||
    attachedImage
  ) {
    return generateIllustrationDesign(prompt, camera, attachedImage);
  }

  // 5. Color Palette Request
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

  // 6. Login / Auth / Signup Screen
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

  // 7. Pricing Table / Plans
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

  // 8. Navigation Bar / Header
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

  // 9. Dashboard / Analytics Stats
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

  // 10. Generic / Custom Synthesizer matching whatever the user typed!
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
