"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { UserShell } from "@/components/customer/user-shell";
import { useAuth } from "@/contexts/auth-context";
import * as customerApi from "@/lib/api/customer";
import type { AuthUser } from "@/lib/auth/types";

function formatGender(gender: AuthUser["gender"] | undefined) {
  if (!gender) {
    return "Not specified";
  }

  return gender.replaceAll("_", " ").toLowerCase();
}

export default function ProfilePage() {
  const { accessToken, updateUser, user } = useAuth();
  const [profile, setProfile] = useState<AuthUser | null>(user);
  const [isEditing, setIsEditing] = useState(false);
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
      setIsEditing(false);
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
      <main className="customer-page account-settings-page">
        <section className="dashboard-header account-settings-header">
          <div>
            <p className="eyebrow">Account</p>
            <h1>
              Account <em>Settings</em>
            </h1>
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
        ) : !isEditing ? (
          <section className="profile-overview">
            <div className="profile-overview-heading">
              <div>
                <h2>
                  {profile?.firstName || profile?.lastName
                    ? `${profile?.firstName ?? ""} ${
                        profile?.lastName ?? ""
                      }`.trim()
                    : "Your profile"}
                </h2>
                <p>Manage the details connected to your customer account.</p>
              </div>
              <button
                className="primary-button compact-button"
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                  setIsEditing(true);
                }}
              >
                Edit Profile
              </button>
            </div>

            {success ? <p className="form-success">{success}</p> : null}
            {error ? <p className="form-error">{error}</p> : null}

            <div className="profile-detail-grid">
              <article>
                <span>Name</span>
                <strong>
                  {profile?.firstName || profile?.lastName
                    ? `${profile?.firstName ?? ""} ${
                        profile?.lastName ?? ""
                      }`.trim()
                    : "Not specified"}
                </strong>
              </article>
              <article>
                <span>Email</span>
                <strong>{profile?.email ?? "Not specified"}</strong>
              </article>
              <article>
                <span>Phone</span>
                <strong>{profile?.phone || "Not specified"}</strong>
              </article>
              <article>
                <span>Gender</span>
                <strong>{formatGender(profile?.gender)}</strong>
              </article>
              <article>
                <span>Age</span>
                <strong>{profile?.age ?? "Not specified"}</strong>
              </article>
              <article>
                <span>Account status</span>
                <strong>{profile?.status ?? "Unknown"}</strong>
              </article>
            </div>
          </section>
        ) : (
          <form
            className="account-form profile-form"
            key={`${profile?.id ?? "profile"}-edit`}
            onSubmit={handleSubmit}
          >
            <section className="account-setting-row">
              <div>
                <h2>Name</h2>
                <p>This is used across your customer account and orders.</p>
              </div>
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
            </section>
            <section className="account-setting-row">
              <div>
                <h2>Email</h2>
                <p>Your email is used for login and order updates.</p>
              </div>
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  defaultValue={profile?.email ?? ""}
                  disabled
                  required
                />
              </label>
            </section>
            <section className="account-setting-row">
              <div>
                <h2>Contact</h2>
                <p>Add a phone number so delivery teams can reach you.</p>
              </div>
              <label>
                Phone
                <input name="phone" defaultValue={profile?.phone ?? ""} />
              </label>
            </section>
            <section className="account-setting-row">
              <div>
                <h2>Personal details</h2>
                <p>Optional details help personalize your shopping experience.</p>
              </div>
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
            </section>
            {error ? <p className="form-error">{error}</p> : null}
            {success ? <p className="form-success">{success}</p> : null}
            <div className="account-form-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </main>
    </UserShell>
  );
}
