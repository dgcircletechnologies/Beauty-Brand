import { Suspense } from "react";

import { CustomerShop } from "@/components/customer/customer-shop";
import { UserShell } from "@/components/customer/user-shell";

export default function ShopPage() {
  return (
    <UserShell>
      <Suspense
        fallback={
          <main className="shop-page">
            <section className="empty-surface">
              <h2>Loading shop...</h2>
            </section>
          </main>
        }
      >
        <CustomerShop />
      </Suspense>
    </UserShell>
  );
}
