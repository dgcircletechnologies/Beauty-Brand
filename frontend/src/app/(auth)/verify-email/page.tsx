"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { useAuth } from "@/contexts/auth-context";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const { resendVerificationEmail, verifyEmail } = useAuth();
  const token = searchParams.get("token") ?? "";
  const initialEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [isVerifying, setIsVerifying] = useState(Boolean(token));
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(
    token
      ? null
      : "A verification email has already been sent. Please verify your email from your inbox.",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;

    async function verify() {
      setError(null);
      setIsVerifying(true);

      try {
        await verifyEmail({ token });

        if (isMounted) {
          setMessage("Your email is verified. You can now login and shop.");
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to verify email",
          );
        }
      } finally {
        if (isMounted) {
          setIsVerifying(false);
        }
      }
    }

    void verify();

    return () => {
      isMounted = false;
    };
  }, [token, verifyEmail]);

  async function handleResend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSending(true);

    try {
      await resendVerificationEmail({ email });
      setMessage("Verification email sent. Please check your inbox.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to resend verification email",
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AuthCard
      title="Verify Email"
      subtitle="Confirm your email before signing in."
      footerText="Already verified?"
      footerHref="/login"
      footerAction="Login"
    >
      <div className="auth-message">
        {isVerifying ? <h2>Verifying your email...</h2> : null}
        {message ? <p className="form-success">{message}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {message?.includes("verified") ? (
          <Link className="primary-link-button" href="/login">
            Continue to Login
          </Link>
        ) : (
          <form className="auth-form" onSubmit={handleResend}>
            <label>
              Email
              <input
                type="email"
                value={email}
                required
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <button
              className="primary-button"
              type="submit"
              disabled={isSending || !email}
            >
              {isSending ? "Sending..." : "Resend Verification Email"}
            </button>
          </form>
        )}
      </div>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="route-state">Loading...</main>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
