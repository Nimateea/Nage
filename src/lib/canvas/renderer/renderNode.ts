import type {
  CanvasNode,
  RectangleNode,
  EllipseNode,
  LineNode,
  TextNode,
  FrameNode,
  ImageNode,
  Fill,
  Stroke,
} from "../document/types";

// In-memory cache for HTMLImageElements loaded from signed URLs
const imageCache = new Map<string, HTMLImageElement>();

export function getCachedImage(src: string, onLoaded?: () => void): HTMLImageElement | null {
  if (imageCache.has(src)) {
    const img = imageCache.get(src)!;
    if (img.complete && img.naturalWidth > 0) return img;
    return null;
  }

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  img.onload = () => {
    imageCache.set(src, img);
    if (onLoaded) onLoaded();
  };
  imageCache.set(src, img);
  return null;
}

export function applyFill(ctx: CanvasRenderingContext2D, fill: Fill) {
  if (fill.type === "none") {
    ctx.fillStyle = "transparent";
  } else if (fill.type === "solid") {
    ctx.fillStyle = fill.color;
    ctx.globalAlpha *= fill.opacity ?? 1;
  }
}

export function applyStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.width <= 0) return false;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.globalAlpha *= stroke.opacity ?? 1;

  if (stroke.style === "dashed") {
    ctx.setLineDash([stroke.width * 3, stroke.width * 2]);
  } else if (stroke.style === "dotted") {
    ctx.setLineDash([stroke.width, stroke.width * 1.5]);
  } else {
    ctx.setLineDash([]);
  }
  return true;
}

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  const r = Math.min(radius, Math.min(w / 2, h / 2));
  if (r <= 0) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function renderRectangle(ctx: CanvasRenderingContext2D, node: RectangleNode) {
  drawRoundedRect(ctx, 0, 0, node.width, node.height, node.cornerRadius);
  if (node.fill.type !== "none") {
    ctx.save();
    applyFill(ctx, node.fill);
    ctx.fill();
    ctx.restore();
  }
  if (node.stroke.width > 0) {
    ctx.save();
    if (applyStroke(ctx, node.stroke)) ctx.stroke();
    ctx.restore();
  }
}

export function renderEllipse(ctx: CanvasRenderingContext2D, node: EllipseNode) {
  ctx.beginPath();
  ctx.ellipse(
    node.width / 2,
    node.height / 2,
    Math.max(0, node.width / 2),
    Math.max(0, node.height / 2),
    0,
    0,
    2 * Math.PI
  );
  if (node.fill.type !== "none") {
    ctx.save();
    applyFill(ctx, node.fill);
    ctx.fill();
    ctx.restore();
  }
  if (node.stroke.width > 0) {
    ctx.save();
    if (applyStroke(ctx, node.stroke)) ctx.stroke();
    ctx.restore();
  }
}

export function renderLine(ctx: CanvasRenderingContext2D, node: LineNode) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(node.x2 - node.x, node.y2 - node.y);
  ctx.save();
  if (applyStroke(ctx, node.stroke)) ctx.stroke();
  ctx.restore();
}

export function renderText(ctx: CanvasRenderingContext2D, node: TextNode) {
  const fontFam = node.fontFamily || "Inter, -apple-system, sans-serif";
  const weight = node.fontWeight || 400;
  ctx.font = `${weight} ${node.fontSize}px ${fontFam}`;
  ctx.fillStyle = node.color;
  ctx.textAlign = node.textAlign === "justify" ? "left" : (node.textAlign || "left");
  ctx.textBaseline = "top";

  if (node.letterSpacing && "letterSpacing" in ctx) {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${node.letterSpacing}px`;
  }

  let textContent = node.content;
  if (node.textCase === "uppercase") {
    textContent = textContent.toUpperCase();
  } else if (node.textCase === "lowercase") {
    textContent = textContent.toLowerCase();
  } else if (node.textCase === "capitalize") {
    textContent = textContent.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const lines = textContent.split("\n");
  const calculatedLineHeight =
    typeof node.lineHeight === "number" && node.lineHeight > 0
      ? node.lineHeight
      : node.fontSize * 1.25;

  let startX = 0;
  if (node.textAlign === "center") startX = node.width / 2;
  else if (node.textAlign === "right") startX = node.width;

  lines.forEach((line, index) => {
    const y = index * calculatedLineHeight;
    ctx.fillText(line, startX, y);

    // Text decoration: underline or line-through
    if (node.textDecoration === "underline" || node.textDecoration === "line-through") {
      ctx.save();
      const metrics = ctx.measureText(line);
      const strokeW = Math.max(1, node.fontSize / 14);
      let lineX = startX;
      if (node.textAlign === "center") lineX = startX - metrics.width / 2;
      else if (node.textAlign === "right") lineX = startX - metrics.width;

      const lineY =
        node.textDecoration === "underline"
          ? y + node.fontSize * 1.1
          : y + node.fontSize * 0.55;

      ctx.beginPath();
      ctx.strokeStyle = node.color;
      ctx.lineWidth = strokeW;
      ctx.moveTo(lineX, lineY);
      ctx.lineTo(lineX + metrics.width, lineY);
      ctx.stroke();
      ctx.restore();
    }
  });
}

export function renderFrame(ctx: CanvasRenderingContext2D, node: FrameNode, zoom: number) {
  // Frame background
  drawRoundedRect(ctx, 0, 0, node.width, node.height, node.cornerRadius);
  if (node.fill.type !== "none") {
    ctx.save();
    applyFill(ctx, node.fill);
    ctx.fill();
    ctx.restore();
  } else {
    // Default subtle dark frame fill matching Nage
    ctx.fillStyle = "#111111";
    ctx.fill();
  }

  // Frame border
  ctx.save();
  ctx.strokeStyle = "#222222";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Frame title label above frame: matches prototype `.fl`
  ctx.save();
  const fontSize = 11 / zoom;
  ctx.font = `400 ${Math.max(9, fontSize)}px Inter, sans-serif`;
  ctx.fillStyle = "#888888";
  ctx.textBaseline = "bottom";
  ctx.fillText(node.name, 0, -4 / zoom);
  ctx.restore();
}

export function renderImage(
  ctx: CanvasRenderingContext2D,
  node: ImageNode,
  requestRerender?: () => void
) {
  const src = node.signedUrl || node.storagePath;
  if (!src) {
    // Placeholder background
    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, 0, node.width, node.height);
    return;
  }

  const img = getCachedImage(src, requestRerender);
  if (img) {
    ctx.drawImage(img, 0, 0, node.width, node.height);
  } else {
    // Loading skeleton placeholder
    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, 0, node.width, node.height);
  }
}

export function renderNode(
  ctx: CanvasRenderingContext2D,
  node: CanvasNode,
  zoom: number,
  requestRerender?: () => void
) {
  if (!node.visible) return;

  ctx.save();
  // Translate to node position
  ctx.translate(node.x, node.y);

  // Apply rotation around center if present
  if (node.rotation) {
    const cx = node.width / 2;
    const cy = node.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((node.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  ctx.globalAlpha = node.opacity ?? 1;

  switch (node.type) {
    case "rectangle":
      renderRectangle(ctx, node);
      break;
    case "ellipse":
      renderEllipse(ctx, node);
      break;
    case "line":
      renderLine(ctx, node);
      break;
    case "text":
      renderText(ctx, node);
      break;
    case "frame":
      renderFrame(ctx, node, zoom);
      break;
    case "image":
      renderImage(ctx, node, requestRerender);
      break;
  }

  ctx.restore();
}
