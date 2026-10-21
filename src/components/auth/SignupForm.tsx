"use client";

import { useActionState, useTransition } from "react";
import Link from "next/link";
import { signUpAction, signInWithGoogleAction } from "@/lib/supabase/actions";
import { AuthCard, AuthInput, AuthButton, AuthDivider, GoogleButton, AuthMessage } from "./shared";

type SignupState = { error: string | undefined; success: string | undefined };
const initialState: SignupState = { error: undefined, success: undefined };

export function SignupForm() {
  const [state, formAction] = useActionState(
    async (_prev: SignupState, formData: FormData): Promise<SignupState> => {
      const result = await signUpAction(formData);
      if (!result) return initialState;
      return { error: result.error, success: result.success };
    },
    initialState
  );

  const [, startGoogleTransition] = useTransition();

  if (state.success) {
    return (
      <AuthCard>
        <div className="text-center">
          <span
            className="text-3xl text-text-primary tracking-[-0.04em]"
            style={{ fontFamily: '"Gegola DEMO", sans-serif' }}
          >
            nage
          </span>
          <div className="mt-8">
            <AuthMessage type="success">{state.success}</AuthMessage>
            <p className="mt-4 text-sm text-text-muted">
              Click the link in your email to activate your account, then{" "}
              <Link href="/login" className="text-text-primary hover:underline">
                sign in
              </Link>
              .
            </p>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="mb-8 text-center">
        <span
          className="text-3xl text-text-primary tracking-[-0.04em]"
          style={{ fontFamily: '"Gegola DEMO", sans-serif' }}
        >
          nage
        </span>
        <p className="mt-2 text-sm text-text-muted">Create your account</p>
      </div>

      {state.error && <AuthMessage type="error">{state.error}</AuthMessage>}

      <form
        action={(fd) => {
          startGoogleTransition(async () => { await signInWithGoogleAction(fd); });
        }}
      >
        <GoogleButton>Continue with Google</GoogleButton>
      </form>

      <AuthDivider />

      <form action={formAction} className="flex flex-col gap-3">
        <AuthInput name="name" type="text" placeholder="Full name" />
        <AuthInput name="email" type="email" placeholder="Email" required />
        <AuthInput
          name="password"
          type="password"
          placeholder="Password (min 8 chars)"
          required
        />
        <AuthButton type="submit">Create account</AuthButton>
      </form>

      <div className="mt-5 text-center text-xs text-text-dim">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-text-muted transition-colors hover:text-text-primary"
        >
          Sign in
        </Link>
      </div>
    </AuthCard>
  );
}
