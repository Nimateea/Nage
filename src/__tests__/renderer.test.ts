import { describe, it, expect, beforeEach } from "vitest";
import {
  Canvas2DRenderer,
  getResizeCursor,
} from "../lib/canvas/renderer/Canvas2DRenderer";
import { makeEmptyDocument, makeRectangle, makeEllipse } from "../lib/canvas/document/defaults";

describe("Canvas2DRenderer camera & hit-test math", () => {
  let renderer: Canvas2DRenderer;

  beforeEach(() => {
    renderer = new Canvas2DRenderer();
    // Simulate a 800x600 viewport
    renderer.resize(800, 600, 1);
  });

  it("converts screen center to world (0, 0) at zoom 1 with camera at (0, 0)", () => {
    const camera = { x: 0, y: 0, zoom: 1 };
    const world = renderer.screenToWorld({ x: 400, y: 300 }, camera);
    expect(world.x).toBe(0);
    expect(world.y).toBe(0);

    const screen = renderer.worldToScreen({ x: 0, y: 0 }, camera);
    expect(screen.x).toBe(400);
    expect(screen.y).toBe(300);
  });

  it("handles camera pan correctly", () => {
    const camera = { x: 50, y: -100, zoom: 1 };
    const screen = renderer.worldToScreen({ x: 0, y: 0 }, camera);
    expect(screen.x).toBe(450);
    expect(screen.y).toBe(200);

    const world = renderer.screenToWorld({ x: 450, y: 200 }, camera);
    expect(world.x).toBe(0);
    expect(world.y).toBe(0);
  });

  it("handles camera zoom correctly", () => {
    const camera = { x: 0, y: 0, zoom: 2 };
    const screen = renderer.worldToScreen({ x: 50, y: 50 }, camera);
    // cx (400) + 50 * 2 = 500
    // cy (300) + 50 * 2 = 400
    expect(screen.x).toBe(500);
    expect(screen.y).toBe(400);

    const world = renderer.screenToWorld({ x: 500, y: 400 }, camera);
    expect(world.x).toBe(50);
    expect(world.y).toBe(50);
  });

  it("hit-tests non-rotated nodes accurately", () => {
    const doc = makeEmptyDocument();
    const rect = makeRectangle({ x: 50, y: 50, width: 100, height: 100 });
    doc.nodes.push(rect);

    expect(renderer.hitTest({ x: 60, y: 60 }, doc)).toBe(rect);
    expect(renderer.hitTest({ x: 140, y: 140 }, doc)).toBe(rect);
    expect(renderer.hitTest({ x: 40, y: 40 }, doc)).toBeNull();
    expect(renderer.hitTest({ x: 160, y: 160 }, doc)).toBeNull();
  });

  it("hit-tests in reverse z-order (topmost node wins)", () => {
    const doc = makeEmptyDocument();
    const bottomRect = makeRectangle({ id: "bottom", x: 50, y: 50, width: 100, height: 100 });
    const topRect = makeRectangle({ id: "top", x: 75, y: 75, width: 100, height: 100 });
    doc.nodes.push(bottomRect, topRect);

    // Overlapping area (x: 80, y: 80) -> topRect should be hit
    const hit = renderer.hitTest({ x: 80, y: 80 }, doc);
    expect(hit?.id).toBe("top");
  });

  it("computes bounds enclosing multiple nodes", () => {
    const n1 = makeRectangle({ x: 10, y: 20, width: 100, height: 50 });
    const n2 = makeEllipse({ x: 150, y: 80, width: 50, height: 60 });

    const bounds = renderer.computeBounds([n1, n2]);
    expect(bounds).not.toBeNull();
    expect(bounds?.x).toBe(10);
    expect(bounds?.y).toBe(20);
    expect(bounds?.width).toBe(190); // 200 - 10
    expect(bounds?.height).toBe(120); // 140 - 20
  });

  it("hit-tests 8 resize handles on selected node", () => {
    const doc = makeEmptyDocument();
    const rect = makeRectangle({ id: "rect-1", x: 100, y: 100, width: 200, height: 100 });
    doc.nodes.push(rect);
    const selectedIds = new Set(["rect-1"]);

    // Test nw handle (100, 100)
    const nwHit = renderer.hitTestTransformHandle({ x: 100, y: 100 }, doc, selectedIds);
    expect(nwHit?.type).toBe("resize");
    if (nwHit?.type === "resize") {
      expect(nwHit.handle).toBe("nw");
    }

    // Test se handle (300, 200)
    const seHit = renderer.hitTestTransformHandle({ x: 300, y: 200 }, doc, selectedIds);
    expect(seHit?.type).toBe("resize");
    if (seHit?.type === "resize") {
      expect(seHit.handle).toBe("se");
    }

    // Test e handle (300, 150)
    const eHit = renderer.hitTestTransformHandle({ x: 300, y: 150 }, doc, selectedIds);
    expect(eHit?.type).toBe("resize");
    if (eHit?.type === "resize") {
      expect(eHit.handle).toBe("e");
    }
  });

  it("hit-tests rotation handle above the top handle", () => {
    const doc = makeEmptyDocument();
    const rect = makeRectangle({ id: "rect-rot", x: 100, y: 100, width: 200, height: 100 });
    doc.nodes.push(rect);
    const selectedIds = new Set(["rect-rot"]);

    // Rotation handle is at (x + width/2, y - 20) -> (200, 80)
    const rotHit = renderer.hitTestTransformHandle({ x: 200, y: 80 }, doc, selectedIds);
    expect(rotHit?.type).toBe("rotate");
    if (rotHit?.type === "rotate") {
      expect(rotHit.node.id).toBe("rect-rot");
      expect(rotHit.center).toEqual({ x: 200, y: 150 });
    }
  });

  it("maps resize cursors correctly based on handle and rotation", () => {
    expect(getResizeCursor("n", 0)).toBe("ns-resize");
    expect(getResizeCursor("e", 0)).toBe("ew-resize");
    expect(getResizeCursor("nw", 0)).toBe("nwse-resize");
    expect(getResizeCursor("ne", 0)).toBe("nesw-resize");

    // Rotated 90 degrees: n becomes ew-resize
    expect(getResizeCursor("n", 90)).toBe("ew-resize");
  });
});
