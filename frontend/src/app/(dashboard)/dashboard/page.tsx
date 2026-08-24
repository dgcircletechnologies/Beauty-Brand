import { ProductDashboard } from "@/components/customer/product-dashboard";
import { UserShell } from "@/components/customer/user-shell";

export default function DashboardPage() {
  return (
    <UserShell>
      <ProductDashboard />
    </UserShell>
  );
}
