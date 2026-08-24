"use client";

import { useParams } from "next/navigation";

import { ProductDetail } from "@/components/customer/product-detail";
import { UserShell } from "@/components/customer/user-shell";

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();

  return (
    <UserShell>
      <ProductDetail slug={params.slug} />
    </UserShell>
  );
}
