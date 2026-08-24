"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import * as adminApi from "@/lib/api/admin";

function formatMoney(
  amount: number | string,
  currency: { code: string; symbol: string | null; decimalDigits: number },
) {
  return `${currency.symbol ?? currency.code}${Number(amount).toFixed(
    currency.decimalDigits,
  )}`;
}

export default function AdminCompletedOrdersPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<adminApi.AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadOrders() {
      try {
        const nextOrders = await adminApi.getAdminOrders(token);

        if (isMounted) {
          setOrders(nextOrders.filter((order) => order.status === "DELIVERED"));
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load completed orders",
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
          <p className="eyebrow">Orders</p>
          <h1>Completed Orders</h1>
          <p>Review delivered orders without active workflow controls.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      {isLoading ? (
        <section className="empty-surface">
          <h2>Loading completed orders...</h2>
        </section>
      ) : orders.length ? (
        <section className="catalog-section">
          <div className="section-title">
            <h2>Delivered</h2>
            <span>{orders.length}</span>
          </div>
          <div className="admin-order-list">
            {orders.map((order) => (
              <div className="admin-order-row" key={order.id}>
                <span>
                  <strong>#{order.orderNumber}</strong>
                  <small>{order.customerEmail}</small>
                </span>
                <span>{order.items.length} items</span>
                <strong>
                  {formatMoney(order.displayTotalAmount, order.displayCurrency)}
                </strong>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="empty-surface">
          <h2>No completed orders</h2>
          <p>Delivered orders will appear here.</p>
        </section>
      )}
    </main>
  );
}
