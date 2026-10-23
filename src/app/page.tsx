import { NageApp, type NageUser } from "@/components/NageApp";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProjectsAction } from "@/lib/supabase/projects";
import { redirect } from "next/navigation";

export const instant = false;

interface RootPageProps {
  searchParams: Promise<{ code?: string; next?: string; type?: string }>;
}

export default async function RootPage({ searchParams }: RootPageProps) {
  const { code, next, type } = await searchParams;

  // If Supabase falls back to the Site URL root with ?code=, forward it to the callback handler
  if (code) {
    const params = new URLSearchParams({ code });
    if (next) params.set("next", next);
    if (type) params.set("type", type);
    redirect(`/api/auth/callback?${params.toString()}`);
  }

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
