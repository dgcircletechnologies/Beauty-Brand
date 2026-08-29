import { CategoryIndex } from "@/components/customer/category-browser";
import { UserShell } from "@/components/customer/user-shell";

export default function CategoriesPage() {
  return (
    <UserShell>
      <CategoryIndex />
    </UserShell>
  );
}
