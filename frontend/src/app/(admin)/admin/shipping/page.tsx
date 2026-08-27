"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import * as adminApi from "@/lib/api/admin";

export default function AdminShippingPage() {
  const { accessToken } = useAuth();
  const [zones, setZones] = useState<adminApi.AdminShippingZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadShipping() {
      setError(null);
      setIsLoading(true);

      try {
        const nextZones = await adminApi.getAdminShippingZones(token);

        if (isMounted) {
          setZones(nextZones);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load shipping setup",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadShipping();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const activeZones = useMemo(
    () => zones.filter((zone) => zone.isActive),
    [zones],
  );
  const countryCount = useMemo(
    () => zones.reduce((total, zone) => total + zone.countries.length, 0),
    [zones],
  );
  const activeCountryCount = useMemo(
    () =>
      zones.reduce(
        (total, zone) =>
          total +
          zone.countries.filter((country) => country.isActive).length,
        0,
      ),
    [zones],
  );
  const rateCount = useMemo(
    () => zones.reduce((total, zone) => total + zone.rates.length, 0),
    [zones],
  );
  const activeRateCount = useMemo(
    () =>
      zones.reduce(
        (total, zone) =>
          total + zone.rates.filter((rate) => rate.isActive).length,
        0,
      ),
    [zones],
  );
  const readyZones = useMemo(
    () =>
      zones.filter(
        (zone) =>
          zone.isActive &&
          zone.countries.some((country) => country.isActive) &&
          zone.rates.some((rate) => rate.isActive),
      ),
    [zones],
  );
  const readinessPercent = activeZones.length
    ? Math.round((readyZones.length / activeZones.length) * 100)
    : 0;
  const recentZones = useMemo(() => zones.slice(0, 5), [zones]);

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Shipping</h1>
          <p>Review shipping setup before managing zones, countries, or rates.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="shipping-hero-panel">
        <div>
          <p className="eyebrow">Checkout Readiness</p>
          <h2>{isLoading ? "Loading..." : `${readinessPercent}%`}</h2>
          <p>
            {readyZones.length} of {activeZones.length} active zones have an
            active country and rate.
          </p>
        </div>
        <div className="currency-coverage">
          <span>{readyZones.length}</span>
          <div>
            <i style={{ width: `${readinessPercent}%` }} />
          </div>
          <small>zones ready for checkout</small>
        </div>
      </section>

      <section className="currency-metric-grid">
        <article>
          <span>Zones</span>
          <strong>{isLoading ? "..." : zones.length}</strong>
          <p>{activeZones.length} active</p>
        </article>
        <article>
          <span>Countries</span>
          <strong>{isLoading ? "..." : countryCount}</strong>
          <p>{activeCountryCount} active</p>
        </article>
        <article>
          <span>Rates</span>
          <strong>{isLoading ? "..." : rateCount}</strong>
          <p>{activeRateCount} active</p>
        </article>
      </section>

      <section className="shipping-workspace">
        <div className="catalog-section">
          <div className="section-title">
            <h2>Quick Actions</h2>
          </div>
          <div className="currency-action-grid">
            <Link href="/admin/shipping/zones">
              <strong>Zones</strong>
              <span>Create regions and activate delivery coverage.</span>
            </Link>
            <Link href="/admin/shipping/countries">
              <strong>Countries</strong>
              <span>Assign countries to exactly one shipping zone.</span>
            </Link>
            <Link href="/admin/shipping/rates">
              <strong>Rates</strong>
              <span>Control checkout methods, limits, and delivery windows.</span>
            </Link>
          </div>
        </div>

        <section className="catalog-section">
          <div className="section-title">
            <h2>Zone Health</h2>
            <span>{recentZones.length}</span>
          </div>
          {isLoading ? (
            <p className="muted-text">Loading shipping setup...</p>
          ) : (
            <div className="admin-data-list">
              {recentZones.map((zone) => (
                <article className="shipping-row" key={zone.id}>
                  <div>
                    <h3>{zone.name}</h3>
                    <p>
                      {zone.countries.filter((country) => country.isActive).length}
                      {" active countries | "}
                      {zone.rates.filter((rate) => rate.isActive).length}
                      {" active rates"}
                    </p>
                  </div>
                  <span>{zone.isActive ? "active" : "inactive"}</span>
                </article>
              ))}
              {recentZones.length === 0 ? (
                <p className="muted-text">No shipping zones configured yet.</p>
              ) : null}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
