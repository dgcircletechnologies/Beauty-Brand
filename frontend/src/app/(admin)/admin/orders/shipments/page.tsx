"use client";

import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import * as adminApi from "@/lib/api/admin";

const shipmentStatuses = [
  "PENDING",
  "LABEL_CREATED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "RETURNED",
  "CANCELLED",
];

function formatStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

export default function AdminOrderShipmentsPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<adminApi.AdminOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId);
  const shipment = selectedOrder?.shipments[0];

  async function loadOrders() {
    if (!accessToken) {
      return;
    }

    try {
      const nextOrders = await adminApi.getAdminOrders(accessToken);
      const shippableOrders = nextOrders.filter(
        (order) => !["DELIVERED", "CANCELLED"].includes(order.status),
      );

      setOrders(shippableOrders);
      setSelectedOrderId((currentId) => currentId || shippableOrders[0]?.id || "");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load shipments",
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
    const estimatedDeliveryAt = String(
      formData.get("estimatedDeliveryAt") || "",
    );

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.updateAdminShipment(accessToken, selectedOrderId, {
        status: String(formData.get("status")),
        carrier: String(formData.get("carrier") || ""),
        service: String(formData.get("service") || ""),
        trackingNumber: String(formData.get("trackingNumber") || ""),
        trackingUrl: String(formData.get("trackingUrl") || ""),
        ...(estimatedDeliveryAt && {
          estimatedDeliveryAt,
        }),
      });
      setSuccess("Shipment updated.");
      await loadOrders();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update shipment",
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
          <h1>Shipments</h1>
          <p>Maintain carriers, tracking numbers, and shipment state.</p>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      {isLoading ? (
        <section className="empty-surface">
          <h2>Loading shipments...</h2>
        </section>
      ) : (
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
                  <span>
                    {order.shipments[0]
                      ? formatStatus(order.shipments[0].status)
                      : "pending"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <aside className="catalog-section order-admin-detail">
            <div className="section-title">
              <h2>{selectedOrder ? `#${selectedOrder.orderNumber}` : "Shipment"}</h2>
              <span>{shipment ? formatStatus(shipment.status) : "pending"}</span>
            </div>
            {selectedOrder ? (
              <form
                className="admin-form"
                key={shipment?.id ?? selectedOrder.id}
                onSubmit={handleSubmit}
              >
                <label>
                  Shipment status
                  <select name="status" defaultValue={shipment?.status ?? "PENDING"}>
                    {shipmentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="split-fields">
                  <label>
                    Carrier
                    <input name="carrier" defaultValue={shipment?.carrier ?? ""} />
                  </label>
                  <label>
                    Service
                    <input name="service" defaultValue={shipment?.service ?? ""} />
                  </label>
                </div>
                <label>
                  Tracking number
                  <input
                    name="trackingNumber"
                    defaultValue={shipment?.trackingNumber ?? ""}
                  />
                </label>
                <label>
                  Tracking URL
                  <input name="trackingUrl" defaultValue={shipment?.trackingUrl ?? ""} />
                </label>
                <label>
                  Estimated delivery
                  <input name="estimatedDeliveryAt" type="datetime-local" />
                </label>
                <button
                  className="primary-button"
                  disabled={isSubmitting}
                  type="submit"
                >
                  Update Shipment
                </button>
              </form>
            ) : (
              <p>No orders need shipment updates.</p>
            )}
          </aside>
        </section>
      )}
    </main>
  );
}
