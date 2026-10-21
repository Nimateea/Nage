"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/lib/supabase/actions";
import { AuthCard, AuthInput, AuthButton, AuthMessage } from "./shared";

type ResetState = { error: string | undefined; success: string | undefined };
const initialState: ResetState = { error: undefined, success: undefined };

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(
    async (_prev: ResetState, formData: FormData): Promise<ResetState> => {
      const result = await resetPasswordAction(formData);
      if (!result) return initialState;
      return { error: result.error, success: result.success };
    },
    initialState
  );

  return (
    <AuthCard>
      <div className="mb-8 text-center">
        <span
          className="text-3xl text-text-primary tracking-[-0.04em]"
          style={{ fontFamily: '"Gegola DEMO", sans-serif' }}
        >
          nage
        </span>
        <p className="mt-2 text-sm text-text-muted">Reset your password</p>
      </div>

      {state.error && <AuthMessage type="error">{state.error}</AuthMessage>}
      {state.success && <AuthMessage type="success">{state.success}</AuthMessage>}

      {!state.success && (
        <form action={formAction} className="flex flex-col gap-3">
          <AuthInput name="email" type="email" placeholder="Email" required />
          <AuthButton type="submit">Send reset link</AuthButton>
        </form>
      )}

      <div className="mt-5 text-center text-xs text-text-dim">
        <Link
          href="/login"
          className="text-text-muted transition-colors hover:text-text-primary"
        >
          ← Back to sign in
        </Link>
      </div>
    </AuthCard>
  );
}
