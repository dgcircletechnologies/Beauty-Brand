"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import * as customerApi from "@/lib/api/customer";
import type { AuthUser } from "@/lib/auth/types";

type AccountSection = "profile" | "security" | "sessions";

type AccountSettingsProps = {
  activeSection: AccountSection;
  basePath: string;
  headingEyebrow?: string;
  headingTitle?: ReactNode;
  headingDescription?: string;
  includeAddresses?: boolean;
  showRole?: boolean;
};

function formatGender(gender: AuthUser["gender"] | undefined) {
  if (!gender) {
    return "Not specified";
  }

  return gender.replaceAll("_", " ").toLowerCase();
}

function formatRole(role: AuthUser["role"] | undefined) {
  if (!role) {
    return "Unknown";
  }

  return role.replaceAll("_", " ").toLowerCase();
}

function getDisplayName(profile: AuthUser | null) {
  const name = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim();

  return name || "Your profile";
}

export function AccountSettings({
  activeSection,
  basePath,
  headingEyebrow = "Account",
  headingTitle = (
    <>
      Account <em>Settings</em>
    </>
  ),
  headingDescription,
  includeAddresses = true,
  showRole = false,
}: AccountSettingsProps) {
  return (
    <main className="customer-page account-settings-page">
      <section className="dashboard-header account-settings-header">
        <div>
          <p className="eyebrow">{headingEyebrow}</p>
          <h1>{headingTitle}</h1>
          {headingDescription ? <p>{headingDescription}</p> : null}
        </div>
      </section>

      <nav className="profile-tabs" aria-label="Profile sections">
        <Link
          className={activeSection === "profile" ? "active" : undefined}
          href={basePath}
        >
          Profile
        </Link>
        <Link
          className={activeSection === "security" ? "active" : undefined}
          href={`${basePath}/security`}
        >
          Password
        </Link>
        <Link
          className={activeSection === "sessions" ? "active" : undefined}
          href={`${basePath}/sessions`}
        >
          Account Status
        </Link>
        {includeAddresses ? <Link href="/addresses">Addresses</Link> : null}
      </nav>

      {activeSection === "profile" ? <ProfileSection showRole={showRole} /> : null}
      {activeSection === "security" ? <SecuritySection /> : null}
      {activeSection === "sessions" ? <SessionsSection /> : null}
    </main>
  );
}

function ProfileSection({ showRole }: { showRole: boolean }) {
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
        setIsLoading(false);
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

  if (isLoading) {
    return (
      <section className="empty-surface">
        <h2>Loading profile...</h2>
      </section>
    );
  }

  if (!isEditing) {
    return (
      <section className="profile-overview">
        <div className="profile-overview-heading">
          <div>
            <h2>{getDisplayName(profile)}</h2>
            <p>Manage the details connected to your account.</p>
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
            <strong>{getDisplayName(profile)}</strong>
          </article>
          <article>
            <span>Email</span>
            <strong>{profile?.email ?? "Not specified"}</strong>
          </article>
          {showRole ? (
            <article>
              <span>Role</span>
              <strong>{formatRole(profile?.role)}</strong>
            </article>
          ) : null}
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
    );
  }

  return (
    <form
      className="account-form profile-form"
      key={`${profile?.id ?? "profile"}-edit`}
      onSubmit={handleSubmit}
    >
      <section className="account-setting-row">
        <div>
          <h2>Name</h2>
          <p>This is used across your account and orders.</p>
        </div>
        <div className="split-fields">
          <label>
            First name
            <input name="firstName" defaultValue={profile?.firstName ?? ""} required />
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
          <p>Your email is used for login and account updates.</p>
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
          <p>Add a phone number so teams can reach you when needed.</p>
        </div>
        <label>
          Phone
          <input name="phone" defaultValue={profile?.phone ?? ""} />
        </label>
      </section>
      <section className="account-setting-row">
        <div>
          <h2>Personal details</h2>
          <p>Optional details help personalize your account experience.</p>
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
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

function SecuritySection() {
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
  );
}

function SessionsSection() {
  const { accessToken, isBootstrapping, logout, logoutAll, user } = useAuth();
  const [sessions, setSessions] = useState<customerApi.AccountSessions | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!accessToken) {
      if (!isBootstrapping) {
        queueMicrotask(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
      }

      return () => {
        isMounted = false;
      };
    }

    const tokenSnapshot = accessToken;

    async function loadAccountStatus() {
      setIsLoading(true);
      setError(null);

      try {
        const nextSessions = await customerApi.getAccountSessions(tokenSnapshot);

        if (isMounted) {
          setSessions(nextSessions);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load account status",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAccountStatus();

    return () => {
      isMounted = false;
    };
  }, [accessToken, isBootstrapping]);

  async function revokeSession(sessionId: string, isCurrent: boolean) {
    if (!accessToken) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await customerApi.revokeAccountSession(accessToken, sessionId);

      if (isCurrent) {
        await logout();
        return;
      }

      setSessions(await customerApi.getAccountSessions(accessToken));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to logout session",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <section className="empty-surface">
        <h2>Loading account status...</h2>
      </section>
    );
  }

  return (
    <>
      {error ? <p className="form-error">{error}</p> : null}
      <section className="account-status-layout">
        <article className="account-status-card">
          <span>Status</span>
          <strong>{user?.status ?? "Unknown"}</strong>
          <p>
            {user?.emailVerifiedAt
              ? `Email verified on ${new Date(
                  user.emailVerifiedAt,
                ).toLocaleDateString()}.`
              : "Email is not verified."}
          </p>
        </article>
        <article className="account-status-card">
          <span>Active sessions</span>
          <strong>{sessions?.activeSessionCount ?? 0}</strong>
          <p>Each active session represents a browser login.</p>
        </article>

        <section className="session-panel">
          <div className="section-title">
            <div>
              <h2>Logged-in Browsers</h2>
              <p>
                Device details are captured from browser and IP headers when
                available.
              </p>
            </div>
            <button
              className="secondary-button compact-button"
              disabled={isSubmitting}
              type="button"
              onClick={() => void logoutAll()}
            >
              Logout All
            </button>
          </div>

          <div className="session-list">
            {sessions?.sessions.map((session) => (
              <article className="session-row" key={session.id}>
                <div>
                  <strong>
                    {session.isCurrent
                      ? session.deviceLabel ?? "Current browser"
                      : session.deviceLabel ?? "Browser session"}
                  </strong>
                  <span className="session-row-status">
                    {session.isCurrent ? "Current Session" : null}
                    {session.isCurrent ? " · " : null}
                    {session.isActive ? "Active" : "Expired"}
                  </span>
                </div>
                <dl className="session-meta-grid">
                  <div>
                    <dt>IP</dt>
                    <dd>{session.ipAddress ?? "Unavailable"}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>{session.location ?? "Unavailable"}</dd>
                  </div>
                  <div>
                    <dt>Last used</dt>
                    <dd>
                      {session.lastUsedAt
                        ? new Date(session.lastUsedAt).toLocaleString()
                        : "Unavailable"}
                    </dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{new Date(session.createdAt).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Expires</dt>
                    <dd>{new Date(session.expiresAt).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Current</dt>
                    <dd>{session.isCurrent ? "This browser" : "Other login"}</dd>
                  </div>
                </dl>
                <button
                  className="secondary-button compact-button"
                  disabled={isSubmitting}
                  type="button"
                  onClick={() => void revokeSession(session.id, session.isCurrent)}
                >
                  Logout
                </button>
              </article>
            ))}
          </div>
        </section>
      </section>
    </>
  );
}
