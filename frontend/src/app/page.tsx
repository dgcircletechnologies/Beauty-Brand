import { Suspense } from "react";

import { ProductDashboard } from "@/components/customer/product-dashboard";
import { UserShell } from "@/components/customer/user-shell";

export default function Home() {
  return (
    <UserShell>
      <Suspense
        fallback={
          <main className="customer-page">
            <section className="empty-surface">
              <h2>Loading products...</h2>
            </section>
          </main>
        }
      >
        <ProductDashboard />
      </Suspense>
    </UserShell>
  );
}
