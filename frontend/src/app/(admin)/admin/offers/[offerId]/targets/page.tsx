"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  OfferTargetSelector,
  getOfferTargetCounts,
  toOfferTargetPayload,
  toSelectedOfferTargets,
} from "@/components/admin/offer-target-selector";
import { useAuth } from "@/contexts/auth-context";
import { useCurrency } from "@/contexts/currency-context";
import {
  createAdminOfferTarget,
  deleteAdminOfferTarget,
  getAdminOffer,
  getAdminOfferTargets,
} from "@/lib/api/admin";
import { getOfferDisplayLabel } from "@/lib/offers/format";
import type { SelectedOfferTarget } from "@/components/admin/offer-target-selector";
import type { AdminOffer, AdminOfferTarget } from "@/lib/api/admin";

export default function ManageOfferTargetsPage() {
  const params = useParams<{ offerId: string }>();
  const { accessToken } = useAuth();
  const { formatPrice } = useCurrency();
  const [offer, setOffer] = useState<AdminOffer | null>(null);
  const [targets, setTargets] = useState<SelectedOfferTarget[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const offerId = params.offerId;

  const targetCounts = useMemo(() => getOfferTargetCounts(targets), [targets]);
  const discountLabel =
    offer && getOfferDisplayLabel(
      {
        type: offer.type,
        value: offer.value,
        buyXGetY: offer.buyXGetYConfig ?? null,
      },
      formatPrice,
    );

  useEffect(() => {
    if (!accessToken || !offerId) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadOfferTargets() {
      setError(null);
      setIsLoading(true);

      try {
        const [nextOffer, nextTargets] = await Promise.all([
          getAdminOffer(token, offerId),
          getAdminOfferTargets(token, offerId),
        ]);

        if (isMounted) {
          setOffer(nextOffer);
          setTargets(toSelectedOfferTargets(nextTargets));
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load offer targets",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadOfferTargets();

    return () => {
      isMounted = false;
    };
  }, [accessToken, offerId]);

  async function refetchTargets() {
    if (!accessToken || !offerId) {
      return;
    }

    const nextTargets = await getAdminOfferTargets(accessToken, offerId);
    setTargets(toSelectedOfferTargets(nextTargets));
  }

  async function handleTargetsChange(nextTargets: SelectedOfferTarget[]) {
    if (!accessToken || !offerId || isMutating) {
      return;
    }

    const addedTarget = nextTargets.find(
      (target) => !targets.some((currentTarget) => currentTarget.key === target.key),
    );
    const removedTarget = targets.find(
      (target) => !nextTargets.some((nextTarget) => nextTarget.key === target.key),
    );

    setError(null);
    setSuccess(null);
    setIsMutating(true);

    try {
      if (addedTarget) {
        await createAdminOfferTarget(accessToken, offerId, toOfferTargetPayload(addedTarget));
        setSuccess(`${addedTarget.label} assigned to this offer.`);
      } else if (removedTarget) {
        const shouldRemove = window.confirm(
          `Remove this direct ${formatTargetType(removedTarget.type)} target?\n\nThe offer may still apply through another target, such as a category.`,
        );

        if (!shouldRemove) {
          return;
        }

        if (!removedTarget.existingTargetId) {
          throw new Error("Unable to remove target because its server ID is missing.");
        }

        await deleteAdminOfferTarget(accessToken, offerId, removedTarget.existingTargetId);
        setSuccess(`${removedTarget.label} removed from this offer.`);
      }

      await refetchTargets();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update offer targets",
      );
      await refetchTargets().catch(() => undefined);
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <main className="offers-admin-page">
      <section className="dashboard-header offers-dashboard-header">
        <div>
          <p className="eyebrow">Offers / Targets</p>
          <h1>Manage Offer Targets</h1>
          <p>{offer?.name ?? "Assign this offer to categories, products or variants."}</p>
        </div>
        <div className="row-actions">
          <Link className="secondary-button compact-button" href="/admin/offers">
            Back to Offers
          </Link>
          <Link
            className="primary-button compact-button"
            href={`/admin/offers/${offerId}/edit`}
          >
            Edit Offer
          </Link>
        </div>
      </section>

      {isLoading ? (
        <section className="empty-surface">
          <p className="muted-text">Loading offer targets...</p>
        </section>
      ) : error && !offer ? (
        <section className="empty-surface">
          <h2>Offer unavailable</h2>
          <p>{error}</p>
        </section>
      ) : offer ? (
        <div className="offer-targets-page-layout">
          <section className="form-surface admin-form offer-targets-main">
            {error ? <p className="form-error">{error}</p> : null}
            {success ? <p className="form-success">{success}</p> : null}
            <p className="muted-text">
              A product or variant may qualify for multiple offers. The backend determines the effective offer according to the configured priority and resolution rules.
            </p>
            <OfferTargetSelector
              accessToken={accessToken}
              disabled={isMutating}
              summaryTitle="Assigned Targets"
              targets={targets}
              onTargetsChange={handleTargetsChange}
            />
          </section>

          <aside className="form-surface admin-form offer-preview-panel">
            <div className="form-block">
              <h2>Current Targets</h2>
              <div className="offer-preview-card">
                <span className="currency-code-chip">{offer.type.replaceAll("_", " ")}</span>
                <h2>{offer.name}</h2>
                <strong>{discountLabel ?? "Not configured"}</strong>
                <dl>
                  <div>
                    <dt>Categories</dt>
                    <dd>{targetCounts.categories}</dd>
                  </div>
                  <div>
                    <dt>Products</dt>
                    <dd>{targetCounts.products}</dd>
                  </div>
                  <div>
                    <dt>Variants</dt>
                    <dd>{targetCounts.variants}</dd>
                  </div>
                  <div>
                    <dt>Priority</dt>
                    <dd>{offer.priority}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <section className="empty-surface">
          <h2>Offer unavailable</h2>
          <p>Unable to load this offer.</p>
        </section>
      )}
    </main>
  );
}

function formatTargetType(type: AdminOfferTarget["targetType"]) {
  if (type === "CATEGORY") {
    return "category";
  }

  if (type === "PRODUCT") {
    return "product";
  }

  return "variant";
}
