"use client";

import { useCurrency } from "@/contexts/currency-context";
import { isDiscountOfferType, isOfferPriceReduced } from "@/lib/offers/format";
import type { EffectiveOffer, ResolvedOfferPricing } from "@/lib/offers/types";

type OfferPriceProps = {
  price: number | string;
  effectivePrice?: number | string | null;
  offer?: EffectiveOffer | null;
  pricing?: ResolvedOfferPricing | null;
  className?: string;
};

export function OfferPrice({
  price,
  effectivePrice,
  offer,
  pricing,
  className,
}: OfferPriceProps) {
  const { formatPrice } = useCurrency();
  const resolvedOffer = offer ?? pricing?.offer ?? null;
  const resolvedEffectivePrice = effectivePrice ?? pricing?.finalPrice ?? price;
  const showDiscountPrice =
    resolvedOffer &&
    isDiscountOfferType(resolvedOffer.type) &&
    isOfferPriceReduced(price, resolvedEffectivePrice);

  return (
    <span className={["offer-price", className].filter(Boolean).join(" ")}>
      <strong>{formatPrice(showDiscountPrice ? resolvedEffectivePrice : price)}</strong>
      {showDiscountPrice ? <span>{formatPrice(price)}</span> : null}
    </span>
  );
}
