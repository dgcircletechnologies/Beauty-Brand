"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";

import {
  OrderDetailModal,
  formatStatus,
  getProductNames,
} from "@/components/admin/admin-order-workspace";
import { useAuth } from "@/contexts/auth-context";
import * as adminApi from "@/lib/api/admin";

type CancellationRequestRow = {
  order: adminApi.AdminOrder;
  request: adminApi.AdminOrder["cancellationRequests"][number];
};

const pageSize = 8;

export default function AdminCancellationRequestsPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<adminApi.AdminOrder[]>([]);
  const [view, setView] = useState<"pending" | "history">("pending");
  const [pendingPage, setPendingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedOrder, setSelectedOrder] =
    useState<adminApi.AdminOrder | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
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
  const pendingRequests = useMemo(
    () => requests.filter(({ request }) => request.status === "PENDING"),
    [requests],
  );
  const historyRequests = useMemo(
    () => requests.filter(({ request }) => request.status !== "PENDING"),
    [requests],
  );

  const loadOrders = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

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
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadInitialOrders() {
      setIsLoading(true);
      setError(null);

      try {
        const nextOrders = await adminApi.getAdminOrders(token);

        if (isMounted) {
          setOrders(nextOrders);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load cancellation requests",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialOrders();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const decideRequest = useCallback(
    async (requestId: string, status: "APPROVED" | "REJECTED") => {
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
        setSelectedOrder(null);
        setSelectedRequestId(null);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update cancellation request",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, loadOrders],
  );

  const selectedRequest = selectedOrder
    ? selectedOrder.cancellationRequests.find(
        (request) => request.id === selectedRequestId,
      ) ?? null
    : null;
  const openRequest = useCallback(
    (order: adminApi.AdminOrder, requestId: string) => {
      setSelectedOrder(order);
      setSelectedRequestId(requestId);
    },
    [],
  );
  const closeRequest = useCallback(() => {
    setSelectedOrder(null);
    setSelectedRequestId(null);
  }, []);

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Orders</p>
          <h1>Cancellation Requests</h1>
          <p>Approve pending cancellations and review request decisions.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <section className="catalog-section">
        <div className="admin-tabs">
          <button
            className={view === "pending" ? "active" : undefined}
            type="button"
            onClick={() => setView("pending")}
          >
            Pending Cancellation
          </button>
          <button
            className={view === "history" ? "active" : undefined}
            type="button"
            onClick={() => setView("history")}
          >
            History
          </button>
        </div>

        {isLoading ? (
          <section className="empty-surface">
            <h2>Loading cancellation requests...</h2>
          </section>
        ) : view === "pending" ? (
          <CancellationRequestList
            currentPage={pendingPage}
            requests={pendingRequests}
            title="Pending Cancellation"
            onOpen={openRequest}
            onPageChange={setPendingPage}
          />
        ) : (
          <CancellationRequestList
            currentPage={historyPage}
            requests={historyRequests}
            title="History"
            onOpen={openRequest}
            onPageChange={setHistoryPage}
          />
        )}
      </section>

      {selectedOrder ? (
        <OrderDetailModal
          order={selectedOrder}
          showStatusHistory
          onClose={closeRequest}
        >
          {selectedRequest ? (
            <div className="cancellation-detail-actions">
              <h3>Cancellation Request</h3>
              <p>{selectedRequest.reason}</p>
              {selectedRequest.details ? <p>{selectedRequest.details}</p> : null}
              <small>{formatStatus(selectedRequest.status)}</small>
              {selectedRequest.status === "PENDING" ? (
                <div className="form-actions">
                  <button
                    className="primary-button compact-button"
                    disabled={isSubmitting}
                    type="button"
                    onClick={() =>
                      void decideRequest(selectedRequest.id, "APPROVED")
                    }
                  >
                    Approve
                  </button>
                  <button
                    className="secondary-button compact-button"
                    disabled={isSubmitting}
                    type="button"
                    onClick={() =>
                      void decideRequest(selectedRequest.id, "REJECTED")
                    }
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </OrderDetailModal>
      ) : null}
    </main>
  );
}

type CancellationRequestListProps = {
  currentPage: number;
  requests: CancellationRequestRow[];
  title: string;
  onOpen: (order: adminApi.AdminOrder, requestId: string) => void;
  onPageChange: (page: number) => void;
};

const CancellationRequestList = memo(function CancellationRequestList({
  currentPage,
  requests,
  title,
  onOpen,
  onPageChange,
}: CancellationRequestListProps) {
  const totalPages = Math.max(1, Math.ceil(requests.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visibleRequests = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;

    return requests.slice(startIndex, startIndex + pageSize);
  }, [requests, safePage]);
  const previousPage = useCallback(() => {
    onPageChange(Math.max(safePage - 1, 1));
  }, [onPageChange, safePage]);
  const nextPage = useCallback(() => {
    onPageChange(safePage + 1);
  }, [onPageChange, safePage]);

  return (
    <>
      <div className="section-title">
        <h2>{title}</h2>
        <span>{requests.length}</span>
      </div>
      <div className="admin-data-list">
        {visibleRequests.map(({ order, request }) => (
          <button
            className="cancellation-row clickable"
            key={request.id}
            type="button"
            onClick={() => onOpen(order, request.id)}
          >
            <span>
              <strong>#{order.orderNumber}</strong>
              <small>{getProductNames(order)}</small>
              <small>
                {request.reason} - {formatStatus(request.status)}
              </small>
            </span>
            <span>{order.customerEmail}</span>
          </button>
        ))}
      </div>
      {requests.length === 0 ? (
        <p className="muted-text">No cancellation requests in this section.</p>
      ) : null}
      <div className="pagination-actions">
        <button
          className="secondary-button compact-button"
          disabled={safePage <= 1}
          type="button"
          onClick={previousPage}
        >
          Previous
        </button>
        <span>
          Page {safePage} of {totalPages}
        </span>
        <button
          className="secondary-button compact-button"
          disabled={safePage >= totalPages}
          type="button"
          onClick={nextPage}
        >
          Next
        </button>
      </div>
    </>
  );
});
