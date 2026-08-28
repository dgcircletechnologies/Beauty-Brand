"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { UserShell } from "@/components/customer/user-shell";
import { useAuth } from "@/contexts/auth-context";
import { useCurrency } from "@/contexts/currency-context";
import * as customerApi from "@/lib/api/customer";

const pageSize = 10;

function formatStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

function formatDate(value: string | null) {
  if (!value) {
    return "Date pending";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function OrdersPage() {
  const { accessToken } = useAuth();
  const { formatPrice } = useCurrency();
  const [response, setResponse] =
    useState<customerApi.CustomerOrdersResponse | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orders = response?.items ?? [];
  const pagination = response?.pagination;

  const loadOrders = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);

    try {
      const nextResponse = await customerApi.getOrders(accessToken, {
        page,
        pageSize,
      });
      setResponse(nextResponse);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load orders",
      );
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, page]);

  useEffect(() => {
    void Promise.resolve().then(loadOrders);
  }, [loadOrders]);

  return (
    <UserShell>
      <main className="customer-page orders-template-page">
        <section className="dashboard-header orders-template-header">
          <div>
            <p className="eyebrow">Orders</p>
            <h1>
              Your <em>Orders</em>
            </h1>
            <p>Check recent orders and open a full order timeline.</p>
          </div>
        </section>

        {error ? <p className="form-error">{error}</p> : null}

        {isLoading ? (
          <section className="empty-surface">
            <h2>Loading orders...</h2>
          </section>
        ) : orders.length ? (
          <>
            <div className="orders-template-stack">
              {orders.map((order) => (
                <section
                  aria-labelledby={`${order.id}-heading`}
                  className="customer-order-section"
                  key={order.id}
                >
                  <div className="customer-order-heading">
                    <div>
                      <h2 id={`${order.id}-heading`}>
                        Order #{order.orderNumber}
                      </h2>
                      <p>
                        {formatDate(order.placedAt ?? order.createdAt)} -{" "}
                        {formatStatus(order.status)}
                      </p>
                    </div>
                    <Link href={`/orders/${order.id}`}>
                      Order details <span aria-hidden="true">-&gt;</span>
                    </Link>
                  </div>

                  <div className="customer-order-products">
                    {order.items.map((item) => (
                      <article className="customer-order-item" key={item.id}>
                        <div className="customer-order-item-visual">
                          {item.image ? (
                            <img
                              alt={item.image.altText ?? item.productName}
                              src={item.image.url}
                            />
                          ) : (
                            <span>{item.productName.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <h3>{item.productName}</h3>
                          <p>
                            {item.variantLabel ?? item.sku} - Qty {item.quantity}
                          </p>
                          <strong>{formatPrice(item.displayLineTotal)}</strong>
                        </div>
                        <div className="customer-order-item-actions">
                          <Link href="/shop">Shop similar</Link>
                          <Link href="/shop">Buy again</Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {pagination && pagination.totalPages > 1 ? (
              <nav className="shop-pagination" aria-label="Orders pagination">
                <button
                  disabled={!pagination.hasPreviousPage}
                  type="button"
                  onClick={() => setPage(pagination.page - 1)}
                >
                  Previous
                </button>
                {Array.from({ length: pagination.totalPages }, (_, index) => (
                  <button
                    className={pagination.page === index + 1 ? "active" : undefined}
                    key={index + 1}
                    type="button"
                    onClick={() => setPage(index + 1)}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  disabled={!pagination.hasNextPage}
                  type="button"
                  onClick={() => setPage(pagination.page + 1)}
                >
                  Next
                </button>
              </nav>
            ) : null}
          </>
        ) : (
          <section className="empty-surface">
            <h2>No orders yet</h2>
            <p>Your confirmed orders will appear here.</p>
            <Link className="primary-link-button compact-button" href="/shop">
              Start Shopping
            </Link>
          </section>
        )}
      </main>
    </UserShell>
  );
}
