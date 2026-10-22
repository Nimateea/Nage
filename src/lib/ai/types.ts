import type { CanvasNode } from "../canvas/document/types";

export type AiTaskType =
  | "chat"
  | "design"
  | "copy"
  | "palette"
  | "storyboard"
  | "moodboard"
  | "wireframe"
  | "illustration";

export interface AiGenerateRequest {
  prompt: string;
  task?: AiTaskType;
  projectId?: string;
  selectedNodes?: CanvasNode[];
  apiKey?: string;
  camera?: { x: number; y: number; zoom: number };
  attachedImage?: string; // Base64 data URL or asset URL
  attachedScript?: string; // Script text or screenplay excerpt
}

export interface AiGenerateResponse {
  success: boolean;
  text: string;
  generatedNodes?: CanvasNode[];
  rateLimitRemaining?: number;
  rateLimitTotal?: number;
  error?: string;
}
