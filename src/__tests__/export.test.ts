import { describe, it, expect } from "vitest";
import {
  computeExportBounds,
  resolveNodesForExport,
  exportToSvg,
  exportToJson,
} from "@/lib/canvas/export";
import {
  makeRectangle,
  makeEllipse,
  makeText,
  makeFrame,
  makeLine,
} from "@/lib/canvas/document/defaults";
import { blobToDataUrl, getAssetSignedUrl } from "@/lib/supabase/storage";

describe("Export Engine", () => {
  describe("computeExportBounds", () => {
    it("returns default bounds for empty node array", () => {
      const bounds = computeExportBounds([]);
      expect(bounds).toEqual({ minX: 0, minY: 0, width: 800, height: 600 });
    });

    it("ignores invisible nodes", () => {
      const node = makeRectangle({ x: 100, y: 100, width: 200, height: 150, visible: false });
      const bounds = computeExportBounds([node]);
      expect(bounds).toEqual({ minX: 0, minY: 0, width: 800, height: 600 });
    });

    it("computes bounding box for single visible node", () => {
      const rect = makeRectangle({ x: 50, y: 80, width: 200, height: 100 });
      const bounds = computeExportBounds([rect]);
      expect(bounds.minX).toBe(50);
      expect(bounds.minY).toBe(80);
      expect(bounds.width).toBe(200);
      expect(bounds.height).toBe(100);
    });

    it("computes union bounds for multiple nodes", () => {
      const rect = makeRectangle({ x: 100, y: 100, width: 100, height: 100 });
      const ell = makeEllipse({ x: 300, y: 250, width: 50, height: 50 });
      const bounds = computeExportBounds([rect, ell]);
      expect(bounds.minX).toBe(100);
      expect(bounds.minY).toBe(100);
      expect(bounds.width).toBe(250); // 350 - 100
      expect(bounds.height).toBe(200); // 300 - 100
    });

    it("handles line nodes correctly with x2/y2", () => {
      const line = makeLine({ x: 50, y: 50, x2: 250, y2: 350 });
      const bounds = computeExportBounds([line]);
      expect(bounds.minX).toBe(50);
      expect(bounds.minY).toBe(50);
      expect(bounds.width).toBe(200);
      expect(bounds.height).toBe(300);
    });
  });

  describe("resolveNodesForExport", () => {
    it("returns all visible nodes when selectedNodes is empty", () => {
      const n1 = makeRectangle({ x: 0, y: 0, visible: true });
      const n2 = makeRectangle({ x: 10, y: 10, visible: false });
      const { nodes, bounds } = resolveNodesForExport([], [n1, n2]);
      expect(nodes.length).toBe(1);
      expect(nodes[0].id).toBe(n1.id);
      expect(bounds).toBeDefined();
    });

    it("resolves frame and its child nodes even if children are not selected directly", () => {
      const frame = makeFrame({ x: 100, y: 100, width: 400, height: 300 });
      const child1 = makeRectangle({ x: 120, y: 120, width: 50, height: 50, parentId: frame.id });
      const child2 = makeText({ x: 150, y: 150, content: "Child text", parentId: frame.id });
      const outside = makeRectangle({ x: 800, y: 800, width: 100, height: 100, parentId: null });

      // User selects only the frame
      const { nodes, bounds } = resolveNodesForExport([frame], [frame, child1, child2, outside]);
      expect(nodes.map((n) => n.id)).toEqual([frame.id, child1.id, child2.id]);
      expect(bounds.minX).toBe(100);
      expect(bounds.minY).toBe(100);
      expect(bounds.width).toBe(400);
      expect(bounds.height).toBe(300);
    });

    it("resolves child nodes referenced by childIds array on frame", () => {
      const child = makeRectangle({ x: 200, y: 200, width: 60, height: 60 });
      const frame = makeFrame({ x: 150, y: 150, width: 300, height: 200, childIds: [child.id] });

      const { nodes } = resolveNodesForExport([frame], [frame, child]);
      expect(nodes.length).toBe(2);
      expect(nodes.some((n) => n.id === child.id)).toBe(true);
    });

    it("preserves document z-order when resolving export list", () => {
      const f = makeFrame({ x: 0, y: 0, width: 500, height: 500 });
      const b1 = makeRectangle({ x: 10, y: 10, parentId: f.id });
      const b2 = makeRectangle({ x: 20, y: 20, parentId: f.id });
      const docOrder = [f, b1, b2];

      const { nodes } = resolveNodesForExport([b2, f], docOrder);
      expect(nodes.map((n) => n.id)).toEqual([f.id, b1.id, b2.id]);
    });
  });

  describe("exportToSvg", () => {
    it("generates valid SVG with background and node primitives", () => {
      const rect = makeRectangle({
        x: 10,
        y: 20,
        width: 100,
        height: 60,
        cornerRadius: 8,
        fill: { type: "solid", color: "#FF0000", opacity: 1 },
      });
      const text = makeText({
        x: 10,
        y: 90,
        content: "Hello & <Nage>!",
        fontSize: 16,
        color: "#FFFFFF",
      });
      const frame = makeFrame({
        x: 0,
        y: 0,
        width: 300,
        height: 200,
        name: "Artboard & Test",
      });

      const svg = exportToSvg([frame, rect, text], "#000000");

      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('<rect width="100%" height="100%" fill="#000000"');
      expect(svg).toContain('rx="8"');
      expect(svg).toContain('fill="#FF0000"');
      // Escaped XML content
      expect(svg).toContain("Hello &amp; &lt;Nage&gt;!");
      expect(svg).toContain("Artboard &amp; Test");
    });

    it("exports image nodes with proper preserveAspectRatio based on objectFit", () => {
      const imgContain = {
        id: "img-1",
        name: "Contain Image",
        type: "image" as const,
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        naturalWidth: 800,
        naturalHeight: 600,
        visible: true,
        locked: false,
        opacity: 1,
        rotation: 0,
        storagePath: "https://example.com/contain.png",
        signedUrl: "https://example.com/contain.png",
        objectFit: "contain" as const,
        parentId: null,
      };

      const imgCover = {
        ...imgContain,
        id: "img-2",
        objectFit: "cover" as const,
      };

      const svgContain = exportToSvg([imgContain], "#000000");
      expect(svgContain).toContain('preserveAspectRatio="xMidYMid meet"');

      const svgCover = exportToSvg([imgCover], "#000000");
      expect(svgCover).toContain('preserveAspectRatio="xMidYMid slice"');
    });
  });

  describe("exportToJson", () => {
    it("serializes nodes with metadata that parses accurately", () => {
      const rect = makeRectangle({ name: "Card", width: 120, height: 80 });
      const jsonStr = exportToJson([rect], "My Test Project");
      const parsed = JSON.parse(jsonStr);

      expect(parsed.appName).toBe("Nage");
      expect(parsed.version).toBe(1);
      expect(parsed.projectName).toBe("My Test Project");
      expect(parsed.nodesCount).toBe(1);
      expect(parsed.nodes[0].id).toBe(rect.id);
      expect(parsed.nodes[0].name).toBe("Card");
    });
  });

  describe("Supabase Storage Utilities", () => {
    it("converts blob to data url", async () => {
      const blob = new Blob(["sample image content"], { type: "text/plain" });
      const dataUrl = await blobToDataUrl(blob);
      expect(dataUrl).toContain("data:text/plain;base64,");
    });

    it("passes through data:, blob:, and http: URLs in getAssetSignedUrl", async () => {
      expect(await getAssetSignedUrl("data:image/png;base64,abc")).toBe(
        "data:image/png;base64,abc"
      );
      expect(await getAssetSignedUrl("blob:http://localhost/123")).toBe(
        "blob:http://localhost/123"
      );
      expect(await getAssetSignedUrl("https://example.com/asset.png")).toBe(
        "https://example.com/asset.png"
      );
    });
  });
});
