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

    it("generates a movie storyboard with shots, angles, dialogue from script", () => {
      const script = "EXT. RAIN HIGHWAY - NIGHT. John checks his watch. The tracker blinks.";
      const result = generateAgentDesign(
        "Generate storyboard",
        "storyboard",
        undefined,
        undefined,
        script
      );
      expect(result.reply).toContain("storyboard");
      const frame = result.nodes.find((n) => n.type === "frame");
      expect(frame).toBeDefined();
      expect(frame?.name).toContain("Storyboard");

      // Verify cinematic shot cards and angle tags
      const cards = result.nodes.filter(
        (n) => n.type === "rectangle" && n.name.includes("Shot")
      );
      expect(cards.length).toBeGreaterThanOrEqual(4);

      // Verify scouted photographic images from Unsplash / Pexels
      const photos = result.nodes.filter((n) => n.type === "image");
      expect(photos.length).toBeGreaterThanOrEqual(4);

      // Verify thoughts and step-by-step progress trace
      expect(result.thoughts).toBeDefined();
      expect(result.thoughts?.length).toBeGreaterThan(0);
      expect(result.steps).toBeDefined();
      expect(result.steps?.length).toBeGreaterThan(0);
      expect(result.steps?.some((s) => s.source === "Unsplash")).toBe(true);

      const angleTags = result.nodes.filter(
        (n) => n.type === "text" && (n.content.includes("WIDE") || n.content.includes("SHOT"))
      );
      expect(angleTags.length).toBeGreaterThanOrEqual(1);
    });

    it("generates a creative direction moodboard with palette and typography", () => {
      const result = generateAgentDesign(
        "Create moodboard for Scandinavian Minimalist Interior",
        "moodboard"
      );
      expect(result.reply).toContain("Moodboard");
      const frame = result.nodes.find((n) => n.type === "frame");
      expect(frame).toBeDefined();
      expect(frame?.name).toContain("Moodboard");

      // Verify color palette swatches
      const swatches = result.nodes.filter(
        (n) => n.type === "rectangle" && n.name.includes("Swatch")
      );
      expect(swatches.length).toBe(5);

      // Verify typography samples
      const texts = result.nodes.filter(
        (n) => n.type === "text" && n.content.includes("Aa")
      );
      expect(texts.length).toBeGreaterThanOrEqual(1);
    });

    it("generates a UI wireframe from a Pinterest board description", () => {
      const result = generateAgentDesign(
        "Create a wireframe based on an editorial Pinterest board with clean grid and product showcase",
        "wireframe"
      );
      expect(result.reply).toContain("wireframe");
      const frame = result.nodes.find((n) => n.type === "frame");
      expect(frame).toBeDefined();
      expect(frame?.name).toContain("Wireframe");

      // Verify modular cards
      const cards = result.nodes.filter(
        (n) => n.type === "rectangle" && n.name.includes("Card")
      );
      expect(cards.length).toBeGreaterThanOrEqual(3);
    });

    it("generates vector illustration with atmospheric depth and image reference support", () => {
      const sampleDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
      const result = generateAgentDesign(
        "Create vector illustration of a futuristic skyline",
        "illustration",
        undefined,
        sampleDataUrl
      );
      expect(result.reply.toLowerCase()).toContain("illustration");
      const frame = result.nodes.find((n) => n.type === "frame");
      expect(frame).toBeDefined();
      expect(frame?.name).toContain("Illustration");

      // Verify image nodes created for attached reference and converted vector illustration
      const images = result.nodes.filter((n) => n.type === "image");
      expect(images.length).toBeGreaterThanOrEqual(1);

      // Verify extracted color swatches and vector silhouette nodes
      const swatches = result.nodes.filter(
        (n) => n.type === "rectangle" && n.name.includes("Swatch")
      );
      expect(swatches.length).toBe(5);

      // Verify thoughts and steps are provided
      expect(result.thoughts).toBeDefined();
      expect(result.steps).toBeDefined();
    });

    it("dynamically sizes illustration artboard to match image aspect ratio without stretching", () => {
      const sampleDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

      // 1. Landscape 16:9 photo (1920x1080)
      const landscapeResult = generateAgentDesign(
        "Convert image to illustration",
        "illustration",
        undefined,
        sampleDataUrl,
        undefined,
        sampleDataUrl,
        ["#000000", "#111111", "#222222", "#333333", "#444444"],
        1920,
        1080
      );

      const landscapeImages = landscapeResult.nodes.filter((n) => n.type === "image");
      expect(landscapeImages.length).toBe(2);
      // Both images should share identical width & height matching aspect ratio
      expect(landscapeImages[0].width).toBe(landscapeImages[1].width);
      expect(landscapeImages[0].height).toBe(landscapeImages[1].height);
      // Width should be larger than height for landscape
      expect(landscapeImages[0].width).toBeGreaterThan(landscapeImages[0].height);

      // 2. Portrait 9:16 photo (1080x1920)
      const portraitResult = generateAgentDesign(
        "Convert image to illustration",
        "illustration",
        undefined,
        sampleDataUrl,
        undefined,
        sampleDataUrl,
        undefined,
        1080,
        1920
      );

      const portraitImages = portraitResult.nodes.filter((n) => n.type === "image");
      expect(portraitImages.length).toBe(2);
      expect(portraitImages[0].width).toBe(portraitImages[1].width);
      expect(portraitImages[0].height).toBe(portraitImages[1].height);
      // Height should be larger than width for portrait
      expect(portraitImages[0].height).toBeGreaterThan(portraitImages[0].width);
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
