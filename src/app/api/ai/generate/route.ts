import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { executeAiGeneration } from "@/lib/ai/gemini";
import type { AiGenerateRequest } from "@/lib/ai/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AiGenerateRequest;

    if (!body || !body.prompt || typeof body.prompt !== "string") {
      return NextResponse.json(
        { success: false, error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Try to get authenticated user (optional in demo/guest mode)
    let userId: string | null = null;
    try {
      const supabase = await getSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // In demo mode or offline, user is null
    }

    const result = await executeAiGeneration(body, userId);

    if (!result.success && result.error === "RATE_LIMIT_EXCEEDED") {
      return NextResponse.json(result, { status: 429 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error("AI Generate Route Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error occurred while processing AI request.",
      },
      { status: 500 }
    );
  }
}
