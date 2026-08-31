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
    const email = String(formData.get("email"));

    try {
      const session = await login({
        email,
        password: String(formData.get("password")),
      });

      router.replace(getPostLoginPath(session.user.role));
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to login right now";

      if (message.toLowerCase().includes("verify")) {
        router.replace(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

      setError(
        message,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Login to your account"
      subtitle="Access your order history, saved routines, and personalized skincare features."
      footerText="New here?"
      footerHref="/signup"
      footerAction="Create an account"
      imageSrc="/images/skincare/feature-1.webp"
      imageAlt="Skincare ritual products arranged on a warm surface"
      imageLabel="Daily Essentials"
      imageTitle="Return to your routine in one easy step."
      imageText="Your cart, wishlist, addresses, and orders are ready when you are."
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
