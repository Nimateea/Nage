import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProjectsAction } from "@/lib/supabase/projects";
import { NageApp, type NageUser } from "@/components/NageApp";

export const instant = false;

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialUser: NageUser | null = null;
  let projects: unknown[] = [];

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single();

    initialUser = {
      id: user.id,
      email: user.email,
      name:
        profile?.display_name ||
        (user.user_metadata?.full_name as string) ||
        user.email?.split("@")[0] ||
        "User",
      dp: profile?.avatar_url || "",
    };

    projects = await getProjectsAction();
  }

  return <NageApp initialUser={initialUser} initialProjects={projects} />;
}
