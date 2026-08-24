"use client";

import { FormEvent, useEffect, useState } from "react";

import { UserShell } from "@/components/customer/user-shell";
import { useAuth } from "@/contexts/auth-context";
import { useCurrency } from "@/contexts/currency-context";
import * as customerApi from "@/lib/api/customer";

function formatStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

export default function OrdersPage() {
  const { accessToken } = useAuth();
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<customerApi.CustomerOrder[]>([]);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadOrders() {
    if (!accessToken) {
      return;
    }

    try {
      setOrders(await customerApi.getOrders(accessToken));
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

  async function handleCancellationRequest(
    event: FormEvent<HTMLFormElement>,
    orderId: string,
  ) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await customerApi.requestOrderCancellation(accessToken, orderId, {
        reason: String(formData.get("reason")),
        details: String(formData.get("details") || ""),
      });
      setSuccess("Cancellation request sent.");
      setCancellingOrderId(null);
      await loadOrders();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to request cancellation",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <UserShell>
      <main className="customer-page">
        <section className="dashboard-header">
          <div>
            <p className="eyebrow">Orders</p>
            <h1>Your orders</h1>
            <p>Track status history, shipments, and cancellation requests.</p>
          </div>
        </section>

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        {isLoading ? (
          <section className="empty-surface">
            <h2>Loading orders...</h2>
          </section>
        ) : orders.length ? (
          <section className="order-list">
            {orders.map((order) => {
              const pendingCancellation = order.cancellationRequests.find(
                (request) => request.status === "PENDING",
              );
              const canRequestCancellation = ![
                "CANCELLED",
                "DELIVERED",
                "SHIPPED",
                "CANCELLATION_REQUESTED",
              ].includes(order.status);

              return (
                <article className="order-card" key={order.id}>
                  <div className="order-card-header">
                    <span>
                      <p className="eyebrow">#{order.orderNumber}</p>
                      <h2>{formatStatus(order.status)}</h2>
                    </span>
                    <strong>{formatPrice(order.baseTotalAmount)}</strong>
                  </div>

                  <div className="order-detail-grid">
                    <div>
                      <h3>Items</h3>
                      {order.items.map((item) => (
                        <p key={item.id}>
                          {item.productName} x {item.quantity} -{" "}
                          {formatPrice(item.baseLineTotal)}
                        </p>
                      ))}
                    </div>
                    <div>
                      <h3>Shipment</h3>
                      {order.shipments[0] ? (
                        <p>
                          {formatStatus(order.shipments[0].status)}
                          {order.shipments[0].trackingNumber
                            ? ` - ${order.shipments[0].trackingNumber}`
                            : ""}
                        </p>
                      ) : (
                        <p>Pending shipment</p>
                      )}
                    </div>
                    <div>
                      <h3>Status history</h3>
                      {order.statusHistory.map((history) => (
                        <p key={history.id}>
                          {formatStatus(history.toStatus)}
                          {history.reason ? ` - ${history.reason}` : ""}
                        </p>
                      ))}
                    </div>
                  </div>

                  {pendingCancellation ? (
                    <p className="form-success">
                      Cancellation request pending: {pendingCancellation.reason}
                    </p>
                  ) : null}

                  {canRequestCancellation ? (
                    cancellingOrderId === order.id ? (
                      <form
                        className="inline-order-form"
                        onSubmit={(event) =>
                          void handleCancellationRequest(event, order.id)
                        }
                      >
                        <input
                          name="reason"
                          placeholder="Cancellation reason"
                          required
                        />
                        <input name="details" placeholder="Details optional" />
                        <button
                          className="primary-button compact-button"
                          disabled={isSubmitting}
                          type="submit"
                        >
                          Submit
                        </button>
                      </form>
                    ) : (
                      <button
                        className="secondary-button compact-button"
                        type="button"
                        onClick={() => setCancellingOrderId(order.id)}
                      >
                        Request Cancellation
                      </button>
                    )
                  ) : null}
                </article>
              );
            })}
          </section>
        ) : (
          <section className="empty-surface">
            <h2>No orders yet</h2>
            <p>Your confirmed orders will appear here.</p>
          </section>
        )}
      </main>
    </UserShell>
  );
}
