"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { PasswordField } from "@/components/auth/password-field";
import { useAuth } from "@/contexts/auth-context";
import { getPostLoginPath } from "@/lib/auth/roles";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const session = await login({
        email: String(formData.get("email")),
        password: String(formData.get("password")),
      });

      router.replace(getPostLoginPath(session.user.role));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to login right now",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Login"
      subtitle="Access your skincare workspace."
      footerText="New here?"
      footerHref="/signup"
      footerAction="Create an account"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
        />
        <div className="form-row">
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>
    </AuthCard>
  );
}
