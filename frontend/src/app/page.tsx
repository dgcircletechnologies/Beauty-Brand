import { ProductDashboard } from "@/components/customer/product-dashboard";
import { UserShell } from "@/components/customer/user-shell";

export default function Home() {
  return (
    <UserShell>
      <ProductDashboard />
    </UserShell>
  );
}
