import { UserShell } from "@/components/customer/user-shell";

export default function OrdersPage() {
  return (
    <UserShell>
      <main className="customer-page">
        <section className="empty-surface">
          <p className="eyebrow">Orders</p>
          <h1>Orders page</h1>
          <p>Order history will be connected here later.</p>
        </section>
      </main>
    </UserShell>
  );
}
