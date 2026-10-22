// ── Canvas Document Model ─────────────────────────────────────────────────────
// Single source of truth for all node types on the infinite canvas.
// Stored as JSON in Supabase (project_documents.document).

export type NodeType =
  | "rectangle"
  | "ellipse"
  | "line"
  | "text"
  | "frame"
  | "image";

export type SolidFill = {
  type: "solid";
  color: string; // hex
  opacity: number; // 0–1
};

export type NoFill = { type: "none" };

// Gradient reserved for future use
export type GradientStop = { color: string; offset: number };
export type LinearFill = {
  type: "linear";
  stops: GradientStop[];
  angle: number;
};

export type Fill = SolidFill | NoFill | LinearFill;

export type StrokeStyle = "solid" | "dashed" | "dotted";

export type Stroke = {
  color: string;
  width: number;
  opacity: number;
  style: StrokeStyle;
};

// ── Node base ─────────────────────────────────────────────────────────────────

export type NodeBase = {
  id: string; // nanoid
  type: NodeType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  opacity: number; // 0–1
  visible: boolean;
  locked: boolean;
  parentId: string | null; // null = canvas root
};

// ── Concrete node types ───────────────────────────────────────────────────────

export type RectangleNode = NodeBase & {
  type: "rectangle";
  fill: Fill;
  stroke: Stroke;
  cornerRadius: number;
};

export type EllipseNode = NodeBase & {
  type: "ellipse";
  fill: Fill;
  stroke: Stroke;
};

export type LineNode = NodeBase & {
  type: "line";
  stroke: Stroke;
  x2: number;
  y2: number;
};

export type TextNode = NodeBase & {
  type: "text";
  content: string;
  fontSize: number;
  fontFamily?: string;
  fontWeight: number; // 100 to 900
  color: string;
  textAlign: "left" | "center" | "right" | "justify";
  verticalAlign?: "top" | "middle" | "bottom";
  lineHeight?: number | "auto";
  letterSpacing?: number; // px
  paragraphSpacing?: number; // px
  textDecoration?: "none" | "underline" | "line-through";
  textCase?: "none" | "uppercase" | "lowercase" | "capitalize";
};

export type FrameNode = NodeBase & {
  type: "frame";
  fill: Fill;
  stroke: Stroke;
  cornerRadius: number;
  childIds: string[]; // ordered child IDs (z-order)
};

export type ImageNode = NodeBase & {
  type: "image";
  storagePath: string; // path inside Supabase private bucket
  signedUrl: string | null; // ephemeral — refreshed client-side
  naturalWidth: number;
  naturalHeight: number;
  objectFit: "fill" | "contain" | "cover";
};

export type CanvasNode =
  | RectangleNode
  | EllipseNode
  | LineNode
  | TextNode
  | FrameNode
  | ImageNode;

// ── Camera ────────────────────────────────────────────────────────────────────

export type Camera = {
  x: number;
  y: number;
  zoom: number; // 0.1 – 8
};

// ── Full canvas document ──────────────────────────────────────────────────────
// This is what gets persisted to Postgres as `project_documents.document`.

export type CanvasDocument = {
  version: number;
  nodes: CanvasNode[]; // flat list; index = z-order (0 = bottom)
  camera: Camera;
};

// ── Command interface (undo/redo) ─────────────────────────────────────────────

export interface Command {
  readonly id: string;
  readonly label: string;
  execute(doc: CanvasDocument): CanvasDocument;
  undo(doc: CanvasDocument): CanvasDocument;
}

// ── History ───────────────────────────────────────────────────────────────────

export const MAX_HISTORY = 100;

export type HistoryState = {
  past: CanvasDocument[]; // max MAX_HISTORY entries
  present: CanvasDocument;
  future: CanvasDocument[];
};
