"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { UserShell } from "@/components/customer/user-shell";
import { useAuth } from "@/contexts/auth-context";
import * as customerApi from "@/lib/api/customer";

export default function ProfileSessionsPage() {
  const {
    accessToken,
    isBootstrapping,
    logout,
    logoutAll,
    user,
  } = useAuth();
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
        const nextSessions = await customerApi.getAccountSessions(
          tokenSnapshot,
        );

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

  return (
    <UserShell>
      <main className="customer-page">
        <section className="dashboard-header">
          <div>
            <p className="eyebrow">Account Status</p>
            <h1>Sessions and Devices</h1>
            <p>Review active login sessions and sign out devices.</p>
          </div>
        </section>

        <nav className="profile-tabs" aria-label="Profile sections">
          <Link href="/profile">Profile</Link>
          <Link href="/profile/security">Password</Link>
          <Link className="active" href="/profile/sessions">
            Account Status
          </Link>
          <Link href="/addresses">Addresses</Link>
        </nav>

        {error ? <p className="form-error">{error}</p> : null}

        {isLoading ? (
          <section className="empty-surface">
            <h2>Loading account status...</h2>
          </section>
        ) : (
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
                        <dd>
                          {session.isCurrent ? "This browser" : "Other login"}
                        </dd>
                      </div>
                    </dl>
                    <button
                      className="secondary-button compact-button"
                      disabled={isSubmitting}
                      type="button"
                      onClick={() =>
                        void revokeSession(session.id, session.isCurrent)
                      }
                    >
                      Logout
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </section>
        )}
      </main>
    </UserShell>
  );
}
