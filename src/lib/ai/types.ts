import type { CanvasNode } from "../canvas/document/types";

export type AiTaskType = "chat" | "design" | "copy" | "palette";

export interface AiGenerateRequest {
  prompt: string;
  task?: AiTaskType;
  projectId?: string;
  selectedNodes?: CanvasNode[];
}

export interface AiGenerateResponse {
  success: boolean;
  text: string;
  generatedNodes?: CanvasNode[];
  rateLimitRemaining?: number;
  rateLimitTotal?: number;
  error?: string;
}
