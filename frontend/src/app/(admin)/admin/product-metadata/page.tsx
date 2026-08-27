"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import {
  AdminProductMetadataItem,
  getProductMetadataItems,
} from "@/lib/api/admin";
import { productMetadataConfigs } from "@/lib/product-metadata/config";

export default function ProductMetadataPage() {
  const { accessToken } = useAuth();
  const [metadata, setMetadata] = useState<
    Record<string, AdminProductMetadataItem[]>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadMetadata() {
      setError(null);
      setIsLoading(true);

      try {
        const entries = await Promise.all(
          productMetadataConfigs.map(async (config) => {
            const items = await getProductMetadataItems(token, config.resource);
            return [config.resource, items] as const;
          }),
        );

        if (isMounted) {
          setMetadata(Object.fromEntries(entries));
        }
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load product metadata",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadMetadata();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const metadataStats = useMemo(
    () =>
      productMetadataConfigs.map((config) => {
        const items = metadata[config.resource] ?? [];
        const activeCount = items.filter((item) => item.isActive).length;

        return {
          ...config,
          activeCount,
          count: items.length,
          latestItem: items[0] ?? null,
        };
      }),
    [metadata],
  );
  const totalRecords = useMemo(
    () => metadataStats.reduce((total, stat) => total + stat.count, 0),
    [metadataStats],
  );
  const totalActiveRecords = useMemo(
    () => metadataStats.reduce((total, stat) => total + stat.activeCount, 0),
    [metadataStats],
  );
  const completionPercent = totalRecords
    ? Math.round((totalActiveRecords / totalRecords) * 100)
    : 0;

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Product Metadata</h1>
          <p>Manage reusable product classification data in one place.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="metadata-hero-panel">
        <div>
          <p className="eyebrow">Metadata Health</p>
          <h2>{isLoading ? "Loading..." : `${completionPercent}%`}</h2>
          <p>
            {totalActiveRecords} active records across {metadataStats.length}
            {" product metadata groups."}
          </p>
        </div>
        <div className="currency-coverage">
          <span>{totalRecords}</span>
          <div>
            <i style={{ width: `${completionPercent}%` }} />
          </div>
          <small>total saved records</small>
        </div>
      </section>

      <section className="metadata-overview-grid">
        {metadataStats.map((config) => (
          <article className="metadata-overview-card" key={config.resource}>
            <div>
              <span>{config.activeCount} active</span>
              <h2>{config.pluralLabel}</h2>
              <p>{config.description}</p>
              {config.latestItem ? (
                <small>Latest: {config.latestItem.name}</small>
              ) : (
                <small>No records yet</small>
              )}
            </div>
            <strong>{isLoading ? "..." : config.count}</strong>
            <Link
              className="secondary-link-button"
              href={`/admin/product-metadata/${config.resource}/add`}
            >
              Manage {config.pluralLabel}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
