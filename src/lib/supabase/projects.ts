"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "./server";
import type { Tables, Json } from "./types";
import { makeEmptyDocument } from "../canvas/document/defaults";

export type Project = Tables<"projects">;

// Helper to guarantee a row exists in public.profiles to satisfy foreign keys
async function ensureUserProfile(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> }
) {
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "User";
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ?? null;

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: displayName,
      avatar_url: avatarUrl,
    },
    { onConflict: "id" }
  );
}

// ── List user's projects ───────────────────────────────────────────────────────
export async function getProjectsAction(): Promise<Project[]> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  await ensureUserProfile(supabase, user);

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch projects:", error);
    return [];
  }

  return data ?? [];
}

// ── Create a new project ───────────────────────────────────────────────────────
export async function createProjectAction(name?: string, prompt?: string) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Ensure profile row exists to prevent foreign key constraint violations
  await ensureUserProfile(supabase, user);

  const title = (name && name.trim()) || "Untitled";

  // 1. Insert into projects
  const { data: project, error: pError } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      name: title,
    })
    .select()
    .single();

  if (pError || !project) {
    throw new Error(pError?.message ?? "Failed to create project");
  }

  // 2. Insert initial canvas document (optionally containing initial text node from prompt)
  const initialDoc = makeEmptyDocument();
  if (prompt && prompt.trim()) {
    initialDoc.nodes.push({
      id: "initial-prompt",
      type: "text",
      name: "Prompt",
      x: 0,
      y: 0,
      width: 320,
      height: 60,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      parentId: null,
      content: prompt.trim(),
      fontSize: 16,
      fontWeight: 400,
      color: "#ffffff",
      textAlign: "left",
    });
  }
  const { error: dError } = await supabase
    .from("project_documents")
    .insert({
      project_id: project.id,
      owner_id: user.id,
      document: initialDoc as unknown as Json,
      version: 1,
    });

  if (dError) {
    console.error("Failed to initialize project document:", dError);
  }

  revalidatePath("/dashboard");
  return project;
}

// ── Rename project ────────────────────────────────────────────────────────────
export async function renameProjectAction(projectId: string, newName: string) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const title = newName.trim() || "Untitled";

  const { error } = await supabase
    .from("projects")
    .update({ name: title })
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}

// ── Duplicate project ─────────────────────────────────────────────────────────
export async function duplicateProjectAction(projectId: string) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Fetch original project
  const { data: original, error: oError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .single();

  if (oError || !original) throw new Error("Project not found");

  // Fetch original document
  const { data: originalDoc } = await supabase
    .from("project_documents")
    .select("document")
    .eq("project_id", projectId)
    .single();

  // Create duplicate project
  const { data: duplicate, error: dError } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      name: `${original.name} copy`,
      thumbnail_url: original.thumbnail_url,
    })
    .select()
    .single();

  if (dError || !duplicate) throw new Error(dError?.message ?? "Duplicate failed");

  // Insert document for duplicate
  const docToCopy = originalDoc?.document ?? makeEmptyDocument();
  await supabase
    .from("project_documents")
    .insert({
      project_id: duplicate.id,
      owner_id: user.id,
      document: docToCopy as unknown as Json,
      version: 1,
    });

  revalidatePath("/dashboard");
  return duplicate;
}

// ── Delete project ─────────────────────────────────────────────────────────────
export async function deleteProjectAction(projectId: string) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}
