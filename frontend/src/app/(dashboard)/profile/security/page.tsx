"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { UserShell } from "@/components/customer/user-shell";
import { useAuth } from "@/contexts/auth-context";
import * as customerApi from "@/lib/api/customer";

export default function ProfileSecurityPage() {
  const { accessToken, logout } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("newPassword"));
    const confirmPassword = String(formData.get("confirmPassword"));

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await customerApi.changePassword(accessToken, {
        currentPassword: String(formData.get("currentPassword")),
        newPassword,
      });
      setSuccess("Password changed. Please login again.");
      await logout();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to change password",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <UserShell>
      <main className="customer-page">
        <section className="dashboard-header">
          <div>
            <p className="eyebrow">Account Security</p>
            <h1>Change Password</h1>
            <p>Update your password and refresh all account sessions.</p>
          </div>
        </section>

        <nav className="profile-tabs" aria-label="Profile sections">
          <Link href="/profile">Profile</Link>
          <Link className="active" href="/profile/security">
            Password
          </Link>
          <Link href="/profile/sessions">Account Status</Link>
          <Link href="/addresses">Addresses</Link>
        </nav>

        <form className="account-form security-form" onSubmit={handleSubmit}>
          <div className="section-title">
            <div>
              <h2>Password</h2>
              <p>Changing your password logs out every active session.</p>
            </div>
          </div>
          <label>
            Current password
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <div className="split-fields">
            <label>
              New password
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label>
              Confirm password
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          {success ? <p className="form-success">{success}</p> : null}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Changing..." : "Change Password"}
          </button>
        </form>
      </main>
    </UserShell>
  );
}
