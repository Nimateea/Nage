import { describe, it, expect } from "vitest";
import { generateAgentDesign, NAGE_AI_SYSTEM_INSTRUCTION } from "@/lib/ai/prompts";
import { executeAiGeneration, testGeminiConnection } from "@/lib/ai/gemini";

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

  describe("generateAgentDesign", () => {
    it("generates a 5-color palette artboard when requested", () => {
      const result = generateAgentDesign("Create a color palette", "palette");
      expect(result.reply).toContain("Palette");
      expect(result.nodes.length).toBeGreaterThanOrEqual(6);

      const frame = result.nodes.find((n) => n.type === "frame");
      expect(frame).toBeDefined();
      expect(frame?.name).toContain("Palette");
    });

    it("generates an authentication modal when requested", () => {
      const result = generateAgentDesign("Design a login screen");
      expect(result.reply).toContain("authentication modal");

      const frame = result.nodes.find((n) => n.type === "frame");
      expect(frame).toBeDefined();
      expect(frame?.name).toBe("Sign In");

      const texts = result.nodes.filter((n) => n.type === "text");
      expect(texts.some((t) => t.type === "text" && t.content.includes("Welcome"))).toBe(true);
    });

    it("generates a pricing table when requested", () => {
      const result = generateAgentDesign("Create pricing plans table");
      expect(result.reply).toContain("pricing");

      const frame = result.nodes.find((n) => n.type === "frame");
      expect(frame).toBeDefined();
      expect(frame?.name).toBe("Pricing Plans");

      const cards = result.nodes.filter((n) => n.type === "rectangle" && n.name.includes("Card"));
      expect(cards.length).toBe(3);
    });

    it("generates a navigation bar when requested", () => {
      const result = generateAgentDesign("Create a navigation bar with logo");
      expect(result.reply).toContain("navigation header");

      const frame = result.nodes.find((n) => n.type === "frame");
      expect(frame).toBeDefined();
      expect(frame?.name).toBe("Navigation Bar");
    });

    it("generates analytics dashboard stats when requested", () => {
      const result = generateAgentDesign("Create analytics dashboard metrics");
      expect(result.reply).toContain("KPI metric");

      const frame = result.nodes.find((n) => n.type === "frame");
      expect(frame).toBeDefined();
      expect(frame?.name).toBe("Analytics Metrics");
    });

    it("synthesizes ANY custom arbitrary user prompt", () => {
      const result = generateAgentDesign("Crypto wallet portfolio card with send receive buttons");
      expect(result.reply).toContain("Synthesized custom");

      const frame = result.nodes.find((n) => n.type === "frame");
      expect(frame).toBeDefined();
      expect(frame?.name).toContain("Crypto Wallet");

      expect(result.nodes.length).toBeGreaterThan(4);
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

  describe("testGeminiConnection", () => {
    it("reports status gracefully when tested without a key", async () => {
      const status = await testGeminiConnection("placeholder-gemini-api-key");
      expect(status.success).toBe(false);
      expect(status.model).toBe("gemini-3.8-flash");
      expect(status.message).toContain("Agent Generative Synthesizer is active");
    });
  });
});
