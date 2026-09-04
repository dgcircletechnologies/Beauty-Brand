export type OfferType = "PERCENTAGE" | "FIXED_AMOUNT" | "BUY_X_GET_Y";

export type OfferTargetType = "PRODUCT" | "CATEGORY" | "VARIANT";

export type OfferEntitySummary = {
  id: string;
  name: string;
  slug?: string;
};

export type OfferVariantSummary = {
  id: string;
  sku: string;
  productId: string;
};

export type BuyXGetYConfig = {
  id?: string;
  offerId?: string;
  buyQuantity: number;
  getQuantity: number;
  rewardProductId: string | null;
  rewardVariantId: string | null;
  createdAt?: string;
  updatedAt?: string;
  rewardProduct?: OfferEntitySummary | null;
  rewardVariant?: OfferVariantSummary | null;
};

export type EffectiveOffer = {
  id: string;
  name: string;
  description?: string | null;
  type: OfferType;
  value?: string | number | null;
  maxDiscountAmount?: string | number | null;
  startAt?: string | null;
  endAt?: string | null;
  buyXGetY?: BuyXGetYConfig | null;
};

export type ResolvedOfferPricing = {
  hasOffer: boolean;
  discountAmount: string | number;
  finalPrice: string | number;
  offer: EffectiveOffer | null;
  buyXGetY: BuyXGetYConfig | null;
};

export type OfferAwarePricing = {
  price: string | number;
  effectivePrice?: string | number;
  hasOffer?: boolean;
  effectiveOffer?: EffectiveOffer | null;
  pricing?: ResolvedOfferPricing;
};

type OfferTargetBase = {
  id: string;
  offerId: string;
  createdAt?: string;
  product?: OfferEntitySummary | null;
  category?: OfferEntitySummary | null;
  variant?: OfferVariantSummary | null;
  targetKey?: string | null;
};

export type ProductOfferTarget = OfferTargetBase & {
  targetType: "PRODUCT";
  productId: string;
  categoryId?: null;
  variantId?: null;
};

export type CategoryOfferTarget = OfferTargetBase & {
  targetType: "CATEGORY";
  productId?: null;
  categoryId: string;
  variantId?: null;
};

export type VariantOfferTarget = OfferTargetBase & {
  targetType: "VARIANT";
  productId?: null;
  categoryId?: null;
  variantId: string;
};

export type UnknownOfferTarget = OfferTargetBase & {
  targetType: null;
  productId?: string | null;
  categoryId?: string | null;
  variantId?: string | null;
};

export type OfferTarget =
  | ProductOfferTarget
  | CategoryOfferTarget
  | VariantOfferTarget
  | UnknownOfferTarget;

export type OfferTargetPayload =
  | {
      productId: string;
      categoryId?: null;
      variantId?: null;
    }
  | {
      productId?: null;
      categoryId: string;
      variantId?: null;
    }
  | {
      productId?: null;
      categoryId?: null;
      variantId: string;
    };

export type Offer = {
  id: string;
  name: string;
  description: string | null;
  type: OfferType;
  value: string | null;
  maxDiscountAmount: string | null;
  startAt: string | null;
  endAt: string | null;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
  buyXGetYConfig?: BuyXGetYConfig | null;
  targets?: OfferTarget[];
};

export type OfferListItem = Omit<Offer, "description" | "targets"> & {
  description?: string | null;
  targets?: OfferTarget[];
  targetCount: number;
  buyXGetYConfig?: Pick<BuyXGetYConfig, "buyQuantity" | "getQuantity"> | null;
};

export type OfferListResponse = {
  items: OfferListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
};

export type OfferListQuery = {
  page?: number | string;
  limit?: number | string;
  search?: string;
  type?: OfferType;
  isActive?: boolean | string;
  startAt?: string;
  endAt?: string;
};

export type CreateOfferPayload = {
  name: string;
  description?: string | null;
  type: OfferType;
  value?: number | null;
  maxDiscountAmount?: number | null;
  startAt?: string | null;
  endAt?: string | null;
  isActive?: boolean;
  priority?: number;
  buyQuantity?: number;
  getQuantity?: number;
  rewardProductId?: string | null;
  rewardVariantId?: string | null;
};

export type UpdateOfferPayload = Partial<Omit<CreateOfferPayload, "type">>;

export type UpdateOfferStatusPayload = {
  isActive: boolean;
};

export type BulkCreateOfferTargetsPayload = {
  targets: OfferTargetPayload[];
};
