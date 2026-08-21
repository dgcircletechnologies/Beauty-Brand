"use client";

import { FormEvent, useState } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { useAuth } from "@/contexts/auth-context";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      await forgotPassword({
        email: String(formData.get("email")),
      });

      setMessage("Password reset instructions have been sent.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to send reset instructions",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Forgot Password"
      subtitle="Send a password reset link to your email."
      footerText="Remembered it?"
      footerHref="/login"
      footerAction="Login"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        {message ? <p className="form-success">{message}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
    </AuthCard>
  );
}
