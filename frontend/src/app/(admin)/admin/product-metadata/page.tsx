"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

      <section className="metadata-overview-grid">
        {productMetadataConfigs.map((config) => {
          const items = metadata[config.resource] ?? [];

          return (
            <article className="metadata-overview-card" key={config.resource}>
              <div>
                <h2>{config.pluralLabel}</h2>
                <p>{config.description}</p>
              </div>
              <strong>{isLoading ? "..." : items.length}</strong>
              <Link
                className="secondary-link-button"
                href={`/admin/product-metadata/${config.resource}/add`}
              >
                Add {config.singularLabel}
              </Link>
            </article>
          );
        })}
      </section>
    </main>
  );
}
