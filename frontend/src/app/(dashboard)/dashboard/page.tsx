"use client";

import { useAuth } from "@/contexts/auth-context";

export default function DashboardPage() {
  const { logout, user } = useAuth();

  return (
    <main className="dashboard-shell">
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Customer</p>
          <h1>Dashboard</h1>
          <p>Signed in as {user?.email}</p>
        </div>
        <button className="secondary-button" type="button" onClick={logout}>
          Logout
        </button>
      </section>
      <section className="empty-surface">
        <h2>Customer dashboard placeholder</h2>
        <p>Account, preferences, and order views can be added here later.</p>
      </section>
    </main>
  );
}
