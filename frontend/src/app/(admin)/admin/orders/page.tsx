"use client";

import { useEffect, useState } from "react";

import { AdminOrderWorkspace } from "@/components/admin/admin-order-workspace";
import { useAuth } from "@/contexts/auth-context";
import * as adminApi from "@/lib/api/admin";

export default function AdminOrdersPage() {
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

      <AdminOrderWorkspace
        analytics
        emptyText="Confirmed customer orders will appear here."
        emptyTitle="No orders yet"
        isLoading={isLoading}
        orders={orders}
        showStatusHistory
        title="Orders"
      />
    </main>
  );
}
