"use client";

import { useActionState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signInAction, signInWithGoogleAction } from "@/lib/supabase/actions";
import { AuthCard, AuthInput, AuthButton, AuthDivider, GoogleButton, AuthMessage } from "./shared";

const initialState = { error: undefined as string | undefined };

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const callbackError = searchParams.get("error");

  const [state, formAction] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await signInAction(formData);
      return result ?? initialState;
    },
    initialState
  );

  const [, startGoogleTransition] = useTransition();

  return (
    <AuthCard>
      {/* Logo */}
      <div className="mb-8 text-center">
        <span
          className="text-3xl text-text-primary tracking-[-0.04em]"
          style={{ fontFamily: '"Gegola DEMO", sans-serif' }}
        >
          nage
        </span>
        <p className="mt-2 text-sm text-text-muted">Sign in to continue</p>
      </div>

      {callbackError === "auth_callback_failed" && (
        <AuthMessage type="error">Authentication failed. Please try again.</AuthMessage>
      )}
      {state.error && <AuthMessage type="error">{state.error}</AuthMessage>}

      {/* Google */}
      <form
        action={(fd) => {
          startGoogleTransition(() => {
            fd.set("redirectTo", redirectTo);
            signInWithGoogleAction(fd);
          });
        }}
      >
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <GoogleButton>Continue with Google</GoogleButton>
      </form>

      <AuthDivider />

      {/* Email / password */}
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <AuthInput name="email" type="email" placeholder="Email" required />
        <AuthInput name="password" type="password" placeholder="Password" required />
        <AuthButton type="submit">Sign in</AuthButton>
      </form>

      <div className="mt-5 flex flex-col items-center gap-2 text-xs text-text-dim">
        <Link
          href="/reset-password"
          className="text-text-muted transition-colors hover:text-text-primary"
        >
          Forgot password?
        </Link>
        <span>
          No account?{" "}
          <Link
            href="/signup"
            className="text-text-muted transition-colors hover:text-text-primary"
          >
            Sign up
          </Link>
        </span>
      </div>

      <div className="mt-6 pt-5 border-t border-[#1a1a1a]">
        <Link
          href="/demo"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-[#111111] hover:bg-[#1a1a1a] border border-[#222222] text-[13px] text-white font-medium transition-all hover:border-[#333333]"
        >
          <span>Preview Canvas Demo</span>
          <span className="text-[#888888]">→</span>
        </Link>
      </div>
    </AuthCard>
  );
}
