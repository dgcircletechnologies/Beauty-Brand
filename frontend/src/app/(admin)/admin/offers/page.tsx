"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { useCurrency } from "@/contexts/currency-context";
import {
  AdminOfferListItem,
  AdminOfferListResponse,
  AdminOfferType,
  deleteAdminOffer,
  getAdminOffers,
  setAdminOfferActive,
} from "@/lib/api/admin";
import { getOfferDisplayLabel } from "@/lib/offers/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const pageSize = 10;

const typeLabels: Record<AdminOfferType, string> = {
  PERCENTAGE: "Percentage",
  FIXED_AMOUNT: "Fixed Amount",
  BUY_X_GET_Y: "Buy X Get Y",
};

type StatusFilter = "all" | "active" | "inactive";
type OfferStatus = "active" | "scheduled" | "expired" | "inactive";

export default function AdminOffersPage() {
  const { accessToken } = useAuth();
  const { formatPrice } = useCurrency();
  const [offers, setOffers] = useState<AdminOfferListItem[]>([]);
  const [pagination, setPagination] =
    useState<AdminOfferListResponse["pagination"] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<AdminOfferType | "all">("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actingOfferId, setActingOfferId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 350);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadOffers() {
      setError(null);
      setIsLoading(true);

      try {
        const response = await getAdminOffers(token, {
          page,
          limit: pageSize,
          search: debouncedSearchTerm.trim() || undefined,
          type: typeFilter === "all" ? undefined : typeFilter,
          isActive:
            statusFilter === "all" ? undefined : statusFilter === "active",
        });

        if (isMounted) {
          setOffers(response.items);
          setPagination(response.pagination);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load offers",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadOffers();

    return () => {
      isMounted = false;
    };
  }, [accessToken, debouncedSearchTerm, page, reloadKey, statusFilter, typeFilter]);

  const resetToFirstPage = useCallback(() => {
    setPage(1);
    setSuccess(null);
  }, []);

  const hasFilters =
    Boolean(debouncedSearchTerm.trim()) ||
    statusFilter !== "all" ||
    typeFilter !== "all";

  const pageSummary = useMemo(() => {
    if (!pagination) {
      return "Loading offers";
    }

    if (pagination.totalItems === 0) {
      return "No offers shown";
    }

    const start = (pagination.page - 1) * pagination.pageSize + 1;
    const end = start + offers.length - 1;

    return `${start}-${end} of ${pagination.totalItems} offers`;
  }, [offers.length, pagination]);

  const handleToggleOffer = useCallback(
    async (offer: AdminOfferListItem) => {
      if (!accessToken) {
        return;
      }

      const nextIsActive = !offer.isActive;
      const action = nextIsActive ? "Activate" : "Deactivate";
      const shouldUpdate = window.confirm(
        `${action} "${offer.name}"?\n\nCustomers will receive pricing from the backend using the updated offer status.`,
      );

      if (!shouldUpdate) {
        return;
      }

      setError(null);
      setSuccess(null);
      setActingOfferId(offer.id);

      try {
        await setAdminOfferActive(accessToken, offer.id, {
          isActive: nextIsActive,
        });
        setSuccess(`${offer.name} ${nextIsActive ? "activated" : "deactivated"}.`);
        setReloadKey((currentKey) => currentKey + 1);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : `Unable to ${nextIsActive ? "activate" : "deactivate"} offer`,
        );
      } finally {
        setActingOfferId(null);
      }
    },
    [accessToken],
  );

  const handleDeleteOffer = useCallback(
    async (offer: AdminOfferListItem) => {
      if (!accessToken) {
        return;
      }

      const shouldDelete = window.confirm(
        `Delete "${offer.name}"?\n\nThis action may be permanent. Deactivation is usually safer for everyday management.`,
      );

      if (!shouldDelete) {
        return;
      }

      setError(null);
      setSuccess(null);
      setActingOfferId(offer.id);

      try {
        await deleteAdminOffer(accessToken, offer.id);
        setSuccess(`${offer.name} deleted.`);
        setReloadKey((currentKey) => currentKey + 1);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to delete offer",
        );
      } finally {
        setActingOfferId(null);
      }
    },
    [accessToken],
  );

  return (
    <main className="offers-admin-page">
      <section className="dashboard-header offers-dashboard-header">
        <div>
          <p className="eyebrow">Offers</p>
          <h1>Offers</h1>
          <p>Create and manage promotional offers across products, variants and categories.</p>
        </div>
        <Link className="primary-button compact-button" href="/admin/offers/create">
          Create Offer
        </Link>
      </section>

      {error ? (
        <div className="analytics-error">
          <span>{error}</span>
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={() => setReloadKey((currentKey) => currentKey + 1)}
          >
            Retry
          </button>
        </div>
      ) : null}
      {success ? <p className="form-success">{success}</p> : null}

      <section className="catalog-section offers-list-panel">
        <div className="section-title">
          <div>
            <h2>Offer Management</h2>
            <span>{pageSummary}</span>
          </div>
        </div>

        <div className="admin-toolbar offers-toolbar">
          <label>
            Search
            <input
              placeholder="Search offers..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                resetToFirstPage();
              }}
            />
          </label>
          <label>
            Status
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                resetToFirstPage();
              }}
            >
              <option value="all">All</option>
              <option value="active">Enabled</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label>
            Type
            <select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value as AdminOfferType | "all");
                resetToFirstPage();
              }}
            >
              <option value="all">All Types</option>
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED_AMOUNT">Fixed Amount</option>
              <option value="BUY_X_GET_Y">Buy X Get Y</option>
            </select>
          </label>
          <button
            className="secondary-button compact-button"
            disabled={!hasFilters || isLoading}
            type="button"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setTypeFilter("all");
              resetToFirstPage();
            }}
          >
            Clear Filters
          </button>
        </div>

        {isLoading ? (
          <OfferTableSkeleton />
        ) : offers.length ? (
          <>
            <div className="analytics-table-wrap">
              <table className="analytics-table offers-table">
                <thead>
                  <tr>
                    <th>Offer</th>
                    <th>Type</th>
                    <th>Discount</th>
                    <th>Applied To</th>
                    <th>Validity</th>
                    <th title="Higher priority determines precedence when offers overlap.">Priority</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => (
                    <OfferRow
                      actingOfferId={actingOfferId}
                      formatPrice={formatPrice}
                      key={offer.id}
                      offer={offer}
                      onDelete={handleDeleteOffer}
                      onToggle={handleToggleOffer}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              disabled={isLoading}
              pagination={pagination}
              onNext={() => setPage((currentPage) => currentPage + 1)}
              onPrevious={() =>
                setPage((currentPage) => Math.max(1, currentPage - 1))
              }
            />
          </>
        ) : (
          <section className="empty-surface">
            <h2>{hasFilters ? "No matching offers" : "No offers created yet"}</h2>
            <p>
              {hasFilters
                ? "No offers match the selected filters."
                : "Create your first promotional offer for products, variants or categories."}
            </p>
            {hasFilters ? (
              <button
                className="secondary-button compact-button"
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                  resetToFirstPage();
                }}
              >
                Clear Filters
              </button>
            ) : (
              <Link className="primary-button compact-button" href="/admin/offers/create">
                Create Offer
              </Link>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

type OfferRowProps = {
  actingOfferId: string | null;
  formatPrice: (amount: number | string) => string;
  offer: AdminOfferListItem;
  onDelete: (offer: AdminOfferListItem) => void;
  onToggle: (offer: AdminOfferListItem) => void;
};

function OfferRow({
  actingOfferId,
  formatPrice,
  offer,
  onDelete,
  onToggle,
}: OfferRowProps) {
  const status = getOfferStatus(offer);
  const isActing = actingOfferId === offer.id;
  const discountLabel =
    getOfferDisplayLabel(
      {
        type: offer.type,
        value: offer.value,
        buyXGetY: offer.buyXGetYConfig
          ? {
              buyQuantity: offer.buyXGetYConfig.buyQuantity,
              getQuantity: offer.buyXGetYConfig.getQuantity,
              rewardProductId: null,
              rewardVariantId: null,
            }
          : null,
      },
      formatPrice,
    ) ?? "Not configured";

  return (
    <tr>
      <td>
        <div className="offer-name-cell">
          <strong>{offer.name}</strong>
          {offer.description ? <span>{offer.description}</span> : null}
        </div>
      </td>
      <td>
        <span className="currency-code-chip">{typeLabels[offer.type]}</span>
      </td>
      <td>{discountLabel}</td>
      <td>{getTargetSummary(offer)}</td>
      <td>{formatValidity(offer.startAt, offer.endAt)}</td>
      <td>{offer.priority}</td>
      <td>
        <span className={`status-badge status-offer-${status}`}>
          {formatOfferStatus(status)}
        </span>
      </td>
      <td>
        <div className="row-actions offer-row-actions">
          <Link className="secondary-button compact-button" href={`/admin/offers/${offer.id}`}>
            View
          </Link>
          <Link
            className="secondary-button compact-button"
            href={`/admin/offers/${offer.id}/edit`}
          >
            Edit
          </Link>
          <Link
            className="secondary-button compact-button"
            href={`/admin/offers/${offer.id}/targets`}
          >
            Manage Targets
          </Link>
          <button
            className="secondary-button compact-button"
            disabled={isActing}
            type="button"
            onClick={() => onToggle(offer)}
          >
            {offer.isActive ? "Deactivate" : "Activate"}
          </button>
          <button
            className="danger-button compact-button"
            disabled={isActing}
            type="button"
            onClick={() => onDelete(offer)}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function OfferTableSkeleton() {
  return (
    <div className="analytics-table-wrap">
      <table className="analytics-table offers-table">
        <thead>
          <tr>
            <th>Offer</th>
            <th>Type</th>
            <th>Discount</th>
            <th>Applied To</th>
            <th>Validity</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, index) => (
            <tr key={index}>
              {Array.from({ length: 8 }).map((__, cellIndex) => (
                <td key={cellIndex}>
                  <span className="offer-table-skeleton" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type PaginationControlsProps = {
  disabled: boolean;
  onNext: () => void;
  onPrevious: () => void;
  pagination: AdminOfferListResponse["pagination"] | null;
};

function PaginationControls({
  disabled,
  onNext,
  onPrevious,
  pagination,
}: PaginationControlsProps) {
  return (
    <div className="pagination-actions">
      <button
        className="secondary-button compact-button"
        disabled={disabled || !pagination?.hasPreviousPage}
        type="button"
        onClick={onPrevious}
      >
        Previous
      </button>
      <span>
        Page {pagination?.page ?? 1} of {pagination?.totalPages ?? 1}
      </span>
      <button
        className="secondary-button compact-button"
        disabled={disabled || !pagination?.hasNextPage}
        type="button"
        onClick={onNext}
      >
        Next
      </button>
    </div>
  );
}

function getOfferStatus(offer: AdminOfferListItem): OfferStatus {
  if (!offer.isActive) {
    return "inactive";
  }

  const now = Date.now();
  const startTime = offer.startAt ? new Date(offer.startAt).getTime() : null;
  const endTime = offer.endAt ? new Date(offer.endAt).getTime() : null;

  if (startTime && now < startTime) {
    return "scheduled";
  }

  if (endTime && now > endTime) {
    return "expired";
  }

  return "active";
}

function formatOfferStatus(status: OfferStatus) {
  if (status === "active") {
    return "Active";
  }

  if (status === "scheduled") {
    return "Scheduled";
  }

  if (status === "expired") {
    return "Expired";
  }

  return "Inactive";
}

function getTargetSummary(offer: AdminOfferListItem) {
  if (offer.targets?.length) {
    const counts = offer.targets.reduce(
      (summary, target) => {
        if (target.targetType === "CATEGORY") {
          summary.categories += 1;
        }

        if (target.targetType === "PRODUCT") {
          summary.products += 1;
        }

        if (target.targetType === "VARIANT") {
          summary.variants += 1;
        }

        return summary;
      },
      { categories: 0, products: 0, variants: 0 },
    );
    const parts = [
      formatTargetCount(counts.categories, "Category"),
      formatTargetCount(counts.products, "Product"),
      formatTargetCount(counts.variants, "Variant"),
    ].filter(Boolean);

    return parts.length ? parts.join(" · ") : "No targets";
  }

  return offer.targetCount === 1
    ? "1 target"
    : `${offer.targetCount ?? 0} targets`;
}

function formatTargetCount(count: number, label: string) {
  if (!count) {
    return null;
  }

  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function formatValidity(startAt: string | null, endAt: string | null) {
  if (!startAt && !endAt) {
    return "Open ended";
  }

  if (!startAt) {
    return `Until ${formatDate(endAt)}`;
  }

  if (!endAt) {
    return `From ${formatDate(startAt)}`;
  }

  return `${formatDate(startAt)} - ${formatDate(endAt)}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
