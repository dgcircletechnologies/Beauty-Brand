"use client";

import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import * as adminApi from "@/lib/api/admin";

type FormState = {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
};

const emptyForm: FormState = {
  keyId: "",
  keySecret: "",
  webhookSecret: "",
};

export default function RazorpaySettingsPage() {
  const { accessToken } = useAuth();
  const [settings, setSettings] = useState<adminApi.RazorpaySettings | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadSettings() {
      setIsLoading(true);
      setError(null);

      try {
        const nextSettings = await adminApi.getRazorpaySettings(token);

        if (isMounted) {
          setSettings(nextSettings);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load Razorpay settings",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const nextSettings = await adminApi.updateRazorpaySettings(accessToken, {
        keyId: form.keyId,
        keySecret: form.keySecret,
        webhookSecret: form.webhookSecret,
      });

      setSettings(nextSettings);
      setForm(emptyForm);
      setSuccess("Razorpay settings saved.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save Razorpay settings",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="admin-page">
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Payments</p>
          <h1>Razorpay Variables</h1>
          <p>Manage checkout keys and webhook signing for Razorpay.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      {isLoading ? (
        <section className="empty-surface">
          <h2>Loading Razorpay settings...</h2>
        </section>
      ) : (
        <section className="settings-layout">
          <form className="settings-panel" onSubmit={handleSubmit}>
            <div className="section-title">
              <h2>Credentials</h2>
              <span>{settingsReady(settings) ? "Ready" : "Incomplete"}</span>
            </div>

            <label>
              <span>Key ID</span>
              <input
                autoComplete="off"
                placeholder={settings?.keyId.maskedValue || "rzp_test_..."}
                value={form.keyId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    keyId: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              <span>Key Secret</span>
              <input
                autoComplete="new-password"
                placeholder={settings?.keySecret.maskedValue || "Enter secret"}
                type="password"
                value={form.keySecret}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    keySecret: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              <span>Webhook Secret</span>
              <input
                autoComplete="new-password"
                placeholder={
                  settings?.webhookSecret.maskedValue || "Enter webhook secret"
                }
                type="password"
                value={form.webhookSecret}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    webhookSecret: event.target.value,
                  }))
                }
              />
            </label>

            <button
              className="primary-button compact-button"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Saving..." : "Save Variables"}
            </button>
          </form>

          <aside className="settings-panel">
            <div className="section-title">
              <h2>Status</h2>
              <span>Razorpay</span>
            </div>
            <div className="detail-table">
              <SettingRow label="Key ID" setting={settings?.keyId} />
              <SettingRow label="Key Secret" setting={settings?.keySecret} />
              <SettingRow
                label="Webhook Secret"
                setting={settings?.webhookSecret}
              />
              <div className="detail-table-row">
                <span>Webhook Path</span>
                <strong>{settings?.webhookPath ?? "-"}</strong>
              </div>
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}

function SettingRow({
  label,
  setting,
}: {
  label: string;
  setting?: adminApi.RazorpaySettingValue;
}) {
  return (
    <div className="detail-table-row">
      <span>{label}</span>
      <strong>{setting?.configured ? setting.maskedValue : "Missing"}</strong>
    </div>
  );
}

function settingsReady(settings: adminApi.RazorpaySettings | null) {
  return Boolean(
    settings?.keyId.configured &&
      settings.keySecret.configured &&
      settings.webhookSecret.configured,
  );
}
