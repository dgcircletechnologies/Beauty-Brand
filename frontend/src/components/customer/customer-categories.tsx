"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { OfferBadge } from "@/components/customer/offer-badge";
import * as customerApi from "@/lib/api/customer";

export function CustomerCategories() {
  const [categories, setCategories] = useState<customerApi.CustomerCategory[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      try {
        const nextCategories = await customerApi.getCustomerCategories({
          sort: "offers-first",
        });

        if (isMounted) {
          setCategories(nextCategories);
          setLoadError(null);
        }
      } catch (caughtError) {
        if (isMounted) {
          setLoadError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load categories",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const childCategories = useMemo(
    () => categories.filter((category) => category.parentId),
    [categories],
  );

  return (
    <main className="customer-page">
      <section className="customer-hero">
        <div>
          <p className="eyebrow">Explore</p>
          <h1>Shop by category</h1>
          <p>Browse skincare categories and jump straight into matching products.</p>
        </div>
      </section>

      {loadError ? <p className="form-error">{loadError}</p> : null}

      {isLoading ? (
        <section className="empty-surface">
          <h2>Loading categories...</h2>
        </section>
      ) : childCategories.length ? (
        <section className="customer-category-grid">
          {childCategories.map((category) => {
            const image = category.images?.[0];

            return (
              <Link
                className="customer-category-card"
                href={`/shop?category=${category.slug}`}
                key={category.id}
              >
                <span className="customer-category-media">
                  {image ? (
                    <img alt={image.altText ?? category.name} src={image.url} />
                  ) : (
                    <span>{category.name.slice(0, 1)}</span>
                  )}
                  {category.offer?.hasOffer ? (
                    <OfferBadge
                      className="product-card-offer-badge"
                      offer={category.offer.offer}
                      buyXGetY={category.offer.buyXGetY}
                    />
                  ) : null}
                </span>
                <strong>{category.name}</strong>
                {category.description ? <p>{category.description}</p> : null}
              </Link>
            );
          })}
        </section>
      ) : (
        <section className="empty-surface">
          <h2>No child categories yet</h2>
          <p>Active child categories will show here when they are added.</p>
        </section>
      )}
    </main>
  );
}
