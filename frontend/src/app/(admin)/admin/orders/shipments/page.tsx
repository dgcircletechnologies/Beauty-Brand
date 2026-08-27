"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  AdminOrderWorkspace,
  formatStatus,
  getLatestShipment,
} from "@/components/admin/admin-order-workspace";
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

const closedShipmentStatuses = ["DELIVERED", "RETURNED", "CANCELLED"];
const shippableOrderStatuses = [
  "PAID",
  "PROCESSING",
  "CANCELLATION_REQUESTED",
  "SHIPPED",
];

export default function AdminOrderShipmentsPage() {
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
          : "Unable to load shipments",
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
              : "Unable to load shipments",
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

  const shippableOrders = useMemo(
    () =>
      orders.filter((order) => {
        const shipment = getLatestShipment(order);

        return (
          shippableOrderStatuses.includes(order.status) &&
          (!shipment || !closedShipmentStatuses.includes(shipment.status))
        );
      }),
    [orders],
  );

  const updateShipment = useCallback(
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
      const estimatedDeliveryAt = String(
        formData.get("estimatedDeliveryAt") || "",
      );

      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        await adminApi.updateAdminShipment(accessToken, orderId, {
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
        close();
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update shipment",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, loadOrders],
  );

  const renderShipmentActions = useCallback(
    (order: adminApi.AdminOrder, { close }: { close: () => void }) => {
      const shipment = getLatestShipment(order);

      return (
        <form
          className="admin-form compact-admin-form"
          key={shipment?.id ?? order.id}
          onSubmit={(event) => void updateShipment(event, order.id, close)}
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
            {isSubmitting ? "Updating..." : "Update Shipment"}
          </button>
        </form>
      );
    },
    [isSubmitting, updateShipment],
  );

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

      <AdminOrderWorkspace
        emptyText="No orders need shipment updates."
        emptyTitle="No shipment work"
        isLoading={isLoading}
        orders={shippableOrders}
        renderActions={renderShipmentActions}
        title="Open Shipments"
      />
    </main>
  );
}
