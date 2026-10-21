import { describe, it, expect } from "vitest";
import { makeEmptyDocument, makeRectangle, makeEllipse } from "@/lib/canvas/document/defaults";

describe("CanvasDocument defaults", () => {
  it("creates an empty document with version 1", () => {
    const doc = makeEmptyDocument();
    expect(doc.version).toBe(1);
    expect(doc.nodes).toHaveLength(0);
    expect(doc.camera).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it("creates a rectangle with a unique id", () => {
    const r1 = makeRectangle();
    const r2 = makeRectangle();
    expect(r1.type).toBe("rectangle");
    expect(r1.id).toBeTruthy();
    expect(r1.id).not.toBe(r2.id);
  });

  it("allows overriding default rectangle props", () => {
    const r = makeRectangle({ x: 50, y: 75, width: 100, name: "MyRect" });
    expect(r.x).toBe(50);
    expect(r.y).toBe(75);
    expect(r.width).toBe(100);
    expect(r.name).toBe("MyRect");
  });

  it("creates an ellipse with correct defaults", () => {
    const e = makeEllipse();
    expect(e.type).toBe("ellipse");
    expect(e.width).toBe(200);
    expect(e.height).toBe(200);
    expect(e.opacity).toBe(1);
  });
});
