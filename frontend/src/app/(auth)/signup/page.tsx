"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { PasswordField } from "@/components/auth/password-field";
import { useAuth } from "@/contexts/auth-context";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    const confirmPassword = String(formData.get("confirmPassword"));

    if (password !== confirmPassword) {
      setError("Password and confirm password do not match");
      setIsSubmitting(false);
      return;
    }

    try {
      await signup({
        firstName: String(formData.get("firstName")),
        lastName: String(formData.get("lastName") || ""),
        email,
        phone: String(formData.get("phone") || ""),
        gender:
          String(formData.get("gender") || "") === ""
            ? undefined
            : (String(formData.get("gender")) as Parameters<
                typeof signup
              >[0]["gender"]),
        age:
          String(formData.get("age") || "") === ""
            ? undefined
            : Number(formData.get("age")),
        password,
      });

      router.replace(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create account right now",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Sign Up"
      subtitle="Create a customer account."
      footerText="Already have an account?"
      footerHref="/login"
      footerAction="Login"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
          <div className="split-fields">
            <label>
              First name
              <input name="firstName" autoComplete="given-name" required />
            </label>
            <label>
              Last name
              <input name="lastName" autoComplete="family-name" />
            </label>
          </div>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Phone
            <input name="phone" type="tel" autoComplete="tel" />
          </label>
          <div className="split-fields">
            <label>
              Gender
              <select name="gender" defaultValue="">
                <option value="">Not specified</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="NON_BINARY">Non-binary</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </label>
            <label>
              Age
              <input name="age" type="number" min={1} max={130} />
            </label>
          </div>
          <PasswordField
            label="Password"
            name="password"
            autoComplete="new-password"
            minLength={8}
          />
          <PasswordField
            label="Confirm password"
            name="confirmPassword"
            autoComplete="new-password"
            minLength={8}
          />
          {error ? <p className="form-error">{error}</p> : null}
          <button
            className="primary-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Account"}
          </button>
      </form>
    </AuthCard>
  );
}
