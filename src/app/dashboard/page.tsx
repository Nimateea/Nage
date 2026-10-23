import { NageApp, type NageUser } from "@/components/NageApp";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProjectsAction } from "@/lib/supabase/projects";

export const instant = false;

export default async function DashboardPage() {
  let initialUser: NageUser | null = null;
  let projects: unknown[] = [];

  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

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
  } catch {
    // Guest fallback
  }

  return <NageApp initialUser={initialUser} initialProjects={projects} />;
}
