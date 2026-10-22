import { NextResponse } from "next/server";
import { testGeminiConnection } from "@/lib/ai/gemini";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const keyParam = url.searchParams.get("key") || undefined;
  const result = await testGeminiConnection(keyParam);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await testGeminiConnection(body?.apiKey);
    return NextResponse.json(result);
  } catch {
    const result = await testGeminiConnection();
    return NextResponse.json(result);
  }
}
