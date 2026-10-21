// Shared primitive components for auth forms — all styled to the Nage design system.
import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, ButtonHTMLAttributes } from "react";

// ── Card ──────────────────────────────────────────────────────────────────────
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full max-w-sm rounded-[var(--nage-radius-modal)] border border-border bg-bg-surface-2 p-8 shadow-2xl"
    >
      {children}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function AuthInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-border-subtle bg-bg-input px-4 py-3",
        "text-sm text-text-primary placeholder:text-text-placeholder",
        "outline-none transition-colors",
        "focus:border-border focus:ring-1 focus:ring-border",
        className
      )}
      {...props}
    />
  );
}

// ── Primary button ────────────────────────────────────────────────────────────
export function AuthButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "mt-1 w-full rounded-full bg-accent py-3 text-sm font-medium text-accent-fg",
        "transition-all hover:bg-accent-hover active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Google OAuth button ───────────────────────────────────────────────────────
export function GoogleButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className={cn(
        "flex w-full items-center justify-center gap-3 rounded-full",
        "border border-border bg-bg-surface-3 py-3 text-sm text-text-primary",
        "transition-all hover:bg-bg-surface-3/80 active:scale-[0.98]"
      )}
    >
      {/* Google G mark */}
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        />
        <path
          fill="#FBBC05"
          d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        />
      </svg>
      {children}
    </button>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function AuthDivider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs text-text-dim">or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// ── Message (error / success) ─────────────────────────────────────────────────
export function AuthMessage({
  type,
  children,
}: {
  type: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mb-4 rounded-xl border px-4 py-3 text-sm",
        type === "error"
          ? "border-red-900/50 bg-red-950/30 text-red-400"
          : "border-green-900/50 bg-green-950/30 text-green-400"
      )}
    >
      {children}
    </div>
  );
}
