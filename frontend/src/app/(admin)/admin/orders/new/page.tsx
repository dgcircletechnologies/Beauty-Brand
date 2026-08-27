"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  AdminOrderWorkspace,
  formatStatus,
} from "@/components/admin/admin-order-workspace";
import { useAuth } from "@/contexts/auth-context";
import * as adminApi from "@/lib/api/admin";

export default function AdminNewOrdersPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<adminApi.AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
          : "Unable to load new orders",
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
              : "Unable to load new orders",
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

  const newOrders = useMemo(
    () => orders.filter((order) => order.status === "PAID"),
    [orders],
  );

  const moveOrder = useCallback(
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
      setSuccess(null);

      try {
        await adminApi.updateAdminOrderStatus(accessToken, orderId, {
          status: String(formData.get("status")),
          reason: String(formData.get("reason") || "New order accepted"),
        });
        setSuccess("New order moved.");
        await loadOrders();
        close();
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to move order",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, loadOrders],
  );

  const renderNewOrderActions = useCallback(
    (order: adminApi.AdminOrder, { close }: { close: () => void }) => (
      <form
        className="admin-form compact-admin-form"
        onSubmit={(event) => void moveOrder(event, order.id, close)}
      >
        <label>
          Move to
          <select name="status" defaultValue="PROCESSING">
            {["PROCESSING", "SHIPPED", "CANCELLED"].map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reason
          <input name="reason" placeholder="Reason optional" />
        </label>
        <button
          className="primary-button"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Moving..." : "Move Order"}
        </button>
      </form>
    ),
    [isSubmitting, moveOrder],
  );

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Orders</p>
          <h1>New Orders</h1>
          <p>Review paid orders before they enter processing.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <AdminOrderWorkspace
        emptyText="Paid orders will appear here until their status changes."
        emptyTitle="No new orders"
        isLoading={isLoading}
        orders={newOrders}
        renderActions={renderNewOrderActions}
        title="New Orders"
      />
    </main>
  );
}
