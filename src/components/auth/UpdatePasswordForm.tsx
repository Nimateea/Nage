"use client";

import { useActionState } from "react";
import { updatePasswordAction } from "@/lib/supabase/actions";
import { AuthCard, AuthInput, AuthButton, AuthMessage } from "./shared";

const initialState = { error: undefined as string | undefined };

export function UpdatePasswordForm() {
  const [state, formAction] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await updatePasswordAction(formData);
      return result ?? initialState;
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
        <p className="mt-2 text-sm text-text-muted">Set a new password</p>
      </div>

      {state.error && <AuthMessage type="error">{state.error}</AuthMessage>}

      <form action={formAction} className="flex flex-col gap-3">
        <AuthInput
          name="password"
          type="password"
          placeholder="New password (min 8 chars)"
          required
        />
        <AuthInput
          name="confirm"
          type="password"
          placeholder="Confirm new password"
          required
        />
        <AuthButton type="submit">Update password</AuthButton>
      </form>
    </AuthCard>
  );
}
