import { Prisma } from '../../../generated/prisma/client.cjs';
import {
  CategoryOfferResolverResult,
  OfferResolverResult,
} from './offer-resolver.service';

function decimalToMoney(value: Prisma.Decimal) {
  return value.toFixed(2);
}

function nullableDecimalToMoney(value: Prisma.Decimal | null) {
  return value ? value.toFixed(2) : null;
}

function mapOffer(offer: OfferResolverResult['offer']) {
  if (!offer) {
    return null;
  }

  return {
    id: offer.id,
    name: offer.name,
    type: offer.type,
    value: nullableDecimalToMoney(offer.value),
    maxDiscountAmount: nullableDecimalToMoney(offer.maxDiscountAmount),
    startAt: offer.startAt?.toISOString() ?? null,
    endAt: offer.endAt?.toISOString() ?? null,
  };
}

export function mapResolvedPricing(resolution: OfferResolverResult) {
  return {
    hasOffer: resolution.hasOffer,
    discountAmount: decimalToMoney(resolution.discountAmount),
    finalPrice: decimalToMoney(resolution.finalPrice),
    offer: mapOffer(resolution.offer),
    buyXGetY: resolution.buyXGetY,
  };
}

export function mapNoOfferPricing(price: Prisma.Decimal | string | number) {
  const basePrice = new Prisma.Decimal(price);

  return {
    hasOffer: false,
    discountAmount: decimalToMoney(new Prisma.Decimal(0)),
    finalPrice: decimalToMoney(basePrice),
    offer: null,
    buyXGetY: null,
  };
}

export function mapResolvedCategoryOffer(
  resolution: CategoryOfferResolverResult,
) {
  return {
    hasOffer: resolution.hasOffer,
    offer: mapOffer(resolution.offer),
    buyXGetY: resolution.buyXGetY,
  };
}
