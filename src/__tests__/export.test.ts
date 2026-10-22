import { describe, it, expect } from "vitest";
import {
  computeExportBounds,
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
