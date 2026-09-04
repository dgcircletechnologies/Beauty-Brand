"use client";

import { useCurrency } from "@/contexts/currency-context";
import { getOfferDisplayLabel } from "@/lib/offers/format";
import type { BuyXGetYConfig, EffectiveOffer } from "@/lib/offers/types";

type OfferBadgeProps = {
  offer: EffectiveOffer | null | undefined;
  buyXGetY?: BuyXGetYConfig | null;
  className?: string;
};

export function OfferBadge({ offer, buyXGetY, className }: OfferBadgeProps) {
  const { formatPrice } = useCurrency();

  if (!offer) {
    return null;
  }

  const label = getOfferDisplayLabel(
    {
      ...offer,
      buyXGetY: offer.buyXGetY ?? buyXGetY ?? null,
    },
    formatPrice,
  );

  if (!label) {
    return null;
  }

  return (
    <span className={["offer-badge", className].filter(Boolean).join(" ")}>
      {label}
    </span>
  );
}
