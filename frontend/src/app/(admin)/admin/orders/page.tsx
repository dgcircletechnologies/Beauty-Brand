"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import * as adminApi from "@/lib/api/admin";

function formatStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

function formatMoney(
  amount: number | string,
  currency: { code: string; symbol: string | null; decimalDigits: number },
) {
  return `${currency.symbol ?? currency.code}${Number(amount).toFixed(
    currency.decimalDigits,
  )}`;
}

export default function AdminOrdersPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<adminApi.AdminOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedOrder =
    orders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null;

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadOrders() {
      try {
        const nextOrders = await adminApi.getAdminOrders(token);

        if (!isMounted) {
          return;
        }

        setOrders(nextOrders);
        setSelectedOrderId((currentId) => currentId ?? nextOrders[0]?.id ?? null);
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load orders",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  return (
    <main>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>All Orders</h1>
          <p>Review customer orders and their current fulfillment state.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      {isLoading ? (
        <section className="empty-surface">
          <h2>Loading orders...</h2>
        </section>
      ) : orders.length ? (
        <section className="admin-order-layout">
          <div className="catalog-section">
            <div className="section-title">
              <h2>Orders</h2>
              <span>{orders.length}</span>
            </div>
            <div className="admin-order-list">
              {orders.map((order) => (
                <button
                  className={
                    selectedOrder?.id === order.id
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
                  <strong>
                    {formatMoney(order.displayTotalAmount, order.displayCurrency)}
                  </strong>
                </button>
              ))}
            </div>
          </div>

          {selectedOrder ? (
            <aside className="catalog-section order-admin-detail">
              <div className="section-title">
                <h2>#{selectedOrder.orderNumber}</h2>
                <span>{formatStatus(selectedOrder.status)}</span>
              </div>
              <div className="order-detail-grid">
                <div>
                  <h3>Customer</h3>
                  <p>{selectedOrder.customerEmail}</p>
                  <p>{selectedOrder.customerPhone ?? "No phone"}</p>
                </div>
                <div>
                  <h3>Totals</h3>
                  <p>
                    Subtotal:{" "}
                    {formatMoney(
                      selectedOrder.displaySubtotal,
                      selectedOrder.displayCurrency,
                    )}
                  </p>
                  <p>
                    Shipping:{" "}
                    {formatMoney(
                      selectedOrder.displayShippingAmount,
                      selectedOrder.displayCurrency,
                    )}
                  </p>
                </div>
                <div>
                  <h3>Shipment</h3>
                  <p>
                    {selectedOrder.shipments[0]
                      ? formatStatus(selectedOrder.shipments[0].status)
                      : "pending"}
                  </p>
                </div>
              </div>
              <div className="admin-data-list">
                {selectedOrder.items.map((item) => (
                  <div className="admin-data-row" key={item.id}>
                    <div>
                      <h3>{item.productName}</h3>
                      <p>
                        {item.sku} x {item.quantity}
                      </p>
                    </div>
                    <span>
                      {formatMoney(
                        item.displayLineTotal,
                        selectedOrder.displayCurrency,
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </aside>
          ) : null}
        </section>
      ) : (
        <section className="empty-surface">
          <h2>No orders yet</h2>
          <p>Confirmed customer orders will appear here.</p>
        </section>
      )}
    </main>
  );
}
