import { CustomerCategories } from "@/components/customer/customer-categories";
import { UserShell } from "@/components/customer/user-shell";

export default function CategoriesPage() {
  return (
    <UserShell>
      <CustomerCategories />
    </UserShell>
  );
}
