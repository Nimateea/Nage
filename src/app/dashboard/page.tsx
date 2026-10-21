import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProjectsAction } from "@/lib/supabase/projects";
import { ProjectGrid } from "@/components/dashboard/ProjectGrid";
import { redirect } from "next/navigation";

// Tell Next.js 16 (cacheComponents mode) this route is dynamic per-request
export const instant = false;

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const displayName =
    (profile as { display_name?: string | null } | null)?.display_name ??
    user.email?.split("@")[0] ??
    "there";

  const projects = await getProjectsAction();

  return (
    <ProjectGrid
      initialProjects={projects}
      userEmail={user.email}
      displayName={displayName}
      avatarUrl={profile?.avatar_url}
    />
  );
}
