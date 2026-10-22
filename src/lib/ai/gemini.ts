import { GoogleGenAI } from "@google/genai";
import { getSupabaseAdminClient } from "../supabase/admin";
import type { AiGenerateRequest, AiGenerateResponse } from "./types";
import { NAGE_AI_SYSTEM_INSTRUCTION, generateFallbackDesign } from "./prompts";

const GEMINI_MODEL = "gemini-3.8-flash";
const HOURLY_LIMIT = 60;
const BURST_LIMIT = 10;

/**
 * Checks rate limits for a given user ID using Supabase security definer RPC functions.
 */
async function verifyRateLimits(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const admin = getSupabaseAdminClient();

    // 1. Check 1-minute burst limit (max 10 requests / min)
    const { data: burstAllowed } = await admin.rpc("check_rate_limit", {
      p_user_id: userId,
      p_action: "ai_generate",
      p_window_type: "burst",
      p_limit: BURST_LIMIT,
      p_duration: "1 minute",
    });

    if (burstAllowed === false) {
      return { allowed: false, remaining: 0 };
    }

    // 2. Check 1-hour quota limit (max 60 requests / hour)
    const { data: hourlyAllowed } = await admin.rpc("check_rate_limit", {
      p_user_id: userId,
      p_action: "ai_generate",
      p_window_type: "hourly",
      p_limit: HOURLY_LIMIT,
      p_duration: "1 hour",
    });

    if (hourlyAllowed === false) {
      return { allowed: false, remaining: 0 };
    }

    // Query remaining quota
    const { data: remaining } = await admin.rpc("get_rate_limit_remaining", {
      p_user_id: userId,
      p_action: "ai_generate",
      p_window_type: "hourly",
      p_limit: HOURLY_LIMIT,
    });

    return { allowed: true, remaining: remaining ?? HOURLY_LIMIT };
  } catch (err) {
    console.warn("Rate limit check failed, allowing request gracefully:", err);
    return { allowed: true, remaining: HOURLY_LIMIT };
  }
}

/**
 * Logs generation request and outcome to public.ai_generation_logs
 */
async function logAiGeneration(
  userId: string | null,
  projectId: string | null,
  prompt: string,
  model: string,
  status: "pending" | "done" | "error"
) {
  if (!userId) return;
  try {
    const admin = getSupabaseAdminClient();
    await admin.from("ai_generation_logs").insert({
      user_id: userId,
      project_id: projectId,
      prompt,
      model,
      status,
    });
  } catch (err) {
    console.warn("Failed to log AI generation:", err);
  }
}

/**
 * Main AI generation engine powering Nage's copilot.
 */
export async function executeAiGeneration(
  req: AiGenerateRequest,
  userId: string | null
): Promise<AiGenerateResponse> {
  // 1. Rate limiting
  let remainingQuota = HOURLY_LIMIT;
  if (userId) {
    const rateCheck = await verifyRateLimits(userId);
    if (!rateCheck.allowed) {
      return {
        success: false,
        text: "Rate limit reached. You can generate up to 60 designs per hour (10 per minute). Please try again shortly.",
        error: "RATE_LIMIT_EXCEEDED",
        rateLimitRemaining: 0,
        rateLimitTotal: HOURLY_LIMIT,
      };
    }
    remainingQuota = rateCheck.remaining;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const isRealApiKey =
    apiKey &&
    apiKey !== "placeholder-gemini-api-key" &&
    !apiKey.includes("placeholder");

  // 2. Real Gemini API call with @google/genai
  if (isRealApiKey) {
    try {
      const client = new GoogleGenAI({ apiKey });

      let contextInfo = "";
      if (req.selectedNodes && req.selectedNodes.length > 0) {
        contextInfo = `\nCurrently selected nodes on canvas:\n${JSON.stringify(
          req.selectedNodes.map((n) => ({
            id: n.id,
            name: n.name,
            type: n.type,
            x: n.x,
            y: n.y,
            width: n.width,
            height: n.height,
          }))
        )}`;
      }

      const fullPrompt = `${req.prompt}${contextInfo}`;

      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [{ text: fullPrompt }],
          },
        ],
        config: {
          systemInstruction: NAGE_AI_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText);

      await logAiGeneration(
        userId,
        req.projectId ?? null,
        req.prompt,
        GEMINI_MODEL,
        "done"
      );

      return {
        success: true,
        text: parsed.reply || "Design generated successfully.",
        generatedNodes: Array.isArray(parsed.nodes) ? parsed.nodes : undefined,
        rateLimitRemaining: remainingQuota,
        rateLimitTotal: HOURLY_LIMIT,
      };
    } catch (err: unknown) {
      console.warn("Gemini API call failed, falling back to design generator:", err);
      await logAiGeneration(
        userId,
        req.projectId ?? null,
        req.prompt,
        GEMINI_MODEL,
        "error"
      );
    }
  }

  // 3. Fallback generator (for offline mode, demo mode, or placeholder key)
  const fallback = generateFallbackDesign(req.prompt, req.task);

  await logAiGeneration(
    userId,
    req.projectId ?? null,
    req.prompt,
    "fallback-design-engine",
    "done"
  );

  return {
    success: true,
    text: fallback.reply,
    generatedNodes: fallback.nodes,
    rateLimitRemaining: remainingQuota,
    rateLimitTotal: HOURLY_LIMIT,
  };
}
