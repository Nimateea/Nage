import type {
  CanvasNode,
  RectangleNode,
  EllipseNode,
  LineNode,
  TextNode,
  FrameNode,
  ImageNode,
} from "../document/types";
import { renderNode } from "../renderer/renderNode";

export interface ExportBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

/**
 * Resolves nodes and bounding box for export.
 * If nodes include frames, recursively resolves all child nodes belonging to those frames.
 * If a single frame is selected, bounds are strictly locked to the frame boundaries.
 */
export function resolveNodesForExport(
  selectedNodes: CanvasNode[],
  allNodes: CanvasNode[]
): { nodes: CanvasNode[]; bounds: ExportBounds } {
  const activeNodes = selectedNodes.length > 0 ? selectedNodes : allNodes;
  const nodeMap = new Map<string, CanvasNode>(allNodes.map((n) => [n.id, n]));
  const includedIds = new Set<string>();

  const includeNodeAndChildren = (node: CanvasNode) => {
    includedIds.add(node.id);
    if (node.type === "frame") {
      const frame = node as FrameNode;
      if (Array.isArray(frame.childIds)) {
        for (const childId of frame.childIds) {
          const child = nodeMap.get(childId);
          if (child && !includedIds.has(child.id)) {
            includeNodeAndChildren(child);
          }
        }
      }
      for (const n of allNodes) {
        if (n.parentId === frame.id && !includedIds.has(n.id)) {
          includeNodeAndChildren(n);
        }
      }
    }
  };

  for (const n of activeNodes) {
    includeNodeAndChildren(n);
  }

  // Preserve document z-order
  const resolvedNodes = allNodes.filter((n) => includedIds.has(n.id) && n.visible);

  // If exporting a single frame, bounds are exact frame coordinates
  if (selectedNodes.length === 1 && selectedNodes[0].type === "frame") {
    const f = selectedNodes[0] as FrameNode;
    return {
      nodes: resolvedNodes,
      bounds: {
        minX: f.x,
        minY: f.y,
        width: Math.max(20, f.width),
        height: Math.max(20, f.height),
      },
    };
  }

  return {
    nodes: resolvedNodes,
    bounds: computeExportBounds(resolvedNodes),
  };
}

export function computeExportBounds(nodes: CanvasNode[]): ExportBounds {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, width: 800, height: 600 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    if (!node.visible) continue;
    const right = node.type === "line" ? Math.max(node.x, node.x2) : node.x + node.width;
    const bottom = node.type === "line" ? Math.max(node.y, node.y2) : node.y + node.height;
    const left = node.type === "line" ? Math.min(node.x, node.x2) : node.x;
    const top = node.type === "line" ? Math.min(node.y, node.y2) : node.y;

    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  }

  if (minX === Infinity) {
    return { minX: 0, minY: 0, width: 800, height: 600 };
  }

  return {
    minX,
    minY,
    width: Math.max(20, maxX - minX),
    height: Math.max(20, maxY - minY),
  };
}

export async function exportToPng(
  nodes: CanvasNode[],
  scale: 1 | 2 | 3 = 1,
  backgroundColor: string | null = "#000000",
  customBounds?: ExportBounds
): Promise<Blob> {
  const bounds = customBounds || computeExportBounds(nodes);
  const canvas = document.createElement("canvas");
  const width = Math.ceil(bounds.width * scale);
  const height = Math.ceil(bounds.height * scale);

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to create offscreen canvas context");
  }

  // Preload any image nodes to ensure they render into offscreen canvas
  const imageNodes = nodes.filter((n) => n.type === "image" && n.visible) as ImageNode[];
  if (imageNodes.length > 0) {
    await Promise.all(
      imageNodes.map((n) => {
        const src = n.signedUrl || n.storagePath;
        if (!src) return Promise.resolve();
        return new Promise<void>((res) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => res();
          img.onerror = () => res();
          img.src = src;
        });
      })
    );
  }

  // Draw background if specified
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Scale and translate relative to bounding box
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-bounds.minX, -bounds.minY);

  // Render each visible node in z-order (pass isExport: true to omit frame editor label)
  for (const node of nodes) {
    if (node.visible) {
      renderNode(ctx, node, 1, undefined, true);
    }
  }

  ctx.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Canvas toBlob failed"));
      }
    }, "image/png");
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function exportToSvg(
  nodes: CanvasNode[],
  backgroundColor: string | null = "#000000",
  customBounds?: ExportBounds
): string {
  const bounds = customBounds || computeExportBounds(nodes);
  const w = Math.round(bounds.width);
  const h = Math.round(bounds.height);

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
  );

  if (backgroundColor) {
    parts.push(`  <rect width="100%" height="100%" fill="${backgroundColor}" />`);
  }

  parts.push(`  <g transform="translate(${-bounds.minX}, ${-bounds.minY})">`);

  for (const node of nodes) {
    if (!node.visible) continue;

    const rot = node.rotation
      ? ` transform="rotate(${node.rotation} ${node.x + node.width / 2} ${node.y + node.height / 2})"`
      : "";
    const opacity = node.opacity !== undefined && node.opacity < 1 ? ` opacity="${node.opacity}"` : "";

    switch (node.type) {
      case "rectangle": {
        const rectNode = node as RectangleNode;
        const fill = rectNode.fill.type === "solid" ? rectNode.fill.color : "none";
        const stroke = rectNode.stroke.width > 0 ? rectNode.stroke.color : "none";
        const strokeWidth = rectNode.stroke.width > 0 ? rectNode.stroke.width : 0;
        const rx = rectNode.cornerRadius ? ` rx="${rectNode.cornerRadius}"` : "";
        parts.push(
          `    <rect x="${rectNode.x}" y="${rectNode.y}" width="${rectNode.width}" height="${rectNode.height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${rx}${rot}${opacity} />`
        );
        break;
      }
      case "ellipse": {
        const ellNode = node as EllipseNode;
        const cx = ellNode.x + ellNode.width / 2;
        const cy = ellNode.y + ellNode.height / 2;
        const rx = ellNode.width / 2;
        const ry = ellNode.height / 2;
        const fill = ellNode.fill.type === "solid" ? ellNode.fill.color : "none";
        const stroke = ellNode.stroke.width > 0 ? ellNode.stroke.color : "none";
        const strokeWidth = ellNode.stroke.width > 0 ? ellNode.stroke.width : 0;
        parts.push(
          `    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${rot}${opacity} />`
        );
        break;
      }
      case "line": {
        const lineNode = node as LineNode;
        const stroke = lineNode.stroke.color || "#FFFFFF";
        const strokeWidth = lineNode.stroke.width || 1;
        const dash =
          lineNode.stroke.style === "dashed"
            ? ` stroke-dasharray="${strokeWidth * 3},${strokeWidth * 2}"`
            : "";
        parts.push(
          `    <line x1="${lineNode.x}" y1="${lineNode.y}" x2="${lineNode.x2}" y2="${lineNode.y2}" stroke="${stroke}" stroke-width="${strokeWidth}"${dash}${opacity} />`
        );
        break;
      }
      case "frame": {
        const frameNode = node as FrameNode;
        const fill = frameNode.fill.type === "solid" ? frameNode.fill.color : "#111111";
        const stroke = frameNode.stroke.width > 0 ? frameNode.stroke.color : "#222222";
        const rx = frameNode.cornerRadius ? ` rx="${frameNode.cornerRadius}"` : "";
        parts.push(
          `    <g id="${frameNode.id}">` +
            `      <title>${escapeXml(frameNode.name)}</title>` +
            `      <rect x="${frameNode.x}" y="${frameNode.y}" width="${frameNode.width}" height="${frameNode.height}" fill="${fill}" stroke="${stroke}" stroke-width="1"${rx}${rot}${opacity} />` +
            `    </g>`
        );
        break;
      }
      case "text": {
        const textNode = node as TextNode;
        const fontFam = textNode.fontFamily || "Inter, sans-serif";
        const weight = textNode.fontWeight || 400;
        const align =
          textNode.textAlign === "center"
            ? ' text-anchor="middle"'
            : textNode.textAlign === "right"
            ? ' text-anchor="end"'
            : ' text-anchor="start"';
        const startX =
          textNode.textAlign === "center"
            ? textNode.x + textNode.width / 2
            : textNode.textAlign === "right"
            ? textNode.x + textNode.width
            : textNode.x;

        const lines = textNode.content.split("\n");
        const lineHeight = textNode.fontSize * 1.25;

        parts.push(
          `    <g font-family="${escapeXml(fontFam)}" font-size="${textNode.fontSize}" font-weight="${weight}" fill="${textNode.color}"${align}${rot}${opacity}>`
        );
        lines.forEach((line, idx) => {
          const y = textNode.y + textNode.fontSize + idx * lineHeight;
          parts.push(`      <text x="${startX}" y="${y}">${escapeXml(line)}</text>`);
        });
        parts.push(`    </g>`);
        break;
      }
      case "image": {
        const imgNode = node as ImageNode;
        const href = imgNode.signedUrl || imgNode.storagePath;
        if (href) {
          let par = 'preserveAspectRatio="xMidYMid meet"';
          if (imgNode.objectFit === "cover") {
            par = 'preserveAspectRatio="xMidYMid slice"';
          } else if (imgNode.objectFit === "fill") {
            par = 'preserveAspectRatio="none"';
          }
          parts.push(
            `    <image href="${escapeXml(href)}" x="${imgNode.x}" y="${imgNode.y}" width="${imgNode.width}" height="${imgNode.height}" ${par}${rot}${opacity} />`
          );
        }
        break;
      }
    }
  }

  parts.push(`  </g>`);
  parts.push(`</svg>`);

  return parts.join("\n");
}

export function exportToJson(
  nodes: CanvasNode[],
  projectName: string = "Nage Project"
): string {
  const exportData = {
    appName: "Nage",
    version: 1,
    projectName,
    exportedAt: new Date().toISOString(),
    nodesCount: nodes.length,
    nodes,
  };
  return JSON.stringify(exportData, null, 2);
}

export function downloadFile(
  data: Blob | string,
  filename: string,
  mimeType: string = "application/octet-stream"
): void {
  const blob = typeof data === "string" ? new Blob([data], { type: mimeType }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
