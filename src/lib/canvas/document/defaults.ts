// Factory functions for each node type with sensible defaults.
import { nanoid } from "nanoid";
import type {
  RectangleNode,
  EllipseNode,
  LineNode,
  TextNode,
  FrameNode,
  ImageNode,
  Fill,
  Stroke,
  CanvasDocument,
  Camera,
} from "./types";

const defaultFill: Fill = { type: "solid", color: "#ffffff", opacity: 1 };
const defaultStroke: Stroke = {
  color: "#000000",
  width: 1,
  opacity: 1,
  style: "solid",
};
const defaultCamera: Camera = { x: 0, y: 0, zoom: 1 };

export function makeRectangle(
  overrides: Partial<RectangleNode> = {}
): RectangleNode {
  return {
    id: nanoid(),
    type: "rectangle",
    name: "Rectangle",
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    parentId: null,
    fill: defaultFill,
    stroke: { ...defaultStroke, width: 0 },
    cornerRadius: 0,
    ...overrides,
  };
}

export function makeEllipse(
  overrides: Partial<EllipseNode> = {}
): EllipseNode {
  return {
    id: nanoid(),
    type: "ellipse",
    name: "Ellipse",
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    parentId: null,
    fill: defaultFill,
    stroke: { ...defaultStroke, width: 0 },
    ...overrides,
  };
}

export function makeLine(overrides: Partial<LineNode> = {}): LineNode {
  return {
    id: nanoid(),
    type: "line",
    name: "Line",
    x: 100,
    y: 100,
    width: 200,
    height: 1,
    x2: 300,
    y2: 100,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    parentId: null,
    stroke: defaultStroke,
    ...overrides,
  };
}

export function makeText(overrides: Partial<TextNode> = {}): TextNode {
  return {
    id: nanoid(),
    type: "text",
    name: "Text",
    x: 100,
    y: 100,
    width: 200,
    height: 40,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    parentId: null,
    content: "Text",
    fontSize: 16,
    fontFamily: "Inter, sans-serif",
    fontWeight: 400,
    color: "#000000",
    textAlign: "left",
    verticalAlign: "top",
    lineHeight: "auto",
    letterSpacing: 0,
    textDecoration: "none",
    textCase: "none",
    ...overrides,
  };
}

export function makeFrame(overrides: Partial<FrameNode> = {}): FrameNode {
  return {
    id: nanoid(),
    type: "frame",
    name: "Frame",
    x: 100,
    y: 100,
    width: 400,
    height: 300,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    parentId: null,
    fill: { type: "none" },
    stroke: { ...defaultStroke, color: "#cccccc" },
    cornerRadius: 0,
    childIds: [],
    ...overrides,
  };
}

export function makeImage(
  overrides: Partial<ImageNode> & { storagePath: string }
): ImageNode {
  return {
    id: nanoid(),
    type: "image",
    name: "Image",
    x: 100,
    y: 100,
    width: 300,
    height: 200,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    parentId: null,
    signedUrl: null,
    naturalWidth: 300,
    naturalHeight: 200,
    objectFit: "contain",
    ...overrides,
  };
}

export function makeEmptyDocument(): CanvasDocument {
  return {
    version: 1,
    nodes: [],
    camera: defaultCamera,
  };
}
