"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { UserShell } from "@/components/customer/user-shell";
import { useAuth } from "@/contexts/auth-context";
import * as customerApi from "@/lib/api/customer";
import type { AuthUser } from "@/lib/auth/types";

export default function ProfilePage() {
  const { accessToken, updateUser, user } = useAuth();
  const [profile, setProfile] = useState<AuthUser | null>(user);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!accessToken) {
        return;
      }

      try {
        const nextProfile = await customerApi.getProfile(accessToken);

        if (isMounted) {
          setProfile(nextProfile);
          updateUser(nextProfile);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load profile",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [accessToken, updateUser]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const nextProfile = await customerApi.updateProfile(accessToken, {
        firstName: String(formData.get("firstName")),
        lastName: String(formData.get("lastName") || ""),
        phone: String(formData.get("phone") || ""),
        gender:
          String(formData.get("gender") || "") === ""
            ? undefined
            : (String(
                formData.get("gender"),
              ) as customerApi.UpdateProfilePayload["gender"]),
        age:
          String(formData.get("age") || "") === ""
            ? undefined
            : Number(formData.get("age")),
      });

      setProfile(nextProfile);
      updateUser(nextProfile);
      setSuccess("Profile updated successfully.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update profile",
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
            <p className="eyebrow">Account</p>
            <h1>Profile</h1>
            <p>Edit your personal details.</p>
          </div>
        </section>

        <nav className="profile-tabs" aria-label="Profile sections">
          <Link className="active" href="/profile">
            Profile
          </Link>
          <Link href="/profile/security">Password</Link>
          <Link href="/profile/sessions">Account Status</Link>
          <Link href="/addresses">Addresses</Link>
        </nav>

        {isLoading ? (
          <section className="empty-surface">
            <h2>Loading profile...</h2>
          </section>
        ) : (
          <form className="account-form profile-form" onSubmit={handleSubmit}>
            <div className="split-fields">
              <label>
                First name
                <input
                  name="firstName"
                  defaultValue={profile?.firstName ?? ""}
                  required
                />
              </label>
              <label>
                Last name
                <input name="lastName" defaultValue={profile?.lastName ?? ""} />
              </label>
            </div>
            <label>
              Email
              <input
                name="email"
                type="email"
                defaultValue={profile?.email ?? ""}
                disabled
                required
              />
            </label>
            <label>
              Phone
              <input name="phone" defaultValue={profile?.phone ?? ""} />
            </label>
            <div className="split-fields">
              <label>
                Gender
                <select name="gender" defaultValue={profile?.gender ?? ""}>
                  <option value="">Not specified</option>
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="NON_BINARY">Non-binary</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </label>
              <label>
                Age
                <input
                  name="age"
                  type="number"
                  min={1}
                  max={130}
                  defaultValue={profile?.age ?? ""}
                />
              </label>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            {success ? <p className="form-success">{success}</p> : null}
            <button
              className="primary-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Profile"}
            </button>
          </form>
        )}
      </main>
    </UserShell>
  );
}
