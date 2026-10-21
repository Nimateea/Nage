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

  redirect("/dashboard");
}
