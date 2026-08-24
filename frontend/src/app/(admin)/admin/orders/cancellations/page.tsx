"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import * as adminApi from "@/lib/api/admin";

function formatStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

export default function AdminCancellationRequestsPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<adminApi.AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const requests = useMemo(
    () =>
      orders.flatMap((order) =>
        order.cancellationRequests.map((request) => ({
          order,
          request,
        })),
      ),
    [orders],
  );

  async function loadOrders() {
    if (!accessToken) {
      return;
    }

    try {
      setOrders(await adminApi.getAdminOrders(accessToken));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load cancellation requests",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, [accessToken]);

  async function decideRequest(
    requestId: string,
    status: "APPROVED" | "REJECTED",
  ) {
    if (!accessToken) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.decideAdminCancellationRequest(accessToken, requestId, {
        status,
        decisionNote:
          status === "APPROVED" ? "Approved by admin" : "Rejected by admin",
      });
      setSuccess(`Cancellation ${status.toLowerCase()}.`);
      await loadOrders();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update cancellation request",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Orders</p>
          <h1>Cancellation Requests</h1>
          <p>Approve or reject customer cancellation requests.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      {isLoading ? (
        <section className="empty-surface">
          <h2>Loading cancellation requests...</h2>
        </section>
      ) : requests.length ? (
        <section className="catalog-section">
          <div className="section-title">
            <h2>Requests</h2>
            <span>{requests.length}</span>
          </div>
          <div className="admin-data-list">
            {requests.map(({ order, request }) => (
              <div className="cancellation-row" key={request.id}>
                <span>
                  <strong>#{order.orderNumber}</strong>
                  <small>
                    {request.reason} - {formatStatus(request.status)}
                  </small>
                </span>
                {request.status === "PENDING" ? (
                  <div className="form-actions">
                    <button
                      className="primary-button compact-button"
                      disabled={isSubmitting}
                      type="button"
                      onClick={() => void decideRequest(request.id, "APPROVED")}
                    >
                      Approve
                    </button>
                    <button
                      className="secondary-button compact-button"
                      disabled={isSubmitting}
                      type="button"
                      onClick={() => void decideRequest(request.id, "REJECTED")}
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="empty-surface">
          <h2>No cancellation requests</h2>
          <p>Customer requests will appear here.</p>
        </section>
      )}
    </main>
  );
}
