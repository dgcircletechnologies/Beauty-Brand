"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { UserShell } from "@/components/customer/user-shell";
import { useAuth } from "@/contexts/auth-context";
import { useCurrency } from "@/contexts/currency-context";
import * as customerApi from "@/lib/api/customer";

const fulfillmentSteps = [
  "Order placed",
  "Processing",
  "Shipped",
  "Delivered",
] as const;
const cancellableStatuses = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
] as const;
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

function formatDateTime(value: string | null) {
  if (!value) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getOrderStep(status: string) {
  if (status === "DELIVERED") {
    return 4;
  }

  if (status === "SHIPPED") {
    return 3;
  }

  if (["PROCESSING", "CANCELLATION_REQUESTED"].includes(status)) {
    return 2;
  }

  if (["PAID", "PENDING_PAYMENT", "PAYMENT_FAILED"].includes(status)) {
    return 1;
  }

  return 0;
}

function getAddress(
  order: customerApi.CustomerOrder,
  type: "SHIPPING" | "BILLING",
) {
  return order.addresses.find((address) => address.type === type) ?? null;
}

function AddressBlock({
  address,
  title,
}: {
  address: customerApi.CustomerOrder["addresses"][number] | null;
  title: string;
}) {
  return (
    <section className="order-info-panel">
      <h2>{title}</h2>
      {address ? (
        <address>
          <span>
            {address.firstName} {address.lastName}
          </span>
          <span>{address.line1}</span>
          {address.line2 ? <span>{address.line2}</span> : null}
          <span>
            {address.city}
            {address.stateOrProvince ? `, ${address.stateOrProvince}` : ""}{" "}
            {address.postalCode}
          </span>
          <span>{address.countryCode}</span>
          {address.phone ? <span>{address.phone}</span> : null}
        </address>
      ) : (
        <p>No address available.</p>
      )}
    </section>
  );
}

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const { accessToken } = useAuth();
  const { formatPrice } = useCurrency();
  const [order, setOrder] = useState<customerApi.CustomerOrder | null>(null);
  const [isCancellationOpen, setIsCancellationOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!accessToken || !params.orderId) {
      return;
    }

    setIsLoading(true);

    try {
      const nextOrder = await customerApi.getOrder(accessToken, params.orderId);

      setOrder(nextOrder);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load order",
      );
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, params.orderId]);

  useEffect(() => {
    void Promise.resolve().then(loadOrder);
  }, [loadOrder]);

  async function handleCancellationRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken || !order) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await customerApi.requestOrderCancellation(accessToken, order.id, {
        reason: String(formData.get("reason")),
        details: String(formData.get("details") || ""),
      });
      setSuccess("Cancellation request sent.");
      setIsCancellationOpen(false);
      await loadOrder();
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

  async function handleRepay() {
    if (!accessToken || !order) {
      return;
    }

    setIsPaying(true);
    setError(null);
    setSuccess(null);

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
            setIsPaying(false);
          },
        },
      });

      checkout.on("payment.failed", (response) => {
        setError(response.error?.description ?? "Razorpay payment failed");
        setIsPaying(false);
      });
      checkout.open();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to restart Razorpay payment",
      );
      setIsPaying(false);
    }
  }

  async function verifyRetryPayment(
    localOrderId: string,
    response: RazorpayCheckoutResponse,
  ) {
    if (!accessToken) {
      setError("Login again to verify payment.");
      setIsPaying(false);
      return;
    }

    try {
      const paidOrder = await customerApi.verifyRazorpayPayment(accessToken, {
        localOrderId,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });

      setOrder(paidOrder);
      setSuccess("Payment completed.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to verify Razorpay payment",
      );
    } finally {
      setIsPaying(false);
    }
  }

  const shippingAddress = useMemo(
    () => (order ? getAddress(order, "SHIPPING") : null),
    [order],
  );
  const billingAddress = useMemo(
    () => (order ? getAddress(order, "BILLING") : null),
    [order],
  );

  if (isLoading) {
    return (
      <UserShell>
        <main className="customer-page">
          <section className="empty-surface">
            <h1>Loading order...</h1>
          </section>
        </main>
      </UserShell>
    );
  }

  if (!order) {
    return (
      <UserShell>
        <main className="customer-page">
          <section className="empty-surface">
            <h1>Order not found</h1>
            {error ? <p className="form-error">{error}</p> : null}
            <Link className="secondary-link-button" href="/orders">
              Back to Orders
            </Link>
          </section>
        </main>
      </UserShell>
    );
  }

  const shipment = order.shipments[0] ?? null;
  const pendingCancellation = order.cancellationRequests.find(
    (request) => request.status === "PENDING",
  );
  const canRequestCancellation =
    cancellableStatuses.includes(
      order.status as (typeof cancellableStatuses)[number],
    ) && !pendingCancellation;
  const canRepay = repayableStatuses.includes(
    order.status as (typeof repayableStatuses)[number],
  );
  const progressStep = getOrderStep(order.status);
  const progressWidth = Math.max(8, (progressStep / fulfillmentSteps.length) * 100);

  return (
    <UserShell>
      <main className="customer-page order-detail-template-page">
        <nav className="shop-breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/orders">Orders</Link>
          <span>/</span>
          <span>#{order.orderNumber}</span>
        </nav>

        <section className="order-detail-hero">
          <div>
            <p className="eyebrow">
              {formatDateTime(order.placedAt ?? order.createdAt)}
            </p>
            <h1>
              Order <em>#{order.orderNumber}</em>
            </h1>
            <p>{formatStatus(order.status)}</p>
          </div>
          <div className="order-detail-actions">
            {canRepay ? (
              <button
                className="primary-button compact-button"
                disabled={isPaying}
                type="button"
                onClick={() => void handleRepay()}
              >
                {isPaying ? "Opening Razorpay..." : "Pay Now"}
              </button>
            ) : null}
            <Link className="secondary-link-button compact-button" href="/orders">
              Back to Orders
            </Link>
          </div>
        </section>

        {success ? <p className="form-success">{success}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}

        <section className="order-tracking-panel">
          <div className="order-tracking-heading">
            <div>
              <h2>{formatStatus(shipment?.status ?? order.status)}</h2>
              <p>
                {shipment?.trackingNumber
                  ? `Tracking ${shipment.trackingNumber}`
                  : "Tracking information will appear when your shipment moves."}
              </p>
            </div>
            {shipment?.trackingUrl ? (
              <a href={shipment.trackingUrl} rel="noreferrer" target="_blank">
                Track package
              </a>
            ) : null}
          </div>

          <div className="order-progress" aria-hidden="true">
            <i style={{ width: `${progressWidth}%` }} />
          </div>
          <div className="order-progress-labels">
            {fulfillmentSteps.map((step, index) => (
              <span
                className={index < progressStep ? "active" : undefined}
                key={step}
              >
                {step}
              </span>
            ))}
          </div>
        </section>

        <section className="order-detail-products">
          {order.items.map((item) => (
            <article className="order-detail-product" key={item.id}>
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
                <h2>{item.productName}</h2>
                <p>
                  {item.variantLabel ?? item.sku} - Qty {item.quantity}
                </p>
                <strong>{formatPrice(item.displayLineTotal)}</strong>
              </div>
              <dl>
                <div>
                  <dt>Unit price</dt>
                  <dd>{formatPrice(item.displayUnitPrice)}</dd>
                </div>
                <div>
                  <dt>SKU</dt>
                  <dd>{item.sku}</dd>
                </div>
              </dl>
            </article>
          ))}
        </section>

        <section className="order-detail-grid-template">
          <AddressBlock address={shippingAddress} title="Delivery Address" />
          <section className="order-info-panel">
            <h2>Shipping Updates</h2>
            <p>{order.customerEmail}</p>
            {order.customerPhone ? <p>{order.customerPhone}</p> : null}
            <p>{order.shippingMethodName ?? "Standard shipping"}</p>
            {shipment?.carrier ? <p>{shipment.carrier}</p> : null}
            {shipment?.estimatedDeliveryAt ? (
              <p>Expected {formatDateTime(shipment.estimatedDeliveryAt)}</p>
            ) : null}
          </section>
          <AddressBlock address={billingAddress} title="Billing Address" />
          <section className="order-info-panel">
            <h2>Order Summary</h2>
            <div className="summary-lines">
              <span>
                <small>Subtotal</small>
                <strong>{formatPrice(order.displaySubtotal)}</strong>
              </span>
              <span>
                <small>Shipping</small>
                <strong>{formatPrice(order.displayShippingAmount)}</strong>
              </span>
              <span>
                <small>Tax</small>
                <strong>{formatPrice(order.displayTaxAmount)}</strong>
              </span>
              <span>
                <small>Discount</small>
                <strong>{formatPrice(order.displayDiscountAmount)}</strong>
              </span>
              <span>
                <small>Total</small>
                <strong>{formatPrice(order.displayTotalAmount)}</strong>
              </span>
            </div>
          </section>
        </section>

        <section className="order-history-layout">
          <div className="order-info-panel">
            <h2>Status History</h2>
            <div className="order-history-list">
              {order.statusHistory.map((history) => (
                <article key={history.id}>
                  <span />
                  <div>
                    <strong>{formatStatus(history.toStatus)}</strong>
                    <p>{history.reason ?? "Status updated"}</p>
                    <small>{formatDateTime(history.createdAt)}</small>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="order-info-panel">
            <h2>Cancellation Requests</h2>
            {order.cancellationRequests.length ? (
              <div className="order-history-list">
                {order.cancellationRequests.map((request) => (
                  <article key={request.id}>
                    <span />
                    <div>
                      <strong>{formatStatus(request.status)}</strong>
                      <p>{request.reason}</p>
                      {request.details ? <p>{request.details}</p> : null}
                      {request.decisionNote ? <p>{request.decisionNote}</p> : null}
                      <small>{formatDateTime(request.requestedAt)}</small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p>No cancellation requests for this order.</p>
            )}
            {pendingCancellation ? (
              <p className="form-success">
                Pending request: {pendingCancellation.reason}
              </p>
            ) : null}
            {canRequestCancellation ? (
              isCancellationOpen ? (
                <form
                  className="order-cancellation-form"
                  onSubmit={(event) => void handleCancellationRequest(event)}
                >
                  <input name="reason" placeholder="Cancellation reason" required />
                  <textarea name="details" placeholder="Details optional" />
                  <button
                    className="primary-button compact-button"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Request"}
                  </button>
                </form>
              ) : (
                <button
                  className="secondary-button compact-button"
                  type="button"
                  onClick={() => setIsCancellationOpen(true)}
                >
                  Request Cancellation
                </button>
              )
            ) : null}
          </div>
        </section>
      </main>
    </UserShell>
  );
}
