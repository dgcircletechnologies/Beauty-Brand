"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { AdminOrderWorkspace } from "@/components/admin/admin-order-workspace";
import { useAuth } from "@/contexts/auth-context";
import * as adminApi from "@/lib/api/admin";

export default function AdminOrdersPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<adminApi.AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          : "Unable to load orders",
      );
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOrders();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadOrders]);

  const cancelOrder = useCallback(
    async (
      event: FormEvent<HTMLFormElement>,
      orderId: string,
      close: () => void,
    ) => {
      event.preventDefault();

      if (!accessToken) {
        return;
      }

      const formData = new FormData(event.currentTarget);

      setIsSubmitting(true);
      setError(null);

      try {
        await adminApi.updateAdminOrderStatus(accessToken, orderId, {
          status: "CANCELLED",
          reason: String(formData.get("reason") || "Order cancelled by admin"),
        });
        close();
        await loadOrders();
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to cancel order",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, loadOrders],
  );

  const deleteOrder = useCallback(
    async (orderId: string, close: () => void) => {
      if (!accessToken) {
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await adminApi.deleteAdminOrder(accessToken, orderId);
        close();
        await loadOrders();
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to delete order",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, loadOrders],
  );

  return (
    <main className="admin-page analytics-page orders-admin-page">
      <section className="dashboard-header analytics-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>All Orders</h1>
          <p>Review customer orders and their current fulfillment state.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <AdminOrderWorkspace
        emptyText="Confirmed customer orders will appear here."
        emptyTitle="No orders yet"
        isLoading={isLoading}
        orders={orders}
        renderActions={(order, { close }) =>
          ["PENDING_PAYMENT", "PAYMENT_FAILED"].includes(order.status) ? (
            <div className="cancellation-detail-actions">
              <form
                className="admin-form"
                onSubmit={(event) => void cancelOrder(event, order.id, close)}
              >
                <label>
                  <span>Cancel reason</span>
                  <input name="reason" placeholder="Payment not completed" />
                </label>
                <button
                  className="secondary-button compact-button"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "Cancelling..." : "Cancel and Restock"}
                </button>
              </form>
              <button
                className="secondary-button compact-button"
                disabled={isSubmitting}
                type="button"
                onClick={() => void deleteOrder(order.id, close)}
              >
                {isSubmitting ? "Deleting..." : "Delete Unpaid Order"}
              </button>
            </div>
          ) : null
        }
        showStatusHistory
        title="Orders"
      />
    </main>
  );
}
