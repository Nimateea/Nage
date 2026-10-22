import type {
  IRenderer,
  Point,
  Rect,
  ResizeHandle,
  TransformHitResult,
} from "./IRenderer";
import type {
  CanvasDocument,
  CanvasNode,
  Camera,
} from "../document/types";
import { renderNode } from "./renderNode";

export function getResizeCursor(handle: ResizeHandle, rotation = 0): string {
  const baseAngles: Record<ResizeHandle, number> = {
    n: 0,
    ne: 45,
    e: 90,
    se: 135,
    s: 180,
    sw: 225,
    w: 270,
    nw: 315,
  };
  const cursors = [
    "ns-resize",
    "nesw-resize",
    "ew-resize",
    "nwse-resize",
  ];
  let angle = (baseAngles[handle] + rotation) % 360;
  if (angle < 0) angle += 360;
  const index = Math.round(angle / 45) % 8;
  return cursors[index % 4];
}

export class Canvas2DRenderer implements IRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private rafId: number | null = null;
  private isDirty = true;

  // Cached state for render loop
  private currentDoc: CanvasDocument | null = null;
  private selectedIds: Set<string> = new Set();
  private hoveredId: string | null = null;
  private dragPreview: Rect | null = null;

  mount(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    this.startLoop();
  }

  resize(width: number, height: number, dpr?: number): void {
    this.width = width;
    this.height = height;
    this.dpr = dpr || (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);

    if (!this.canvas) return;

    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.isDirty = true;
  }

  render(
    doc: CanvasDocument,
    selectedIds: Set<string>,
    hoveredId?: string | null,
    dragPreview?: Rect | null
  ): void {
    this.currentDoc = doc;
    this.selectedIds = selectedIds;
    this.hoveredId = hoveredId ?? null;
    this.dragPreview = dragPreview ?? null;
    this.isDirty = true;
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.canvas = null;
    this.ctx = null;
    this.currentDoc = null;
  }

  screenToWorld(screenPoint: Point, camera: Camera): Point {
    // Screen origin is center of canvas matching Nage prototype
    const cx = this.width / 2;
    const cy = this.height / 2;
    return {
      x: (screenPoint.x - cx - camera.x) / camera.zoom,
      y: (screenPoint.y - cy - camera.y) / camera.zoom,
    };
  }

  worldToScreen(worldPoint: Point, camera: Camera): Point {
    const cx = this.width / 2;
    const cy = this.height / 2;
    return {
      x: cx + camera.x + worldPoint.x * camera.zoom,
      y: cy + camera.y + worldPoint.y * camera.zoom,
    };
  }

  hitTest(worldPoint: Point, doc: CanvasDocument): CanvasNode | null {
    // Top-to-bottom hit testing (reverse of draw order)
    for (let i = doc.nodes.length - 1; i >= 0; i--) {
      const node = doc.nodes[i];
      if (!node.visible || node.locked) continue;

      // Handle rotated nodes by counter-rotating the test point
      let px = worldPoint.x - node.x;
      let py = worldPoint.y - node.y;

      if (node.rotation) {
        const cx = node.width / 2;
        const cy = node.height / 2;
        const rad = (-node.rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rx = px - cx;
        const ry = py - cy;
        px = rx * cos - ry * sin + cx;
        py = rx * sin + ry * cos + cy;
      }

      if (px >= 0 && px <= node.width && py >= 0 && py <= node.height) {
        return node;
      }
    }
    return null;
  }

  computeBounds(nodes: CanvasNode[]): Rect | null {
    if (nodes.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  // ── 60fps Render Loop ─────────────────────────────────────────────────────────

  private startLoop(): void {
    const tick = () => {
      if (this.isDirty) {
        this.draw();
        this.isDirty = false;
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private draw(): void {
    const ctx = this.ctx;
    const doc = this.currentDoc;
    if (!ctx || !doc || this.width === 0 || this.height === 0) return;

    ctx.save();

    // Reset transform & scale to device pixel ratio
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Dark canvas background matching Nage
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, this.width, this.height);

    // Transform coordinate system to center-origin camera
    const cx = this.width / 2;
    const cy = this.height / 2;
    ctx.translate(cx + doc.camera.x, cy + doc.camera.y);
    ctx.scale(doc.camera.zoom, doc.camera.zoom);

    // 1. Draw all nodes in z-order
    for (const node of doc.nodes) {
      renderNode(ctx, node, doc.camera.zoom, () => {
        this.isDirty = true;
      });
    }

    // 2. Draw selection bounding box and handles
    this.drawSelection(ctx, doc);

    // 3. Draw drag-creation / marquee preview box
    if (this.dragPreview) {
      ctx.save();
      ctx.strokeStyle = "#2E5CFF";
      ctx.lineWidth = 1 / doc.camera.zoom;
      ctx.fillStyle = "rgba(46, 92, 255, 0.08)";
      ctx.strokeRect(
        this.dragPreview.x,
        this.dragPreview.y,
        this.dragPreview.width,
        this.dragPreview.height
      );
      ctx.fillRect(
        this.dragPreview.x,
        this.dragPreview.y,
        this.dragPreview.width,
        this.dragPreview.height
      );
      ctx.restore();
    }

    ctx.restore();
  }

  hitTestTransformHandle(
    worldPoint: Point,
    doc: CanvasDocument,
    selectedIds: Set<string>
  ): TransformHitResult | null {
    if (selectedIds.size === 0) return null;

    const z = doc.camera.zoom;
    const hitRadius = Math.max(6, 8 / z) / 2 + 5 / z;

    if (selectedIds.size === 1) {
      const selectedId = Array.from(selectedIds)[0];
      const node = doc.nodes.find((n) => n.id === selectedId);
      if (!node) return null;

      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;

      let dx = worldPoint.x - cx;
      let dy = worldPoint.y - cy;

      if (node.rotation) {
        const rad = (-node.rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;
        dx = rx;
        dy = ry;
      }

      // 1. Rotation handle: at (0, -node.height / 2 - 20 / z)
      const rotY = -node.height / 2 - 20 / z;
      if (Math.hypot(dx, dy - rotY) <= hitRadius * 1.5) {
        return { type: "rotate", node, center: { x: cx, y: cy } };
      }

      // 2. 8 resize handles
      const hw = node.width / 2;
      const hh = node.height / 2;
      const handles: { handle: ResizeHandle; x: number; y: number }[] = [
        { handle: "nw", x: -hw, y: -hh },
        { handle: "n", x: 0, y: -hh },
        { handle: "ne", x: hw, y: -hh },
        { handle: "e", x: hw, y: 0 },
        { handle: "se", x: hw, y: hh },
        { handle: "s", x: 0, y: hh },
        { handle: "sw", x: -hw, y: hh },
        { handle: "w", x: -hw, y: 0 },
      ];

      for (const h of handles) {
        if (Math.abs(dx - h.x) <= hitRadius && Math.abs(dy - h.y) <= hitRadius) {
          return {
            type: "resize",
            handle: h.handle,
            node,
            bounds: { x: node.x, y: node.y, width: node.width, height: node.height },
          };
        }
      }
    } else {
      // Multi-selection bounds
      const selectedNodes = doc.nodes.filter((n) => selectedIds.has(n.id));
      const bounds = this.computeBounds(selectedNodes);
      if (!bounds) return null;

      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      const dx = worldPoint.x - cx;
      const dy = worldPoint.y - cy;
      const hw = bounds.width / 2;
      const hh = bounds.height / 2;

      const handles: { handle: ResizeHandle; x: number; y: number }[] = [
        { handle: "nw", x: -hw, y: -hh },
        { handle: "n", x: 0, y: -hh },
        { handle: "ne", x: hw, y: -hh },
        { handle: "e", x: hw, y: 0 },
        { handle: "se", x: hw, y: hh },
        { handle: "s", x: 0, y: hh },
        { handle: "sw", x: -hw, y: hh },
        { handle: "w", x: -hw, y: 0 },
      ];

      for (const h of handles) {
        if (Math.abs(dx - h.x) <= hitRadius && Math.abs(dy - h.y) <= hitRadius) {
          return {
            type: "resize",
            handle: h.handle,
            bounds,
          };
        }
      }
    }

    return null;
  }

  private drawSelection(ctx: CanvasRenderingContext2D, doc: CanvasDocument): void {
    if (this.selectedIds.size === 0) return;

    const selectedNodes = doc.nodes.filter((n) => this.selectedIds.has(n.id));
    if (selectedNodes.length === 0) return;

    const z = doc.camera.zoom;
    const handleSize = 8 / z;

    ctx.save();

    if (selectedNodes.length === 1) {
      const node = selectedNodes[0];
      ctx.translate(node.x, node.y);

      if (node.rotation) {
        const ncx = node.width / 2;
        const ncy = node.height / 2;
        ctx.translate(ncx, ncy);
        ctx.rotate((node.rotation * Math.PI) / 180);
        ctx.translate(-ncx, -ncy);
      }

      // Selection outline (blue #2E5CFF from prototype)
      ctx.strokeStyle = "#2E5CFF";
      ctx.lineWidth = 1.5 / z;
      ctx.strokeRect(0, 0, node.width, node.height);

      // 8 Resize handles: white square with blue border
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#2E5CFF";
      ctx.lineWidth = 1 / z;

      const hw = node.width / 2;
      const hh = node.height / 2;
      const handles = [
        [0, 0],
        [hw, 0],
        [node.width, 0],
        [node.width, hh],
        [node.width, node.height],
        [hw, node.height],
        [0, node.height],
        [0, hh],
      ];

      for (const [hx, hy] of handles) {
        ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
      }

      // Rotation handle: connection line and circular handle
      const rotY = -20 / z;
      ctx.beginPath();
      ctx.moveTo(hw, 0);
      ctx.lineTo(hw, rotY);
      ctx.strokeStyle = "#2E5CFF";
      ctx.lineWidth = 1 / z;
      ctx.stroke();

      const rotRadius = 4 / z;
      ctx.beginPath();
      ctx.arc(hw, rotY, rotRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.strokeStyle = "#2E5CFF";
      ctx.lineWidth = 1 / z;
      ctx.stroke();

      // Dimension badge underneath (e.g. "300 × 200")
      const label = `${Math.round(node.width)} × ${Math.round(node.height)}`;
      ctx.font = `500 ${Math.max(10, 11 / z)}px Inter, sans-serif`;
      const textWidth = ctx.measureText(label).width;
      const badgePaddingX = 6 / z;
      const badgeH = 16 / z;
      const badgeW = textWidth + badgePaddingX * 2;
      const badgeX = node.width / 2 - badgeW / 2;
      const badgeY = node.height + 8 / z;

      ctx.fillStyle = "#2E5CFF";
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4 / z);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, node.width / 2, badgeY + badgeH / 2);
    } else {
      // Multi-selection bounds
      const bounds = this.computeBounds(selectedNodes);
      if (bounds) {
        ctx.strokeStyle = "#2E5CFF";
        ctx.lineWidth = 1.5 / z;
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

        // 8 Resize handles on multi-selection box
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#2E5CFF";
        ctx.lineWidth = 1 / z;

        const hw = bounds.width / 2;
        const hh = bounds.height / 2;
        const handles = [
          [bounds.x, bounds.y],
          [bounds.x + hw, bounds.y],
          [bounds.x + bounds.width, bounds.y],
          [bounds.x + bounds.width, bounds.y + hh],
          [bounds.x + bounds.width, bounds.y + bounds.height],
          [bounds.x + hw, bounds.y + bounds.height],
          [bounds.x, bounds.y + bounds.height],
          [bounds.x, bounds.y + hh],
        ];

        for (const [hx, hy] of handles) {
          ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
          ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
        }

        // Dimension badge underneath multi-selection
        const label = `${Math.round(bounds.width)} × ${Math.round(bounds.height)}`;
        ctx.font = `500 ${Math.max(10, 11 / z)}px Inter, sans-serif`;
        const textWidth = ctx.measureText(label).width;
        const badgePaddingX = 6 / z;
        const badgeH = 16 / z;
        const badgeW = textWidth + badgePaddingX * 2;
        const badgeX = bounds.x + bounds.width / 2 - badgeW / 2;
        const badgeY = bounds.y + bounds.height + 8 / z;

        ctx.fillStyle = "#2E5CFF";
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4 / z);
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, bounds.x + bounds.width / 2, badgeY + badgeH / 2);
      }
    }

    ctx.restore();
  }
}
