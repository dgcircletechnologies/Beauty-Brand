"use client";

import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import * as adminApi from "@/lib/api/admin";

export default function AdminShippingZonesPage() {
  const { accessToken } = useAuth();
  const [zones, setZones] = useState<adminApi.AdminShippingZone[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadZones() {
    if (!accessToken) {
      return;
    }

    try {
      setZones(await adminApi.getAdminShippingZones(accessToken));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load shipping zones",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadZones();
  }, [accessToken]);

  async function handleCreateZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.createAdminShippingZone(accessToken, {
        name,
        code,
        isActive: true,
      });
      setName("");
      setCode("");
      setSuccess("Shipping zone created.");
      await loadZones();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create shipping zone",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleZone(zone: adminApi.AdminShippingZone) {
    if (!accessToken) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.updateAdminShippingZone(accessToken, zone.id, {
        isActive: !zone.isActive,
      });
      setSuccess("Shipping zone updated.");
      await loadZones();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update shipping zone",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Shipping</p>
          <h1>Zones</h1>
          <p>Create and activate the regions used for shipping rules.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <section className="admin-order-layout">
        <form className="catalog-section admin-form" onSubmit={handleCreateZone}>
          <h2>Add Zone</h2>
          <label>
            Zone name
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Code
            <input
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          <button className="primary-button" disabled={isSubmitting} type="submit">
            Add Zone
          </button>
        </form>

        <section className="catalog-section">
          <div className="section-title">
            <h2>Existing Zones</h2>
            <span>{zones.length}</span>
          </div>
          {isLoading ? (
            <p>Loading zones...</p>
          ) : (
            <div className="admin-data-list">
              {zones.map((zone) => (
                <div className="admin-data-row" key={zone.id}>
                  <div>
                    <h3>{zone.name}</h3>
                    <p>{zone.code}</p>
                  </div>
                  <span>{zone.isActive ? "active" : "inactive"}</span>
                  <button
                    className="secondary-button compact-button"
                    disabled={isSubmitting}
                    type="button"
                    onClick={() => void toggleZone(zone)}
                  >
                    Toggle
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
