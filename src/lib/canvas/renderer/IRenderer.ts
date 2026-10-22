import type { CanvasDocument, CanvasNode, Camera } from "../document/types";

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export type TransformHitResult =
  | { type: "resize"; handle: ResizeHandle; node?: CanvasNode; bounds: Rect }
  | { type: "rotate"; node: CanvasNode; center: Point };

export interface IRenderer {
  /**
   * Mount to an HTML5 <canvas> element and setup context
   */
  mount(canvas: HTMLCanvasElement): void;

  /**
   * Resize canvas to viewport dimensions with device pixel ratio
   */
  resize(width: number, height: number, dpr?: number): void;

  /**
   * Render the document and current selection
   */
  render(
    doc: CanvasDocument,
    selectedIds: Set<string>,
    hoveredId?: string | null,
    dragPreview?: Rect | null
  ): void;

  /**
   * Clean up listeners, caches, animation frame
   */
  destroy(): void;

  /**
   * Transform screen coordinates (clientX/Y relative to canvas rect) to world canvas coordinates
   */
  screenToWorld(screenPoint: Point, camera: Camera): Point;

  /**
   * Transform world canvas coordinates to screen coordinates
   */
  worldToScreen(worldPoint: Point, camera: Camera): Point;

  /**
   * Hit test a world coordinate against document nodes (topmost first)
   */
  hitTest(worldPoint: Point, doc: CanvasDocument): CanvasNode | null;

  /**
   * Compute bounding box enclosing an array of nodes in world space
   */
  computeBounds(nodes: CanvasNode[]): Rect | null;

  /**
   * Hit test a world coordinate against active transform handles (resize/rotation)
   */
  hitTestTransformHandle?(
    worldPoint: Point,
    doc: CanvasDocument,
    selectedIds: Set<string>
  ): TransformHitResult | null;
}
