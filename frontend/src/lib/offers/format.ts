import type { BuyXGetYConfig, EffectiveOffer, OfferType } from "./types";

type FormatMoney = (amount: number | string) => string;

function toFiniteNumber(value: number | string | null | undefined) {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : null;
}

export function isOfferPriceReduced(
  price: number | string,
  effectivePrice: number | string | null | undefined,
) {
  const basePrice = toFiniteNumber(price);
  const resolvedPrice = toFiniteNumber(effectivePrice);

  return basePrice !== null && resolvedPrice !== null && resolvedPrice < basePrice;
}

export function getBuyXGetYLabel(config: BuyXGetYConfig | null | undefined) {
  if (!config) {
    return null;
  }

  return `BUY ${config.buyQuantity} GET ${config.getQuantity}`;
}

export function getOfferDisplayLabel(
  offer: Pick<EffectiveOffer, "type" | "value" | "buyXGetY"> | null | undefined,
  formatMoney?: FormatMoney,
) {
  if (!offer) {
    return null;
  }

  if (offer.type === "PERCENTAGE") {
    const value = toFiniteNumber(offer.value);

    return value === null ? null : `${value}% OFF`;
  }

  if (offer.type === "FIXED_AMOUNT") {
    const value = toFiniteNumber(offer.value);

    if (value === null) {
      return null;
    }

    return `${formatMoney ? formatMoney(value) : value} OFF`;
  }

  return getBuyXGetYLabel(offer.buyXGetY);
}

export function isDiscountOfferType(type: OfferType) {
  return type === "PERCENTAGE" || type === "FIXED_AMOUNT";
}
