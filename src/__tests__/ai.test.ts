import { describe, it, expect } from "vitest";
import { generateFallbackDesign, NAGE_AI_SYSTEM_INSTRUCTION } from "@/lib/ai/prompts";
import { executeAiGeneration } from "@/lib/ai/gemini";

describe("AI Generation Engine", () => {
  describe("NAGE_AI_SYSTEM_INSTRUCTION", () => {
    it("specifies structured JSON schema and canvas node types", () => {
      expect(NAGE_AI_SYSTEM_INSTRUCTION).toContain("Nage");
      expect(NAGE_AI_SYSTEM_INSTRUCTION).toContain("frame");
      expect(NAGE_AI_SYSTEM_INSTRUCTION).toContain("rectangle");
      expect(NAGE_AI_SYSTEM_INSTRUCTION).toContain("text");
      expect(NAGE_AI_SYSTEM_INSTRUCTION).toContain("nodes");
    });
  });

  describe("generateFallbackDesign", () => {
    it("generates a 5-color palette artboard when requested", () => {
      const result = generateFallbackDesign("Create a color palette", "palette");
      expect(result.reply).toContain("palette");
      expect(result.nodes.length).toBeGreaterThanOrEqual(6); // 1 frame + 5 swatches + labels

      const frame = result.nodes.find((n) => n.type === "frame");
      expect(frame).toBeDefined();
      expect(frame?.name).toBe("Color Palette");
    });

    it("generates 3 feature cards when requested", () => {
      const result = generateFallbackDesign("Make feature cards grid");
      expect(result.reply).toContain("feature cards");

      const frame = result.nodes.find((n) => n.type === "frame");
      expect(frame).toBeDefined();
      expect(frame?.name).toBe("Feature Highlights");

      const rects = result.nodes.filter((n) => n.type === "rectangle");
      expect(rects.length).toBe(3);
    });

    it("generates a hero section by default", () => {
      const result = generateFallbackDesign("Make a design for a fintech app");
      expect(result.reply).toContain("Hero layout");

      const frame = result.nodes.find((n) => n.type === "frame");
      expect(frame).toBeDefined();
      expect(frame?.name).toBe("Hero Section");

      const texts = result.nodes.filter((n) => n.type === "text");
      expect(texts.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("executeAiGeneration", () => {
    it("returns formatted design response with rate limit quota", async () => {
      const response = await executeAiGeneration(
        { prompt: "Modern landing page", task: "design" },
        null // guest / demo user
      );

      expect(response.success).toBe(true);
      expect(typeof response.text).toBe("string");
      expect(Array.isArray(response.generatedNodes)).toBe(true);
      expect(response.rateLimitRemaining).toBe(60);
      expect(response.rateLimitTotal).toBe(60);
    });
  });
});
