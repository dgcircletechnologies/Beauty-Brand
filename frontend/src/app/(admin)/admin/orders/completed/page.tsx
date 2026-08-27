"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminOrderWorkspace } from "@/components/admin/admin-order-workspace";
import { useAuth } from "@/contexts/auth-context";
import * as adminApi from "@/lib/api/admin";

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

  const completedOrders = useMemo(
    () => orders.filter((order) => order.status === "DELIVERED"),
    [orders],
  );

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

      <AdminOrderWorkspace
        emptyText="Delivered orders will appear here."
        emptyTitle="No completed orders"
        isLoading={isLoading}
        orders={completedOrders}
        title="Delivered Orders"
      />
    </main>
  );
}
