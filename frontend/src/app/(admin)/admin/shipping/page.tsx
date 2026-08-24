"use client";

import { useEffect, useState } from "react";

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

  const countryCount = zones.reduce(
    (total, zone) => total + zone.countries.length,
    0,
  );
  const rateCount = zones.reduce((total, zone) => total + zone.rates.length, 0);

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

      {isLoading ? (
        <section className="empty-surface">
          <h2>Loading shipping setup...</h2>
        </section>
      ) : (
        <section className="metadata-overview-grid">
          <article className="metadata-overview-card">
            <div>
              <p className="eyebrow">Zones</p>
              <strong>{zones.length}</strong>
              <p>{zones.filter((zone) => zone.isActive).length} active</p>
            </div>
          </article>
          <article className="metadata-overview-card">
            <div>
              <p className="eyebrow">Countries</p>
              <strong>{countryCount}</strong>
              <p>Assigned to shipping zones</p>
            </div>
          </article>
          <article className="metadata-overview-card">
            <div>
              <p className="eyebrow">Rates</p>
              <strong>{rateCount}</strong>
              <p>Available checkout methods</p>
            </div>
          </article>
        </section>
      )}
    </main>
  );
}
