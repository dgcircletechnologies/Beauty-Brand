"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { useAuth } from "@/contexts/auth-context";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      await resetPassword({
        token: String(formData.get("token")),
        password: String(formData.get("password")),
      });

      router.replace("/login");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to reset password",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Reset Password"
      subtitle="Set a new password for your account."
      footerText="Back to"
      footerHref="/login"
      footerAction="Login"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Reset token
          <input
            name="token"
            defaultValue={searchParams.get("token") ?? ""}
            required
          />
        </label>
        <label>
          New password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="route-state">Loading...</main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
