"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { OfferForm } from "@/components/admin/offer-form";
import { useAuth } from "@/contexts/auth-context";
import { getAdminOffer } from "@/lib/api/admin";
import type { AdminOffer } from "@/lib/api/admin";

export default function EditOfferPage() {
  const params = useParams<{ offerId: string }>();
  const { accessToken } = useAuth();
  const [offer, setOffer] = useState<AdminOffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || !params.offerId) {
      return;
    }

    let isMounted = true;
    const token = accessToken;
    const offerId = params.offerId;

    async function loadOffer() {
      setError(null);
      setIsLoading(true);

      try {
        const nextOffer = await getAdminOffer(token, offerId);

        if (isMounted) {
          setOffer(nextOffer);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load offer",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadOffer();

    return () => {
      isMounted = false;
    };
  }, [accessToken, params.offerId]);

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Offers / Edit</p>
          <h1>Edit Offer</h1>
          <p>{offer?.name ?? "Update promotional offer configuration."}</p>
        </div>
        <Link
          className="secondary-button compact-button"
          href={`/admin/offers/${params.offerId}/targets`}
        >
          Manage Targets
        </Link>
      </section>

      {isLoading ? (
        <section className="empty-surface">
          <p className="muted-text">Loading offer...</p>
        </section>
      ) : error ? (
        <section className="empty-surface">
          <h2>Offer unavailable</h2>
          <p>{error}</p>
        </section>
      ) : offer ? (
        <OfferForm initialData={offer} mode="edit" />
      ) : (
        <section className="empty-surface">
          <h2>Offer unavailable</h2>
          <p>Unable to load this offer.</p>
        </section>
      )}
    </main>
  );
}
