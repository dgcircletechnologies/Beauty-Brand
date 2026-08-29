"use client";

import { useParams } from "next/navigation";

import { CategoryDrilldown } from "@/components/customer/category-browser";
import { UserShell } from "@/components/customer/user-shell";

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();

  return (
    <UserShell>
      <CategoryDrilldown slug={params.slug} />
    </UserShell>
  );
}
