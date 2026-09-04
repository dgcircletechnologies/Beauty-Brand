"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { UserShell } from "@/components/customer/user-shell";
import { useAuth } from "@/contexts/auth-context";
import * as customerApi from "@/lib/api/customer";

const pageSize = 10;
const repayableStatuses = ["PENDING_PAYMENT", "PAYMENT_FAILED"] as const;

type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    email: string;
    contact?: string;
  };
  notes: {
    localOrderId: string;
    orderNumber: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpayCheckoutResponse) => void;
  modal: {
    ondismiss: () => void;
  };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
      on: (
        event: "payment.failed",
        handler: (response: { error?: { description?: string } }) => void,
      ) => void;
    };
  }
}

function loadRazorpayCheckout() {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Unable to load Razorpay checkout")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout"));
    document.body.appendChild(script);
  });
}

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

function formatOrderMoney(
  amount: number | string,
  currency: customerApi.CustomerOrder["displayCurrency"],
) {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return `${currency.symbol ?? currency.code}0`;
  }

  return `${currency.symbol ?? currency.code}${value.toFixed(
    currency.decimalDigits,
  )}`;
}

export default function OrdersPage() {
  const { accessToken } = useAuth();
  const [response, setResponse] =
    useState<customerApi.CustomerOrdersResponse | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
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

  async function handleRepay(order: customerApi.CustomerOrder) {
    if (!accessToken) {
      return;
    }

    setPayingOrderId(order.id);
    setError(null);

    try {
      await loadRazorpayCheckout();

      if (!window.Razorpay) {
        throw new Error("Unable to load Razorpay checkout");
      }

      const razorpayOrder = await customerApi.retryRazorpayPayment(
        accessToken,
        order.id,
      );
      const checkout = new window.Razorpay({
        key: razorpayOrder.keyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "BlueWave Skincare",
        description: `Order ${razorpayOrder.orderNumber}`,
        order_id: razorpayOrder.razorpayOrderId,
        prefill: {
          email: razorpayOrder.customerEmail,
          contact: razorpayOrder.customerPhone ?? order.customerPhone ?? undefined,
        },
        notes: {
          localOrderId: razorpayOrder.localOrderId,
          orderNumber: razorpayOrder.orderNumber,
        },
        theme: {
          color: "#1868db",
        },
        handler: (response) => {
          void verifyRetryPayment(razorpayOrder.localOrderId, response);
        },
        modal: {
          ondismiss: () => {
            setPayingOrderId(null);
          },
        },
      });

      checkout.on("payment.failed", (response) => {
        setError(response.error?.description ?? "Razorpay payment failed");
        setPayingOrderId(null);
      });
      checkout.open();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to restart Razorpay payment",
      );
      setPayingOrderId(null);
    }
  }

  async function verifyRetryPayment(
    localOrderId: string,
    response: RazorpayCheckoutResponse,
  ) {
    if (!accessToken) {
      setPayingOrderId(null);
      return;
    }

    try {
      await customerApi.verifyRazorpayPayment(accessToken, {
        localOrderId,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
      await loadOrders();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to verify Razorpay payment",
      );
    } finally {
      setPayingOrderId(null);
    }
  }

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
                    <div className="order-detail-actions">
                      {repayableStatuses.includes(
                        order.status as (typeof repayableStatuses)[number],
                      ) ? (
                        <button
                          className="primary-button compact-button"
                          disabled={payingOrderId === order.id}
                          type="button"
                          onClick={() => void handleRepay(order)}
                        >
                          {payingOrderId === order.id
                            ? "Opening Razorpay..."
                            : "Pay Now"}
                        </button>
                      ) : null}
                      <Link href={`/orders/${order.id}`}>
                        Order details <span aria-hidden="true">-&gt;</span>
                      </Link>
                    </div>
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
                          <strong>
                            {formatOrderMoney(
                              item.displayLineTotal,
                              order.displayCurrency,
                            )}
                          </strong>
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
