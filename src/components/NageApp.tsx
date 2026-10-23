"use client";

import React, { useEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface NageUser {
  id: string;
  email?: string;
  name: string;
  dp?: string;
}

interface NageAppProps {
  initialUser?: NageUser | null;
  initialProjects?: unknown[];
}

export function NageApp({ initialUser, initialProjects }: NageAppProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Provide Supabase Auth bridge to window.__nage_auth
    const supabase = getSupabaseBrowserClient();

    (window as unknown as { __nage_initialUser?: NageUser | null }).__nage_initialUser = initialUser;
    (window as unknown as { __nage_initialProjects?: unknown[] }).__nage_initialProjects = initialProjects;

    (window as unknown as { __nage_auth?: Record<string, unknown> }).__nage_auth = {
      async getSession() {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return null;
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", user.id)
            .single();
          return {
            id: user.id,
            email: user.email,
            name:
              profile?.display_name ||
              (user.user_metadata?.full_name as string) ||
              user.email?.split("@")[0] ||
              "User",
            dp: profile?.avatar_url || "",
          };
        } catch {
          return null;
        }
      },
      async signIn(email: string, password: string) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (error) return { error: error.message };
          const user = data.user;
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", user.id)
            .single();
          return {
            user: {
              id: user.id,
              email: user.email,
              name:
                profile?.display_name ||
                (user.user_metadata?.full_name as string) ||
                user.email?.split("@")[0] ||
                "User",
              dp: profile?.avatar_url || "",
            },
          };
        } catch (e: unknown) {
          return { error: (e as Error)?.message || "Failed to sign in" };
        }
      },
      async signUp(email: string, password: string, name: string) {
        try {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: { full_name: name },
              emailRedirectTo: `${window.location.origin}/api/auth/callback`,
            },
          });
          if (error) return { error: error.message };
          const user = data.user;
          return {
            user: user
              ? {
                  id: user.id,
                  email: user.email,
                  name: name || user.email?.split("@")[0] || "User",
                  dp: "",
                }
              : null,
            needsConfirmation: !data.session,
          };
        } catch (e: unknown) {
          return { error: (e as Error)?.message || "Failed to sign up" };
        }
      },
      async signInWithGoogle() {
        try {
          await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
            },
          });
        } catch (e: unknown) {
          console.error("Google OAuth error:", e);
        }
      },
      async resetPassword(email: string) {
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/api/auth/callback?type=recovery`,
          });
          if (error) return { error: error.message };
          return { success: true };
        } catch (e: unknown) {
          return { error: (e as Error)?.message || "Failed to send reset email" };
        }
      },
      async signOut() {
        try {
          await supabase.auth.signOut();
        } catch (e: unknown) {
          console.error("Sign out error:", e);
        }
      },
    };

    (window as unknown as { __nage_db?: Record<string, unknown> }).__nage_db = {
      async createProject(title: string, prompt?: string) {
        try {
          const { createProjectAction } = await import("@/lib/supabase/projects");
          const project = await createProjectAction(title, prompt);
          return project;
        } catch (e: unknown) {
          console.warn("createProjectAction error:", e);
          return null;
        }
      },
      async renameProject(projectId: string, newName: string) {
        try {
          const { renameProjectAction } = await import("@/lib/supabase/projects");
          await renameProjectAction(projectId, newName);
        } catch (e: unknown) {
          console.warn("renameProjectAction error:", e);
        }
      },
      async duplicateProject(projectId: string) {
        try {
          const { duplicateProjectAction } = await import("@/lib/supabase/projects");
          const dup = await duplicateProjectAction(projectId);
          return dup;
        } catch (e: unknown) {
          console.warn("duplicateProjectAction error:", e);
          return null;
        }
      },
      async deleteProject(projectId: string) {
        try {
          const { deleteProjectAction } = await import("@/lib/supabase/projects");
          await deleteProjectAction(projectId);
        } catch (e: unknown) {
          console.warn("deleteProjectAction error:", e);
        }
      },
      async saveProject(projectId: string, docData: Record<string, unknown>) {
        try {
          const { saveProjectDocumentAction } = await import("@/lib/supabase/projects");
          await saveProjectDocumentAction(projectId, docData);
        } catch (e: unknown) {
          console.warn("saveProjectDocumentAction error:", e);
        }
      },
    };

    if (initializedRef.current || !containerRef.current) return;
    initializedRef.current = true;

    // Load Inter font if not already loaded
    if (!document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap";
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.id = "nage-core-engine";
    script.type = "text/javascript";
    script.src = "/nage-engine.js";
    document.body.appendChild(script);

    return () => {
      const sc = document.getElementById("nage-core-engine");
      if (sc) sc.remove();
    };
  }, [initialUser, initialProjects]);

  return (
    <div ref={containerRef} className="w-full h-full relative select-none bg-black text-white overflow-hidden">
      {/* ── View 1: Empty / Dashboard ────────────────────────────────────── */}
      <div id="view-empty" className="w-full h-full flex flex-col relative">
        <header className="w-full flex justify-between items-center px-10 py-8 absolute top-0 left-0 z-10">
          <div className="nage-logo">nage</div>
          <div className="flex items-center gap-4">
            <button id="btn-new-project" className="btn-new-project px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 cursor-pointer">
              New Project
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button id="btn-dp" className="dp" title="Profile" aria-label="Profile" />
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center p-6 mt-16">
          <div id="empty-state" className="dashed-container">
            <div className="mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="178" height="120" viewBox="0 0 178 120" fill="none">
                <rect x="107.364" width="81.5632" height="83.2277" rx="13.3164" transform="rotate(30 107.364 0)" fill="#0A0A0A" />
                <rect width="81.5632" height="83.2277" rx="13.3164" transform="matrix(0.866019 -0.500012 -0.500012 -0.866019 41.6147 112.859)" fill="#0D0D0D" />
                <rect width="81.5632" height="83.2277" rx="13.3164" transform="matrix(1 0 0 -1 47.9124 119.221)" fill="#0F0F0F" />
              </svg>
            </div>
            <h2 className="text-white font-medium text-[15px] mb-2">No Project yet!</h2>
            <p className="text-[#555555] text-[13px]">Click on the New project button to create a project</p>
          </div>
          <div id="dash-bar" className="hide">
            <button id="sort-btn" className="moodboard-btn" />
            <button id="flt-btn" className="moodboard-btn" />
          </div>
          <div id="project-grid" className="hide" />
        </main>
      </div>

      {/* ── View 2: Prompt ──────────────────────────────────────────────── */}
      <div id="view-prompt" className="w-full h-full flex flex-col items-center justify-center relative hide">
        <button id="btn-back-dash" className="nav-link absolute top-8 left-10 cursor-pointer" title="Back to projects">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <button id="btn-dp2" className="dp absolute top-8 right-10 hide" title="Profile" aria-label="Profile" />

        <div className="absolute top-8 right-10 flex items-center gap-8">
          <a href="#" className="nav-link">
            Login
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </a>
          <a href="#" className="nav-link">
            Create an account
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </a>
        </div>

        <div className="mb-10">
          <div id="logo-home" className="nage-logo cursor-pointer">nage</div>
        </div>

        <div className="prompt-box">
          <textarea className="prompt-textarea" placeholder="Tell me about your project :)" />
          <div className="flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <button className="icon-btn cursor-pointer" title="Add attachment" aria-label="Add attachment">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <button className="icon-btn cursor-pointer" title="More options" aria-label="More options">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="19" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="5" cy="12" r="1.5" fill="currentColor" />
                </svg>
              </button>
            </div>

            <div className="flex gap-4 items-center">
              <button className="icon-btn cursor-pointer" title="Camera" aria-label="Camera">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
              <button className="icon-btn cursor-pointer" title="Voice dictation" aria-label="Voice dictation">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
              <button className="upload-btn" title="Create project" aria-label="Create project">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center gap-3 mt-4 w-full max-w-[640px]">
          {/* Illustrations */}
          <div className="action-card">
            <span className="action-card-title">Illustrations</span>
            <div className="w-full flex-grow flex justify-center items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="58" height="37" viewBox="0 0 60 39" fill="none" style={{ strokeWidth: "6.665px", stroke: "#1B1B1B" }}>
                <path d="M1.14203 14.4961C2.04079 14.2259 3.31086 14.0276 4.29109 13.9206C4.59665 13.887 4.48998 14.0948 4.70323 14.0789C5.12291 14.0468 5.47758 13.869 5.89548 13.8476C6.03513 13.841 5.93866 14.1542 6.08351 14.1411C6.58465 14.0947 7.05048 13.9742 7.52385 13.8545C7.7866 13.7882 8.04726 13.7214 8.32105 13.6658C9.70817 13.3809 11.2323 12.9709 12.7118 12.6196C15.1091 12.043 17.4821 11.4557 19.8964 10.8536C20.7162 10.6492 21.673 10.495 22.5848 10.2831C23.104 10.1623 23.6077 10.023 24.0645 9.84532C24.2134 9.78723 24.0522 9.57892 24.0754 9.55089C24.437 9.11937 24.4297 9.63906 24.7421 9.61349C25.9851 9.50979 27.2652 9.11772 28.3089 8.62239C28.3534 8.60135 28.3871 8.57951 28.4124 8.55736C28.6512 8.35359 28.1773 8.13607 28.6934 8.20507C28.7327 8.21005 28.7057 8.49891 28.8439 8.4766C29.1655 8.42235 29.7019 8.17123 29.9432 8.10314C30.3973 7.9773 30.4729 7.94631 30.8897 7.79465C31.4672 7.58712 32.1926 7.45833 32.793 7.18006C32.9199 7.12036 32.6541 6.93151 32.8524 6.81223C33.0478 6.69366 33.6228 6.51552 33.8347 6.5099C34.0482 6.50326 34.0334 6.73061 34.083 6.76453C34.4888 7.05406 34.9758 6.30233 35.0623 6.26178C35.6713 5.9678 36.301 5.78371 36.9231 5.66306C37.7712 5.5007 38.6193 5.40345 39.4875 5.18841C40.3644 4.9704 41.2798 4.67992 42.1589 4.4583C42.3648 4.40572 42.5717 4.35118 42.7766 4.29945C43.9038 4.0158 44.9122 3.79286 46.1345 3.44469C46.1722 3.4341 46.2233 3.41895 46.2684 3.40476C46.3852 3.3683 46.1618 3.10626 46.2992 3.06204C47.8582 2.54428 49.5261 2.01783 51.2347 1.71729C51.4069 1.68699 51.2742 2.01639 51.4508 2.00208C52.0482 1.95041 52.8519 1.94312 53.5056 1.73375C54.0539 1.55926 54.5007 1.27519 54.6768 0.690472C55.262 0.608387 55.914 0.528417 56.4735 0.550461C56.6068 0.558328 56.7493 0.568247 56.8981 0.586993C57.1388 0.616022 57.1758 0.72818 57.2048 0.802334C57.2543 0.880379 57.2119 0.900491 57.6569 0.813919C57.7788 0.801316 57.7767 0.731733 57.7744 0.658293C57.7916 0.595822 57.7361 0.480671 58.1406 0.567863C58.1874 0.580904 58.2424 0.599296 58.2984 0.6227C58.4663 0.691405 58.6358 0.742821 58.9173 1.00603C59.0452 1.13096 59.2294 1.36494 59.3079 1.69191C59.3934 2.02838 59.326 2.37349 59.238 2.58003C59.0467 3.00485 58.8827 3.11765 58.747 3.25252C58.6147 3.37079 58.4994 3.45327 58.3937 3.52588C57.9725 3.80722 57.6332 3.97968 57.3292 4.20334C57.2055 4.2941 57.3435 4.48945 57.3231 4.54627C57.1431 5.01271 56.3912 4.73377 56.2658 4.74819C55.4816 4.84049 54.9711 5.13652 54.5387 5.45253C54.4158 5.5422 54.2888 5.63302 54.1543 5.72329C53.9819 5.8388 54.3635 5.9621 54.2034 6.08286C53.3713 6.70498 52.4674 7.26743 51.5719 7.7038C51.3728 7.80017 51.3874 7.46398 51.2848 7.49843C50.8319 7.65621 51.036 8.13369 50.6291 8.28933C50.5447 8.32257 50.4491 8.10646 50.4212 8.09536C49.9739 7.92717 50.154 8.50505 50.1288 8.54298C50.1132 8.56476 50.0969 8.58598 50.085 8.60236C49.3833 9.32894 48.607 9.16244 47.9351 9.67593C47.8507 9.73962 48.2062 9.866 47.9585 10.03C47.1955 10.5339 46.3875 10.9844 45.5806 11.3947C44.7746 11.8091 43.863 12.3743 42.9861 12.8586C42.7311 13.0016 42.7677 12.7019 42.7371 12.6908C42.2446 12.528 42.4266 13.0995 42.363 13.1734C41.854 13.7442 41.0055 13.7906 41.0053 14.638C40.3366 15.0716 39.6904 15.5375 39.0504 16.0125C37.0874 17.4717 35.0727 18.8953 32.7577 19.6974C32.7195 19.7113 32.6438 19.4328 32.5659 19.4628C31.7845 19.7561 31.9131 20.0256 31.866 20.5517C31.8511 20.6436 31.8294 20.7438 31.7959 20.8542C31.7373 21.0494 30.9841 20.777 30.9214 20.7628C30.6956 20.7049 30.6009 20.2692 30.5387 20.2703C30.0267 20.2956 30.8521 21.3949 30.3756 21.7221C30.3593 21.7305 30.2787 21.479 30.2243 21.4859C30.0552 21.5065 29.9868 21.6764 29.8161 21.6896C29.421 21.7209 28.9333 21.2473 28.732 21.8707C28.7074 21.9509 29.2447 22.5227 28.8015 22.7997C28.6241 22.9089 27.8889 23.4694 27.6499 23.5856C27.4113 23.7006 27.4042 23.3926 27.383 23.3948C26.6202 23.5498 26.7513 23.2803 26.1754 23.0963C25.6026 22.9118 26.374 23.7938 26.337 23.9834C26.2962 24.176 25.7131 24.2615 25.5511 24.2579C25.3907 24.2544 25.431 24.0309 25.3057 24.0531C24.4899 24.185 25.3566 24.7205 25.2351 25.0221C25.182 25.1429 25.1056 25.2325 25.0134 25.2957C24.6822 25.5395 24.0347 25.2228 23.625 25.3981C23.4924 25.4551 23.6961 25.5595 23.5991 25.6431C23.214 25.9727 22.8117 25.9123 22.4658 26.4349C22.4091 26.5202 22.3063 27.2108 21.8435 27.0574C21.7775 27.0349 21.7607 26.7876 21.5533 26.8659C21.3501 26.9423 21.059 27.0893 20.8115 27.2507C20.6803 27.3364 20.5603 27.4254 20.4709 27.5109C20.2785 27.694 20.7211 27.8378 20.3819 27.9178C20.2313 27.9521 20.3529 27.6339 20.0806 27.7119C19.8109 27.7902 19.2175 28.1436 18.9905 28.2756C18.7647 28.4088 19.0202 28.5758 19.0106 28.6019C18.9481 28.756 18.5653 29.1105 18.5263 29.1307C18.4387 29.1793 18.3513 29.2267 18.2639 29.273C17.4301 29.7104 16.5832 30.2374 15.6237 30.6886C14.7544 31.0839 13.9125 31.6372 13.0126 32.225C12.9827 32.2441 12.9529 32.2628 12.9231 32.2812C12.7571 32.3809 13.0004 32.5747 12.9764 32.5925C12.4134 32.9908 12.5718 32.085 12.0908 32.0152C12.3347 32.454 12.1265 32.5247 11.9025 32.6467C11.8575 32.672 11.8226 32.6952 11.7993 32.7179C11.7445 32.7716 11.8792 32.7529 11.9254 32.7884C11.9694 32.8352 11.9494 32.9358 11.9807 32.9233C12.012 32.9096 12.0549 32.8844 12.1104 32.8229C12.1379 32.792 12.1685 32.7512 12.1981 32.6951C12.2444 32.6063 12.3002 32.4188 12.2658 32.2208C12.2355 32.0202 12.1202 31.8475 12.0224 31.7557C11.903 31.6492 11.9041 31.6585 11.8545 31.625C11.7768 31.5776 11.7255 31.5579 11.6888 31.543C11.5618 31.496 11.5946 31.4985 11.5875 31.4931C11.5949 31.4882 11.6393 31.5124 11.6751 31.549C11.7458 31.6226 11.8303 31.7462 11.8537 31.7888C12.0766 32.0962 12.2267 31.6797 12.3844 31.8787C12.5482 32.0747 12.2984 32.443 12.686 32.3771C12.7608 32.1555 12.389 31.669 12.6663 31.5347C13.6961 31.0302 15.833 31.0307 16.7327 30.8981C17.6314 30.7655 17.9108 30.6718 18.4511 30.6505C18.6262 30.6439 18.7632 30.6288 18.8596 30.6094C19.3175 30.5189 19.1275 30.244 19.5984 30.0311C20.172 29.7749 20.001 30.7901 20.1118 30.99C20.2202 31.1903 20.2845 30.9629 20.4016 31.0662C20.5181 31.1696 20.3127 31.3392 20.5596 31.3539C20.8065 31.3691 21.427 30.9133 21.4823 30.6815C21.6007 30.1917 21.2443 29.7447 21.8908 29.8289C21.9281 29.8339 21.8486 30.1074 21.9901 30.1133C22.1659 30.1191 22.3421 30.1188 22.5187 30.1136C23.4915 30.0812 24.4608 29.9678 25.4129 29.9202C25.5685 29.9124 25.4937 30.2232 25.5858 30.2215C26.5386 30.1937 26.1242 29.7991 26.4462 29.1651C26.4501 29.1578 26.4541 29.1504 26.4582 29.1429C26.4629 29.1886 26.469 29.2327 26.4763 29.2754C26.4954 29.3843 26.5223 29.4833 26.5572 29.5717C26.7271 29.9968 27.0761 30.1756 27.6091 30.0445C28.0231 29.9435 27.8765 29.6569 28.0926 29.3755C28.1574 29.2907 28.5035 29.4277 28.5215 29.2712C28.5814 28.759 28.1777 28.3031 28.9364 28.3358C28.9699 28.3379 28.9355 28.619 29.0467 28.6076C29.7176 28.5376 29.7258 28.0872 30.2881 27.8123C30.329 27.7925 30.3721 27.7736 30.4185 27.7556C30.9868 27.5362 32.1038 27.5176 32.7674 27.3472C33.0072 28.1204 33.5761 27.7322 33.631 27.1181C33.6558 27.1106 33.6805 27.1029 33.7054 27.095C34.1201 26.9614 34.549 26.7888 34.9644 26.7261C35.116 26.703 35.0961 26.9565 35.1222 26.9744C35.5234 27.2586 35.5392 26.6828 35.6258 26.632C36.1688 26.3283 36.7125 26.2439 37.2322 26.0905C37.6224 25.9751 38.0006 25.8331 38.365 25.5473C38.3949 25.5234 38.2929 24.9675 38.6696 25.2845C38.6944 25.3067 38.4448 25.6456 38.9079 25.5312C39.3713 25.4166 40.3141 25.4639 40.8733 25.0331C41.0094 24.9291 41.2661 24.381 41.6734 24.6319C41.728 24.6662 41.7288 24.8339 41.8134 24.9023C42.078 25.1119 42.0315 24.5815 42.3575 24.9016C42.3688 24.9125 42.3805 24.9243 42.3927 24.9373C42.7578 25.3298 43.3421 25.5284 43.8742 25.0054C43.8919 24.9895 43.9015 24.5134 44.1013 24.4548C44.4204 24.3619 44.8981 24.2991 45.226 24.1833C45.3835 24.1276 45.1916 23.8982 45.2173 23.8839C45.7746 23.6012 46.2817 23.4627 46.8296 23.3628C47.266 23.2845 47.7244 23.2228 48.2516 23.1202C48.4659 23.0784 48.9805 22.5388 49.4717 22.7269C50.0057 22.936 49.8677 24.3725 50.8039 23.8246C50.9138 23.7619 51.0054 23.5672 51.1048 23.3388C51.3651 22.7727 51.6384 21.9876 52.3099 22.5034C52.4726 22.4443 52.6539 22.3944 52.7716 22.3935C52.8602 22.3905 52.9011 22.4324 52.8733 22.3957C52.876 22.3697 52.8659 22.4638 52.8199 22.5363C52.7317 22.6928 52.5911 22.8516 52.451 23.0016C52.1662 23.311 51.8487 23.5732 51.5737 23.9876C51.3394 24.3654 51.1508 24.7706 51.0298 25.2151C51.0106 25.2835 51.3478 25.6933 51.2727 25.8317C51.1597 26.0379 50.8992 26.0571 50.8131 26.2041C50.4699 26.7812 50.374 27.4121 50.121 27.9972C50.1043 28.0358 50.0871 28.0738 50.0691 28.1111C49.9556 28.3463 49.7777 28.1686 49.6395 28.4465C49.5011 28.7208 49.6939 29.042 49.3698 29.3546C49.123 29.5892 48.421 29.564 48.1578 29.8589C48.6829 30.192 48.5317 30.4312 48.3752 30.9459C48.3444 31.0459 48.5835 31.082 48.578 31.1359C48.5586 31.359 48.3076 31.399 48.3022 31.6155C48.3005 31.6681 48.4724 31.7934 48.4813 31.8427C48.5023 31.9521 48.4751 32.0395 48.4221 32.1098C48.2378 32.3592 47.8214 32.4264 47.7328 32.437C47.2733 32.4973 47.3801 32.7911 47.114 32.9002C46.8501 33.0045 46.9912 32.6194 46.736 32.786C46.4579 32.9667 46.1811 33.2138 45.9177 33.4779C45.6754 33.7215 45.4597 33.9825 45.2651 34.2092C45.1025 34.4015 45.4312 34.4499 45.413 34.4816C45.1415 34.9245 44.5835 35.1439 44.845 35.7207C44.2537 35.4447 44.1603 35.4681 44.1863 35.6171L44.1929 35.6093C44.2152 35.8113 44.4461 36.2145 44.0665 36.4331C44.0146 36.4623 43.4135 36.108 43.4782 35.8589C43.5268 35.6751 43.7556 35.5495 43.9124 35.3618L43.8961 35.3811C43.9453 35.3166 43.9848 35.2428 44.0027 35.1542C44.0194 35.0747 43.7736 34.3444 43.7794 34.2744C43.8228 33.7292 44.6707 34.326 44.7289 34.3441C45.3731 34.5203 45.1673 33.6785 45.2291 33.5365C45.2992 33.3642 45.3896 33.2141 45.4916 33.0773C45.7435 32.7342 46.0369 32.4939 46.195 32.1504C46.3368 31.8423 45.847 31.3732 46.0092 31.2148C46.2079 31.0183 46.4388 30.956 46.6442 30.8907C47.0688 30.6662 47.4077 30.525 47.2388 29.8518C47.1785 29.622 46.476 29.3617 47.249 29.2098C47.2952 29.2066 47.9694 29.1005 47.7846 28.721C47.7611 28.6742 47.569 28.5762 47.5713 28.5321C47.5888 28.2398 47.8221 28.1523 47.8743 27.8429C47.9118 27.6185 47.9398 27.3545 48.0293 27.1121C48.0674 27.0102 48.1156 26.911 48.1766 26.82C48.3105 26.6189 48.8005 26.5034 48.9361 26.4412C49.3231 26.2681 49.0431 25.7647 49.4383 25.73C49.8344 25.6983 50.1457 26.2649 50.5651 25.9003C50.0676 25.6419 49.5679 25.3537 49.0739 25.0809C49.4002 24.4336 49.7908 23.8248 50.2394 23.1764C50.7229 22.4989 50.9899 22.3099 51.2175 22.0052C51.2829 21.9196 50.9834 21.8106 51.0396 21.7223C51.1061 21.6256 51.1774 21.4909 51.0803 21.7379C51.0572 21.8109 51.0103 21.9267 50.9833 22.1799C50.9557 22.4236 50.9723 22.9547 51.3068 23.4434C51.6484 23.9333 52.0298 24.0859 52.2356 24.1581C52.4335 24.2208 52.5372 24.2236 52.6056 24.2267C52.8811 24.2315 52.8171 24.206 52.7869 24.216C52.7423 24.2223 52.6614 24.2435 52.5729 24.2775C52.2528 24.4001 51.8572 24.7134 51.4399 24.9288C51.3452 24.9817 51.2517 25.0288 51.1568 25.0663C50.7246 24.5028 50.0637 24.88 49.541 24.9622C49.3565 24.991 49.3233 24.8228 49.1796 24.8046C48.6369 24.7426 49.0194 25.224 48.9124 25.3472C48.4528 25.8781 48.0338 24.665 47.3528 24.91C47.348 24.9117 47.3395 24.927 47.3283 24.9525C47.2618 25.1168 47.0983 25.7176 47.0586 25.7703C46.7701 26.1605 46.9208 25.5655 46.6653 25.5989C46.1949 25.6619 45.828 25.6174 45.3572 25.9887C45.2213 26.0975 44.9771 26.6294 44.5676 26.4168C44.5138 26.389 44.4657 26.167 44.429 26.1651C43.7751 26.1463 43.9764 26.8259 43.7083 27.1627C43.5678 27.3397 43.3135 27.3385 43.0836 27.2819C42.8762 27.2315 42.6901 27.1361 42.6206 27.0871C42.2369 26.8201 42.7899 26.8737 42.7951 26.8342C42.8491 26.3719 42.4882 26.5585 42.1881 26.6089C41.9493 25.9538 41.5595 26.1108 41.8782 26.6635C41.9137 26.7238 42.1209 26.5956 42.1881 26.6089C42.1264 27.3392 41.6992 27.5539 41.0376 27.0783C40.728 26.8553 40.847 26.4589 40.1924 26.7775C39.896 26.9217 40.1477 27.3484 39.91 27.5523C39.3779 28.0094 38.4754 27.8292 37.8889 28.0786C37.8779 28.0832 37.867 28.0879 37.8562 28.0927C37.6278 28.1949 37.9401 28.3683 37.7867 28.4466C37.38 28.6551 36.9445 28.589 36.5543 28.8227C36.5191 28.8442 36.6976 29.0748 36.5679 29.1209C35.9 29.3627 35.2753 29.4927 34.6389 29.6686C34.308 29.7631 33.9707 29.8602 33.6225 29.9744C33.093 30.1502 32.2042 30.584 31.6607 30.7149C31.5079 30.7523 31.3472 30.7823 31.1819 30.8076C30.2478 30.9609 29.266 30.9173 28.6235 31.1607C28.1256 31.3475 28.3054 31.5863 28.1348 31.8219C27.93 32.1072 27.5136 32.0394 27.2019 31.9347C26.9848 31.8803 26.8137 31.8054 26.7628 31.7795C26.7594 31.7782 27.2281 31.5868 26.9334 31.5193C26.7099 31.2744 26.7686 31.7766 26.7628 31.7795C26.6719 31.7412 25.6892 31.9 25.5118 31.9829C25.414 32.0314 25.5218 32.2755 25.4695 32.2959C24.6224 32.6205 23.7996 32.828 22.9848 32.9603C22.5619 33.0287 22.1349 33.0696 21.7147 33.0841C21.6913 33.0818 21.6882 32.7886 21.634 32.7868C20.879 32.7518 20.4684 33.1538 19.9326 33.4359C19.7023 33.5571 19.4924 33.6248 19.2937 33.6278C19.1186 33.6196 18.839 33.5229 18.6107 33.2758C18.1965 33.4167 17.5343 33.3225 17.1452 33.2629C16.7548 33.2036 16.8183 33.7689 16.7875 33.7864C15.861 34.3354 15.2204 34.1338 14.1544 34.2814C13.6214 34.3507 12.7247 34.6138 11.9102 34.7448C11.8002 34.7592 11.7016 34.7711 11.4937 34.7674C11.4369 34.7659 11.3745 34.7628 11.3013 34.756C11.22 34.7463 11.178 34.7484 10.9523 34.6997C10.7373 34.6338 10.5104 34.6312 9.95709 34.2153C9.52396 33.916 8.98291 32.9869 9.08544 32.1863C9.1003 31.9939 9.13736 31.8202 9.18359 31.6699C9.22996 31.5176 9.28866 31.39 9.30882 31.348C9.36672 31.2264 9.42644 31.1264 9.48335 31.0415C9.71436 30.7076 9.88443 30.5798 10.0126 30.4748C10.128 30.3867 10.1539 30.3731 10.2136 30.3344C10.3156 30.2704 10.4068 30.2228 10.4686 30.1927C10.5693 30.1448 10.657 30.1089 10.7451 30.0735C11.0593 29.9506 11.1116 29.9413 11.2285 29.8547C11.261 29.8293 11.129 29.6105 11.1365 29.597C11.2744 29.2114 11.3927 29.8297 11.4934 29.906C11.6283 30.0165 11.7407 30.1032 11.8341 30.1497C12.034 30.1904 12.2102 30.1262 12.4144 29.8606C12.4938 29.7595 12.3028 28.8234 12.4711 28.6496C12.6939 28.4236 12.7685 28.7551 13.0106 28.5046C13.0324 28.483 12.9175 28.3228 13.1069 28.2112C13.3615 28.061 13.6426 27.9061 13.9549 27.7499C14.4134 27.545 14.997 27.2028 15.6417 26.7777C15.7671 26.6967 15.4373 26.5354 15.62 26.4123C15.8725 26.2431 16.1543 26.0688 16.4619 25.9039C17.0381 25.5953 17.5879 25.3379 18.1157 25.1461C18.2997 25.0801 18.3075 25.3289 18.3767 25.3632C18.8027 25.5666 18.8182 24.8857 18.8608 24.8454C18.9431 24.7685 19.0259 24.696 19.1094 24.627C20.1925 23.7482 21.3584 23.4586 22.6033 22.4248C22.651 22.3858 22.7812 22.0337 23.059 21.8098C23.0735 21.7591 23.1905 21.7237 23.3735 21.8463C23.4003 21.8709 23.9035 22.1782 23.8904 21.7369C23.8889 21.7096 23.5926 21.583 23.847 21.435C24.1046 21.2842 24.4008 20.835 24.9386 20.8114C25.1092 20.8032 25.6949 21.0322 25.7843 20.4351C25.7877 20.3952 25.7516 19.2237 26.339 19.618C26.4359 19.6829 26.8149 20.2753 27.0221 19.68C27.0617 19.5652 26.8232 19.5439 26.979 19.3108C27.2177 18.953 27.7613 18.7984 27.9957 18.2569C28.0351 18.1622 28.0769 17.5549 28.5294 17.688C28.6001 17.709 28.6564 17.9537 28.8029 17.8874C29.1515 17.7308 29.4712 17.5125 29.7992 17.3002C30.2805 16.9998 30.5282 16.8718 30.8915 16.7543C31.1399 16.6774 31.2141 17.0726 31.4924 17.0293C31.7682 16.9877 32.2708 16.8055 32.4123 16.5176C32.5531 16.2303 31.9906 15.8638 32.3068 15.6154C33.6724 14.5376 35.2757 13.8832 36.6855 12.8836C36.6861 12.8832 36.6867 12.8827 36.6873 12.8823C36.9066 12.7262 36.598 12.6883 36.9113 12.4461C38.0624 11.5548 39.9665 9.84404 41.3293 9.43442C42.4142 9.11244 41.482 10.1205 42.2324 9.77133C42.5898 9.60589 42.5606 8.77747 42.6362 8.70137C42.9483 8.37465 43.2905 8.1648 43.6908 7.9759C44.0671 7.80953 44.4349 7.68933 44.7822 7.43287C44.9106 7.33765 44.6351 7.16592 44.7457 7.08768C45.1205 6.81889 45.5933 6.69145 45.9373 6.45467C46.0902 6.34818 45.9471 6.18066 46.0978 6.10661C46.4544 5.92747 46.7847 5.81849 47.1649 5.79089C47.2008 5.78734 47.1984 6.12672 47.4051 5.98496C47.493 5.92362 47.5873 5.87106 47.6658 5.82867C48.235 5.41614 48.6458 5.22707 48.9648 4.81812C49.0882 4.65737 48.817 4.23945 49.3495 4.29356C49.46 4.3056 49.7054 4.85995 49.8074 4.16947C49.8257 4.0535 50.0916 3.03854 50.654 3.20222C50.8028 3.24474 51.2866 3.5091 51.4259 3.32275C51.4437 3.29599 51.1959 3.14072 51.3319 3.01776C51.6423 2.74079 51.9867 2.49725 52.3169 2.24293C52.6065 2.02883 52.8697 1.85438 53.1151 1.68266C53.2993 1.55449 52.8736 1.47293 53.1543 1.29064C53.9208 0.797287 54.8342 0.474079 55.4421 0.276152C55.662 0.205635 55.6204 0.480314 55.646 0.495661C56.0691 0.740561 55.9354 0.190643 55.9705 0.135023C56.0231 0.0589178 56.0641 0.00944865 56.065 5.14984e-05C56.0606 -0.000565171 56.0361 -0.00102699 55.8366 0.218324C55.7398 0.3391 55.5713 0.505618 55.3711 0.989223C55.1522 1.43531 55.0881 2.5235 55.4528 3.17981C55.5317 3.34317 55.6217 3.48687 55.7126 3.60914C55.791 3.71427 55.868 3.80146 55.9426 3.87715C56.0979 4.0333 56.2107 4.11427 56.3017 4.17672C56.4999 4.30749 56.5766 4.33315 56.6482 4.36662C57.5066 4.69004 57.6439 4.56689 57.775 4.59512C57.9398 4.59911 57.855 4.86826 57.8884 4.88859C57.9914 4.98934 57.9141 4.93936 57.9078 4.84441C57.8859 4.75176 57.8767 4.62071 57.8111 4.60756C57.7035 4.589 57.5292 4.60121 57.3237 4.6257C56.8346 4.67765 56.3655 4.78371 55.957 4.88884C55.7526 4.94203 56.0426 5.19309 55.8604 5.2372C55.3858 5.3551 54.9447 5.45815 54.5513 5.5519C53.9563 5.69714 53.3355 5.82892 52.7185 5.92013C52.5096 5.95059 52.5668 5.68946 52.5096 5.65133C52.1121 5.3836 51.8383 6.00115 51.7559 6.07782C51.3793 6.42771 51.1445 6.28634 50.7627 6.44863C49.7257 6.88351 48.6815 7.2565 47.2612 7.63865C46.4406 7.83787 45.4082 8.13619 44.4823 8.36116C44.0328 8.47185 43.5817 8.57094 43.1168 8.65364C41.3236 8.95288 39.7489 9.22075 37.9002 9.7016C37.8253 9.72116 37.7497 9.74166 37.6743 9.76299C37.5442 9.79973 37.7524 10.0663 37.6432 10.1015C36.2518 10.5414 34.6756 10.9911 33.1386 11.6474C33.0119 11.7012 33.298 11.909 33.1008 12.0038C32.6925 12.2017 32.1491 12.3867 31.6848 12.4602C31.46 12.496 31.6527 12.1548 31.4271 12.1961C30.9331 12.2861 30.4297 12.4499 29.9611 12.6656C29.9293 12.6801 29.8977 12.6947 29.8663 12.7096C29.6442 12.8146 30.0962 12.9668 29.7978 13.0816C27.8104 13.8497 25.8883 14.4594 23.8574 14.688C23.787 14.6956 23.7157 14.703 23.6436 14.7101C23.4979 14.7242 23.2076 14.1723 22.9496 14.3681C22.9743 14.5373 23.0303 14.7286 23.0706 14.9056C20.2122 15.8252 17.3064 16.4101 14.4427 17.1992C14.3229 17.2324 14.6185 17.4839 14.3879 17.5496C14.3107 17.5716 14.2351 17.5935 14.1611 17.6152C12.9028 17.9813 11.7573 18.4127 10.2926 18.5383C10.1382 18.551 10.053 17.984 9.64958 18.19C9.5789 18.2279 8.95115 18.4805 8.81334 18.6431C8.79833 18.6627 8.92023 18.8155 8.8524 18.906C8.83782 18.9265 8.81371 18.9435 8.77642 18.9548C7.61495 19.3015 6.3682 19.5535 5.14835 19.6773C4.95207 19.6965 5.08869 19.3732 4.94896 19.3843C3.95208 19.4662 2.94979 19.9143 1.94046 19.8514C1.26017 19.806 1.40977 19.279 0.98592 18.8648C0.92595 18.8075 0.515876 18.8592 0.455335 18.5825C0.319566 17.89 0.387777 17.1026 0.217437 16.368C0.201764 16.2887 0.0923156 16.3062 0.0442332 16.2847C-0.00357235 16.2632 -0.0149515 16.2097 0.0215914 16.0105C0.00988407 15.9876 0.267302 15.8228 0.331574 15.6767C0.368771 15.5778 0.229861 15.3118 0.316624 15.1787C0.404556 15.0452 0.568967 15.259 0.737632 15.0871C0.908103 14.9123 0.757905 14.6124 1.14203 14.4961ZM15.3948 32.9984C15.0051 32.7973 15.1455 33.7855 15.4659 33.4799C15.4813 33.4639 15.4147 33.0081 15.3948 32.9984ZM51.0597 23.4176C51.747 23.2331 51.438 22.6321 50.9656 22.6559C50.4731 22.705 50.8249 23.5203 51.0597 23.4176ZM49.2103 27.8927C49.3176 27.8249 49.3482 27.7447 49.3311 27.6629C49.2791 27.4094 48.7641 27.1678 48.5736 27.3424C48.5271 27.3831 48.5019 27.448 48.5109 27.5422C48.5137 27.5764 49.1799 27.9123 49.2103 27.8927ZM2.49786 18.4295C2.4911 18.4175 2.21335 18.4629 2.21006 18.4768C2.12797 18.8176 2.68389 18.7267 2.49786 18.4295ZM47.2415 31.8875C47.4953 31.8823 47.573 31.3884 47.2686 31.4074C47.0353 31.4128 46.9381 31.8863 47.2415 31.8875ZM23.3525 24.9948C23.3645 25.0047 23.5398 24.9098 23.4919 24.8409C23.3366 24.6189 23.1424 24.8321 23.3525 24.9948ZM42.3709 37.9895C42.4547 37.8902 42.5428 37.8007 42.6419 37.7153C43.3343 37.0855 44.2809 37.2592 43.6093 38.0971C43.4697 38.2748 43.5508 37.4903 43.3097 37.6756C43.1907 37.7677 43.1354 37.8858 43.1067 38.0129C43.0215 38.3601 43.0366 38.851 42.5421 38.9556C42.4311 38.9752 42.3527 38.0227 42.3707 37.987C42.3708 37.9878 42.3708 37.9887 42.3709 37.9895ZM14.971 31.8613C14.9618 31.8497 14.6903 31.8898 14.686 31.9039C14.6 32.2429 15.1486 32.1622 14.971 31.8613ZM33.2592 19.0907C33.2891 19.1066 33.8511 18.803 33.8566 18.7685C33.8754 18.1551 32.741 18.7668 33.2592 19.0907ZM32.7844 27.3643C32.9636 26.9692 33.2742 26.8215 33.6296 27.1182C33.3482 27.197 33.0697 27.2898 32.7844 27.3643Z" fill="#1B1B1B" />
              </svg>
            </div>
          </div>

          {/* Moodboards */}
          <div id="btn-moodboards" className="action-card">
            <span className="action-card-title">Moodboards</span>
            <div className="w-full flex-grow flex justify-center items-center gap-[3px]">
              <div style={{ width: "28px", height: "29px", transform: "scaleY(-1)" }} className="bg-[#1A1A1A] rounded-[4px]" />
              <div style={{ width: "28px", height: "29px", transform: "scaleY(-1)" }} className="bg-[#1A1A1A] rounded-[4px]" />
              <div style={{ width: "18px", height: "29px", transform: "scaleY(-1)" }} className="bg-[#1A1A1A] rounded-[4px]" />
            </div>
          </div>

          {/* Font */}
          <div className="action-card">
            <span className="action-card-title">Font</span>
            <div className="w-full flex-grow flex justify-center items-center">
              <span style={{ color: "#1B1B1B", fontFamily: "'SF Pro Display', sans-serif", fontSize: "24px", fontWeight: 700, letterSpacing: "0.24px" }}>Aa</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── View 3: Moodboard Canvas ─────────────────────────────────────── */}
      <div id="view-moodboard" className="w-full h-full flex flex-col relative bg-[#000000] hide">
        <div id="canvas-container" className="absolute inset-0 overflow-hidden cursor-grab z-0" style={{ cursor: "grab" }}>
          <div id="canvas-content" className="absolute top-1/2 left-1/2 w-0 h-0 transition-transform duration-75" style={{ transform: "translate(0px, 0px)" }} />
        </div>

        {/* Top Navigation Bar */}
        <header className="w-full flex justify-between items-center px-6 py-6 absolute top-0 left-0 z-10 pointer-events-none">
          <div id="btn-back-to-prompt" className="moodboard-nav cursor-pointer group hover:bg-[#1a1a1a] transition-colors pointer-events-auto">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-white transition-colors">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <div className="nage-logo" style={{ fontSize: "20px", letterSpacing: "-0.5px", lineHeight: 1 }}>nage</div>
            <div className="flex items-center gap-2">
              <span id="project-title" className="text-white text-[13px] font-medium ml-2 outline-none cursor-text px-1 rounded hover:bg-[#333] transition-colors" contentEditable="true" suppressContentEditableWarning spellCheck={false}>Untitled</span>
              <span className="text-[#555] text-[13px]">Moodboard</span>
            </div>
          </div>

          <div className="flex items-center gap-4 pointer-events-auto">
            <button id="btn-ai" className="moodboard-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
                <path d="M19 16v4M17 18h4" />
              </svg>
              AI
            </button>
            <button id="btn-share" className="moodboard-btn" style={{ paddingLeft: "8px" }}>
              <div className="dp sm" />
              Share
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </header>

        {/* Bottom Toolbar */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <div className="toolbar">
            <button id="tool-move" className="icon-btn tool" title="Move (V)" aria-label="Move">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M8.15 18.0249C9.13333 18.0249 10.525 17.3333 11.625 14.0249L12.225 12.2249L14.025 11.6249C17.325 10.5249 18.0167 9.13327 18.0167 8.14994C18.0167 7.17494 17.325 5.77494 14.025 4.6666L6.95 2.30827C5.18333 1.7166 3.70833 1.8916 2.8 2.7916C1.89166 3.6916 1.71666 5.17494 2.30833 6.9416L4.66666 14.0166C5.775 17.3333 7.16666 18.0249 8.15 18.0249ZM13.6333 5.85827C15.95 6.63327 16.775 7.54994 16.775 8.14994C16.775 8.74994 15.95 9.6666 13.6333 10.4333L11.5333 11.1333C11.35 11.1916 11.2 11.3416 11.1417 11.5249L10.4417 13.6249C9.675 15.9416 8.75 16.7666 8.15 16.7666C7.55 16.7666 6.63333 15.9416 5.85833 13.6249L3.5 6.54994C3.075 5.2666 3.15 4.2166 3.69166 3.67494C4.23333 3.13327 5.28333 3.0666 6.55833 3.4916L13.6333 5.85827Z" fill="white" />
                <path d="M11.575 11.9998C11.7333 11.9998 11.8917 11.9415 12.0167 11.8165C12.2583 11.5748 12.2583 11.1748 12.0167 10.9332L9.03334 7.9415C8.79167 7.69984 8.39167 7.69984 8.15 7.9415C7.90834 8.18317 7.90834 8.58317 8.15 8.82484L11.1333 11.8165C11.25 11.9415 11.4167 11.9998 11.575 11.9998Z" fill="white" />
              </svg>
            </button>
            <button id="tool-hand" className="icon-btn tool" title="Hand (H)" aria-label="Hand">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
              </svg>
            </button>
            <button id="tool-frame" className="icon-btn tool" title="Frame (F)" aria-label="Frame">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M6 2.5v15M14 2.5v15M2.5 6h15M2.5 14h15" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <button id="tool-shape" className="icon-btn tool" title="Shape (R / O)" aria-label="Shape">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2.5" y="2.5" width="9" height="9" rx="1.5" stroke="white" strokeWidth="1.5" />
                <circle cx="12.5" cy="12.5" r="5" stroke="white" strokeWidth="1.5" />
              </svg>
            </button>
            <button id="tool-text" className="icon-btn tool" title="Text (T)" aria-label="Text">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M16.6667 3.3335H3.33333C3.11232 3.3335 2.90036 3.42129 2.74408 3.57757C2.5878 3.73385 2.5 3.94582 2.5 4.16683V6.66683C2.5 6.88784 2.5878 7.0998 2.74408 7.25609C2.90036 7.41237 3.11232 7.50016 3.33333 7.50016C3.55435 7.50016 3.76631 7.41237 3.92259 7.25609C4.07887 7.0998 4.16667 6.88784 4.16667 6.66683V5.00016H9.16667V15.8335H7.5C7.27899 15.8335 7.06702 15.9213 6.91074 16.0776C6.75446 16.2339 6.66667 16.4458 6.66667 16.6668C6.66667 16.8878 6.75446 17.0998 6.91074 17.2561C7.06702 17.4124 7.27899 17.5002 7.5 17.5002H12.5C12.721 17.5002 12.933 17.4124 13.0893 17.2561C13.2455 17.0998 13.3333 16.8878 13.3333 16.6668C13.3333 16.4458 13.2455 16.2339 13.0893 16.0776C12.933 15.9213 12.721 15.8335 12.5 15.8335H10.8333V5.00016H15.8333V6.66683C15.8333 6.88784 15.9211 7.0998 16.0774 7.25609C16.2337 7.41237 16.4457 7.50016 16.6667 7.50016C16.8877 7.50016 17.0996 7.41237 17.2559 7.25609C17.4122 7.0998 17.5 6.88784 17.5 6.66683V4.16683C17.5 3.94582 17.4122 3.73385 17.2559 3.57757C17.0996 3.42129 16.8877 3.3335 16.6667 3.3335Z" fill="white" />
              </svg>
            </button>
            <button id="tool-image" className="icon-btn hover:opacity-80 transition-opacity" title="Import Image" aria-label="Import Image">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7.5 8.95833C6.23333 8.95833 5.20833 7.93333 5.20833 6.66667C5.20833 5.4 6.23333 4.375 7.5 4.375C8.76666 4.375 9.79166 5.4 9.79166 6.66667C9.79166 7.93333 8.76666 8.95833 7.5 8.95833ZM7.5 5.625C6.92499 5.625 6.45833 6.09167 6.45833 6.66667C6.45833 7.24167 6.92499 7.70833 7.5 7.70833C8.075 7.70833 8.54166 7.24167 8.54166 6.66667C8.54166 6.09167 8.075 5.625 7.5 5.625Z" fill="white" />
                <path d="M12.5 18.9582H7.5C2.97501 18.9582 1.04167 17.0248 1.04167 12.4998V7.49984C1.04167 2.97484 2.97501 1.0415 7.5 1.0415H10.8333C11.175 1.0415 11.4583 1.32484 11.4583 1.6665C11.4583 2.00817 11.175 2.2915 10.8333 2.2915H7.5C3.65834 2.2915 2.29167 3.65817 2.29167 7.49984V12.4998C2.29167 16.3415 3.65834 17.7082 7.5 17.7082H12.5C16.3417 17.7082 17.7083 16.3415 17.7083 12.4998V8.33317C17.7083 7.9915 17.9917 7.70817 18.3333 7.70817C18.675 7.70817 18.9583 7.9915 18.9583 8.33317V12.4998C18.9583 17.0248 17.025 18.9582 12.5 18.9582Z" fill="white" />
                <path d="M15 7.2915C14.9167 7.2915 14.8417 7.27484 14.7583 7.2415C14.525 7.14984 14.375 6.9165 14.375 6.6665V1.6665C14.375 1.32484 14.6583 1.0415 15 1.0415C15.3417 1.0415 15.625 1.32484 15.625 1.6665V5.15817L16.225 4.55817C16.4667 4.3165 16.8667 4.3165 17.1083 4.55817C17.35 4.79984 17.35 5.19984 17.1083 5.4415L15.4417 7.10817C15.325 7.22484 15.1667 7.2915 15 7.2915Z" fill="white" />
                <path d="M15 7.29154C14.8417 7.29154 14.6833 7.2332 14.5583 7.1082L12.8917 5.44154C12.65 5.19987 12.65 4.79987 12.8917 4.5582C13.1333 4.31654 13.5333 4.31654 13.775 4.5582L15.4417 6.22487C15.6833 6.46654 15.6833 6.86654 15.4417 7.1082C15.3167 7.2332 15.1583 7.29154 15 7.29154Z" fill="white" />
                <path d="M2.225 16.4168C2.025 16.4168 1.825 16.3168 1.70834 16.1418C1.51667 15.8585 1.59167 15.4668 1.88334 15.2751L5.99167 12.5168C6.89167 11.9085 8.13334 11.9835 8.95 12.6751L9.225 12.9168C9.64167 13.2751 10.35 13.2751 10.7583 12.9168L14.225 9.9418C15.1083 9.18346 16.5 9.18346 17.3917 9.9418L18.75 11.1085C19.0083 11.3335 19.0417 11.7251 18.8167 11.9918C18.5917 12.2501 18.2 12.2835 17.9333 12.0585L16.575 10.8918C16.1583 10.5335 15.45 10.5335 15.0333 10.8918L11.5667 13.8668C10.6833 14.6251 9.29167 14.6251 8.4 13.8668L8.125 13.6251C7.74167 13.3001 7.10834 13.2668 6.68334 13.5585L2.575 16.3168C2.46667 16.3835 2.34167 16.4168 2.225 16.4168Z" fill="white" />
              </svg>
            </button>

            <div className="w-[1px] h-[24px] bg-[#333]" />

            <button id="tool-center" className="icon-btn hover:opacity-80 transition-opacity" title="Center View" aria-label="Center View">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 7.50016L16.6667 3.3335M13.3333 3.3335H16.6667V6.66683M7.50001 12.5002L3.33334 16.6668M6.66668 16.6668H3.33334V13.3335" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button id="tool-illustration" className="icon-btn hover:opacity-80 transition-opacity" title="Illustration Nodes" aria-label="Illustration Nodes">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M1.66666 3.33317C1.66666 2.89114 1.84225 2.46722 2.15481 2.15466C2.46737 1.8421 2.8913 1.6665 3.33332 1.6665H6.66666C7.10868 1.6665 7.53261 1.8421 7.84517 2.15466C8.15773 2.46722 8.33332 2.89114 8.33332 3.33317V6.6665C8.33332 7.10853 8.15773 7.53245 7.84517 7.84501C7.53261 8.15758 7.10868 8.33317 6.66666 8.33317H3.33332C2.8913 8.33317 2.46737 8.15758 2.15481 7.84501C1.84225 7.53245 1.66666 7.10853 1.66666 6.6665V3.33317Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 8.33301V13.333H8.33333" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10.8333 10.8332C10.8333 10.3911 11.0089 9.96722 11.3215 9.65466C11.634 9.3421 12.058 9.1665 12.5 9.1665H15.8333C16.2753 9.1665 16.6993 9.3421 17.0118 9.65466C17.3244 9.96722 17.5 10.3911 17.5 10.8332V14.1665C17.5 14.6085 17.3244 15.0325 17.0118 15.345C16.6993 15.6576 16.2753 15.8332 15.8333 15.8332H12.5C12.058 15.8332 11.634 15.6576 11.3215 15.345C11.0089 15.0325 10.8333 14.6085 10.8333 14.1665V10.8332Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button id="tool-shortcuts" className="icon-btn hover:opacity-80 transition-opacity" title="Shortcuts" aria-label="Shortcuts">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2.0835C6.82501 2.0835 4.58334 4.36933 4.58334 7.18266C4.58334 8.46266 5.11001 9.326 5.77084 10.1493C5.91418 10.3285 6.06001 10.501 6.21001 10.6785L6.29001 10.7718C6.46501 10.9802 6.64584 11.1952 6.81501 11.4168C7.15168 11.8593 7.46751 12.3568 7.64418 12.9452C7.68745 13.1025 7.66746 13.2705 7.5885 13.4133C7.50954 13.5561 7.37786 13.6624 7.2216 13.7094C7.06534 13.7564 6.89689 13.7404 6.75225 13.6649C6.6076 13.5894 6.49823 13.4603 6.44751 13.3052C6.33251 12.9218 6.11668 12.5635 5.82001 12.1743C5.66345 11.9719 5.50173 11.7735 5.33501 11.5793L5.25834 11.4877C5.10834 11.311 4.95001 11.1243 4.79584 10.9318C4.05834 10.0135 3.33334 8.876 3.33334 7.18183C3.33334 3.636 6.17918 0.833496 10 0.833496C13.8208 0.833496 16.6667 3.63516 16.6667 7.18266C16.6667 8.876 15.9417 10.0135 15.2042 10.9327C15.05 11.1243 14.8917 11.311 14.7417 11.4885L14.665 11.5793C14.49 11.786 14.3275 11.9802 14.18 12.1743C13.8833 12.5635 13.6675 12.9227 13.5525 13.3052C13.4993 13.4573 13.3895 13.5831 13.2459 13.6563C13.1022 13.7295 12.9359 13.7444 12.7816 13.698C12.6272 13.6516 12.4967 13.5474 12.4172 13.4072C12.3378 13.2669 12.3155 13.1014 12.355 12.9452C12.5325 12.3568 12.8483 11.8593 13.1858 11.4168C13.3542 11.1916 13.535 10.9802 13.7108 10.7718L13.79 10.6785C13.94 10.501 14.0858 10.3285 14.2292 10.1502C14.89 9.32516 15.4167 8.46266 15.4167 7.18266C15.4167 4.36933 13.175 2.0835 10 2.0835ZM7.29168 15.0002H12.7083C12.8741 15.0002 13.0331 15.066 13.1503 15.1832C13.2675 15.3004 13.3333 15.4594 13.3333 15.6252C13.3333 15.7909 13.2675 15.9499 13.1503 16.0671C13.0331 16.1843 12.8741 16.2502 12.7083 16.2502H7.29168C7.12592 16.2502 6.96695 16.1843 6.84974 16.0671C6.73253 15.9499 6.66668 15.7909 6.66668 15.6252C6.66668 15.4594 6.73253 15.3004 6.84974 15.1832C6.96695 15.066 7.12592 15.0002 7.29168 15.0002ZM7.91668 18.1252C7.91668 17.9594 7.98253 17.8004 8.09974 17.6832C8.21695 17.566 8.37592 17.5002 8.54168 17.5002H11.4583C11.6241 17.5002 11.7831 17.566 11.9003 17.6832C12.0175 17.8004 12.0833 17.9594 12.0833 18.1252C12.0833 18.2909 12.0175 18.4499 11.9003 18.5671C11.7831 18.6843 11.6241 18.7502 11.4583 18.7502H8.54168C8.37592 18.7502 8.21695 18.6843 8.09974 18.5671C7.98253 18.4499 7.91668 18.2909 7.91668 18.1252Z" fill="white" />
              </svg>
            </button>
          </div>
        </div>

        <input type="file" id="image-upload-input" accept="image/*" className="hidden" aria-hidden="true" tabIndex={-1} />

        {/* Illustration Modal */}
        <div id="modal-illustration" className="modal-overlay fixed inset-0 z-50 flex items-center justify-center">
          <div className="modal-content p-8 max-w-sm w-full relative">
            <button className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors cursor-pointer" onClick={() => (window as unknown as { closeModals?: () => void }).closeModals?.()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="mb-4 text-[#A0A0A0]">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 20 20" fill="none" className="mb-2">
                <path d="M1.66666 3.33317C1.66666 2.89114 1.84225 2.46722 2.15481 2.15466C2.46737 1.8421 2.8913 1.6665 3.33332 1.6665H6.66666C7.10868 1.6665 7.53261 1.8421 7.84517 2.15466C8.15773 2.46722 8.33332 2.89114 8.33332 3.33317V6.6665C8.33332 7.10853 8.15773 7.53245 7.84517 7.84501C7.53261 8.15758 7.10868 8.33317 6.66666 8.33317H3.33332C2.8913 8.33317 2.46737 8.15758 2.15481 7.84501C1.84225 7.53245 1.66666 7.10853 1.66666 6.6665V3.33317Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 8.33301V13.333H8.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10.8333 10.8332C10.8333 10.3911 11.0089 9.96722 11.3215 9.65466C11.634 9.3421 12.058 9.1665 12.5 9.1665H15.8333C16.2753 9.1665 16.6993 9.3421 17.0118 9.65466C17.3244 9.96722 17.5 10.3911 17.5 10.8332V14.1665C17.5 14.6085 17.3244 15.0325 17.0118 15.345C16.6993 15.6576 16.2753 15.8332 15.8333 15.8332H12.5C12.058 15.8332 11.634 15.6576 11.3215 15.345C11.0089 15.0325 10.8333 14.6085 10.8333 14.1665V10.8332Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Illustration Nodes</h3>
            <p className="text-[#888888] text-sm">Preparing to launch the Figma-weave style node environment for illustrations...</p>
            <button onClick={() => (window as unknown as { closeModals?: () => void }).closeModals?.()} className="mt-6 w-full py-2 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
              Got it
            </button>
          </div>
        </div>

        {/* Shortcuts Modal */}
        <div id="modal-shortcuts" className="modal-overlay fixed inset-0 z-50 flex items-center justify-center">
          <div className="modal-content p-8 max-w-sm w-full relative">
            <button className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors cursor-pointer" onClick={() => (window as unknown as { closeModals?: () => void }).closeModals?.()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2.0835C6.82501 2.0835 4.58334 4.36933 4.58334 7.18266C4.58334 8.46266 5.11001 9.326 5.77084 10.1493C5.91418 10.3285 6.06001 10.501 6.21001 10.6785L6.29001 10.7718C6.46501 10.9802 6.64584 11.1952 6.81501 11.4168C7.15168 11.8593 7.46751 12.3568 7.64418 12.9452C7.68745 13.1025 7.66746 13.2705 7.5885 13.4133C7.50954 13.5561 7.37786 13.6624 7.2216 13.7094C7.06534 13.7564 6.89689 13.7404 6.75225 13.6649C6.6076 13.5894 6.49823 13.4603 6.44751 13.3052C6.33251 12.9218 6.11668 12.5635 5.82001 12.1743C5.66345 11.9719 5.50173 11.7735 5.33501 11.5793L5.25834 11.4877C5.10834 11.311 4.95001 11.1243 4.79584 10.9318C4.05834 10.0135 3.33334 8.876 3.33334 7.18183C3.33334 3.636 6.17918 0.833496 10 0.833496C13.8208 0.833496 16.6667 3.63516 16.6667 7.18266C16.6667 8.876 15.9417 10.0135 15.2042 10.9327C15.05 11.1243 14.8917 11.311 14.7417 11.4885L14.665 11.5793C14.49 11.786 14.3275 11.9802 14.18 12.1743C13.8833 12.5635 13.6675 12.9227 13.5525 13.3052C13.4993 13.4573 13.3895 13.5831 13.2459 13.6563C13.1022 13.7295 12.9359 13.7444 12.7816 13.698C12.6272 13.6516 12.4967 13.5474 12.4172 13.4072C12.3378 13.2669 12.3155 13.1014 12.355 12.9452C12.5325 12.3568 12.8483 11.8593 13.1858 11.4168C13.3542 11.1916 13.535 10.9802 13.7108 10.7718L13.79 10.6785C13.94 10.501 14.0858 10.3285 14.2292 10.1502C14.89 9.32516 15.4167 8.46266 15.4167 7.18266C15.4167 4.36933 13.175 2.0835 10 2.0835ZM7.29168 15.0002H12.7083C12.8741 15.0002 13.0331 15.066 13.1503 15.1832C13.2675 15.3004 13.3333 15.4594 13.3333 15.6252C13.3333 15.7909 13.2675 15.9499 13.1503 16.0671C13.0331 16.1843 12.8741 16.2502 12.7083 16.2502H7.29168C7.12592 16.2502 6.96695 16.1843 6.84974 16.0671C6.73253 15.9499 6.66668 15.7909 6.66668 15.6252C6.66668 15.4594 6.73253 15.3004 6.84974 15.1832C6.96695 15.066 7.12592 15.0002 7.29168 15.0002ZM7.91668 18.1252C7.91668 17.9594 7.98253 17.8004 8.09974 17.6832C8.21695 17.566 8.37592 17.5002 8.54168 17.5002H11.4583C11.6241 17.5002 11.7831 17.566 11.9003 17.6832C12.0175 17.8004 12.0833 17.9594 12.0833 18.1252C12.0833 18.2909 12.0175 18.4499 11.9003 18.5671C11.7831 18.6843 11.6241 18.7502 11.4583 18.7502H8.54168C8.37592 18.7502 8.21695 18.6843 8.09974 18.5671C7.98253 18.4499 7.91668 18.2909 7.91668 18.1252Z" fill="white" />
              </svg>
              Keyboard Shortcuts
            </h3>
            <ul className="space-y-4 text-sm">
              <li className="flex justify-between items-center text-[#888]"><span>Move / Pan</span><span className="bg-[#222] px-2 py-1 rounded text-white text-xs">V</span></li>
              <li className="flex justify-between items-center text-[#888]"><span>Add Text</span><span className="bg-[#222] px-2 py-1 rounded text-white text-xs">T</span></li>
              <li className="flex justify-between items-center text-[#888]"><span>Upload Image</span><span className="bg-[#222] px-2 py-1 rounded text-white text-xs">I</span></li>
              <li className="flex justify-between items-center text-[#888]"><span>Center View</span><span className="bg-[#222] px-2 py-1 rounded text-white text-xs">Shift + 1</span></li>
            </ul>
          </div>
        </div>
      </div>

      <div id="toast" className="toast" />
    </div>
  );
}
