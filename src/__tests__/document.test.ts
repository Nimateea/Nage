import { describe, it, expect } from "vitest";
import {
  makeEmptyDocument,
  makeRectangle,
  makeEllipse,
  makeLine,
  makeText,
  makeFrame,
  makeImage,
} from "@/lib/canvas/document/defaults";

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

  it("creates a line with correct endpoints and defaults", () => {
    const line = makeLine({ x: 10, y: 20, x2: 110, y2: 120 });
    expect(line.type).toBe("line");
    expect(line.x).toBe(10);
    expect(line.y).toBe(20);
    expect(line.x2).toBe(110);
    expect(line.y2).toBe(120);
  });

  it("creates a frame with container properties", () => {
    const frame = makeFrame({ name: "Artboard 1", cornerRadius: 14 });
    expect(frame.type).toBe("frame");
    expect(frame.name).toBe("Artboard 1");
    expect(frame.childIds).toEqual([]);
    expect(frame.cornerRadius).toBe(14);
  });

  it("creates a text node with typography defaults", () => {
    const text = makeText({ content: "Design System", fontSize: 24, fontWeight: 600 });
    expect(text.type).toBe("text");
    expect(text.content).toBe("Design System");
    expect(text.fontSize).toBe(24);
    expect(text.fontWeight).toBe(600);
  });

  it("creates an image node with dimensions and URLs", () => {
    const img = makeImage({
      storagePath: "projects/img-1.png",
      signedUrl: "https://example.com/img-1.png",
      naturalWidth: 800,
      naturalHeight: 600,
    });
    expect(img.type).toBe("image");
    expect(img.storagePath).toBe("projects/img-1.png");
    expect(img.signedUrl).toBe("https://example.com/img-1.png");
    expect(img.naturalWidth).toBe(800);
    expect(img.naturalHeight).toBe(600);
  });
});
