"use client";

import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import * as adminApi from "@/lib/api/admin";

const orderStatuses = [
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "PAYMENT_FAILED",
];

function formatStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

export default function AdminOrderStatusPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<adminApi.AdminOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId);

  async function loadOrders() {
    if (!accessToken) {
      return;
    }

    try {
      const nextOrders = await adminApi.getAdminOrders(accessToken);
      const openOrders = nextOrders.filter(
        (order) => !["DELIVERED", "CANCELLED"].includes(order.status),
      );

      setOrders(openOrders);
      setSelectedOrderId((currentId) => currentId || openOrders[0]?.id || "");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load orders",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, [accessToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken || !selectedOrderId) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.updateAdminOrderStatus(accessToken, selectedOrderId, {
        status: String(formData.get("status")),
        reason: String(formData.get("reason") || ""),
      });
      setSuccess("Order status updated.");
      await loadOrders();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update order status",
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
          <h1>Status Updates</h1>
          <p>Move active orders through fulfillment states.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      {isLoading ? (
        <section className="empty-surface">
          <h2>Loading orders...</h2>
        </section>
      ) : (
        <section className="admin-order-layout">
          <div className="catalog-section">
            <div className="section-title">
              <h2>Active Orders</h2>
              <span>{orders.length}</span>
            </div>
            <div className="admin-order-list">
              {orders.map((order) => (
                <button
                  className={
                    selectedOrderId === order.id
                      ? "admin-order-row active"
                      : "admin-order-row"
                  }
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedOrderId(order.id)}
                >
                  <span>
                    <strong>#{order.orderNumber}</strong>
                    <small>{order.customerEmail}</small>
                  </span>
                  <span>{formatStatus(order.status)}</span>
                </button>
              ))}
            </div>
          </div>

          <aside className="catalog-section order-admin-detail">
            <div className="section-title">
              <h2>{selectedOrder ? `#${selectedOrder.orderNumber}` : "Order"}</h2>
              <span>{selectedOrder ? formatStatus(selectedOrder.status) : "none"}</span>
            </div>
            {selectedOrder ? (
              <form className="admin-form" onSubmit={handleSubmit}>
                <label>
                  Next status
                  <select name="status" defaultValue={selectedOrder.status}>
                    {orderStatuses.map((status) => (
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
                  Update Status
                </button>
              </form>
            ) : (
              <p>No active orders need status updates.</p>
            )}
          </aside>
        </section>
      )}
    </main>
  );
}
