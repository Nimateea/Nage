import React from "react";
import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { EditorShell } from "@/components/editor/EditorShell";
import { makeEmptyDocument } from "@/lib/canvas/document/defaults";
import type { CanvasDocument } from "@/lib/canvas/document/types";
import type { Json } from "@/lib/supabase/types";

export const instant = false;

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .single();

  if (!project) notFound();

  // Fetch or initialize project document
  const { data: docRecord } = await supabase
    .from("project_documents")
    .select("*")
    .eq("project_id", projectId)
    .single();

  let document: CanvasDocument = makeEmptyDocument();

  if (docRecord && docRecord.document) {
    document = docRecord.document as unknown as CanvasDocument;
  } else {
    // Initialize default document if none exists yet
    await supabase.from("project_documents").insert({
      project_id: projectId,
      owner_id: user.id,
      document: document as unknown as Json,
      version: 1,
    });
  }

  return (
    <EditorShell
      project={project}
      initialDocument={document}
      userEmail={user.email}
    />
  );
}
