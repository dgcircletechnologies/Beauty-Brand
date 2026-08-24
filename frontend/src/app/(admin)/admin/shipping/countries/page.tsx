"use client";

import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import * as adminApi from "@/lib/api/admin";

export default function AdminShippingCountriesPage() {
  const { accessToken } = useAuth();
  const [zones, setZones] = useState<adminApi.AdminShippingZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [countryName, setCountryName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedZone = zones.find((zone) => zone.id === selectedZoneId);

  async function loadZones() {
    if (!accessToken) {
      return;
    }

    try {
      const nextZones = await adminApi.getAdminShippingZones(accessToken);
      setZones(nextZones);
      setSelectedZoneId((currentId) => currentId || nextZones[0]?.id || "");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load shipping countries",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadZones();
  }, [accessToken]);

  async function handleCreateCountry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken || !selectedZoneId) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.addAdminZoneCountry(accessToken, selectedZoneId, {
        countryCode,
        countryName,
        isActive: true,
      });
      setCountryCode("");
      setCountryName("");
      setSuccess("Country added to zone.");
      await loadZones();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to add country",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleCountry(country: adminApi.AdminZoneCountry) {
    if (!accessToken) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.updateAdminZoneCountry(accessToken, country.id, {
        isActive: !country.isActive,
      });
      setSuccess("Country updated.");
      await loadZones();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update country",
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
          <h1>Countries</h1>
          <p>Assign countries to the zones used during checkout.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <section className="admin-order-layout">
        <form className="catalog-section admin-form" onSubmit={handleCreateCountry}>
          <h2>Add Country</h2>
          <label>
            Zone
            <select
              required
              value={selectedZoneId}
              onChange={(event) => setSelectedZoneId(event.target.value)}
            >
              <option value="">Select zone</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </label>
          <div className="split-fields">
            <label>
              Country code
              <input
                required
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
              />
            </label>
            <label>
              Country name
              <input
                required
                value={countryName}
                onChange={(event) => setCountryName(event.target.value)}
              />
            </label>
          </div>
          <button className="primary-button" disabled={isSubmitting} type="submit">
            Add Country
          </button>
        </form>

        <section className="catalog-section">
          <div className="section-title">
            <h2>{selectedZone?.name ?? "Countries"}</h2>
            <span>{selectedZone?.countries.length ?? 0}</span>
          </div>
          {isLoading ? (
            <p>Loading countries...</p>
          ) : (
            <div className="admin-data-list">
              {selectedZone?.countries.map((country) => (
                <div className="admin-data-row" key={country.id}>
                  <div>
                    <h3>{country.countryName}</h3>
                    <p>{country.countryCode}</p>
                  </div>
                  <span>{country.isActive ? "active" : "inactive"}</span>
                  <button
                    className="secondary-button compact-button"
                    disabled={isSubmitting}
                    type="button"
                    onClick={() => void toggleCountry(country)}
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
