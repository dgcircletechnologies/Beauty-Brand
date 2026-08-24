import { apiRequest } from "./client";

export type CustomerProductVariant = {
  id: string;
  sku: string;
  price: string;
  compareAtPrice: string | null;
  stockQuantity: number;
  isActive: boolean;
};

export type CustomerMetadataItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  inciName?: string | null;
  benefits?: string | null;
  warnings?: string | null;
};

export type CustomerProductCategory = {
  category: CustomerMetadataItem;
  isPrimary: boolean;
};

export type CustomerProductIngredient = {
  purpose: string | null;
  concentration: string | null;
  isKeyIngredient: boolean;
  ingredient: CustomerMetadataItem;
};

export type CustomerProductAttributeValue = {
  id: string;
  textValue: string | null;
  numberValue: string | null;
  booleanValue: boolean | null;
  attribute: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    dataType: string;
  };
  option: {
    id: string;
    label: string;
    value: string;
  } | null;
};

export type CustomerProduct = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description?: string | null;
  usageInstructions?: string | null;
  warnings?: string | null;
  isFeatured: boolean;
  variants?: CustomerProductVariant[];
  categories?: CustomerProductCategory[];
  ingredients?: CustomerProductIngredient[];
  audiences?: { audience: CustomerMetadataItem }[];
  skinTypes?: { skinType: CustomerMetadataItem }[];
  ageGroups?: { ageGroup: CustomerMetadataItem }[];
  hairProfiles?: { hairProfile: CustomerMetadataItem }[];
  concerns?: { concern: CustomerMetadataItem }[];
  productBenefits?: { benefit: CustomerMetadataItem }[];
  attributeValues?: CustomerProductAttributeValue[];
};

export type CustomerCurrency = {
  code: string;
  name: string;
  symbol: string | null;
  decimalDigits: number;
  isBase: boolean;
  baseCurrencyCode: string;
  rate: number | null;
};

export type CartItem = {
  id: string;
  variantId: string;
  quantity: number;
  baseUnitPrice: number;
  baseLineTotal: number;
  displayUnitPrice: number;
  displayLineTotal: number;
  availability: {
    status: string;
    isAvailable: boolean;
    message: string;
  };
  product: {
    id: string;
    name: string;
    slug: string;
  };
  variant: {
    id: string;
    sku: string;
    stockQuantity: number;
    isActive: boolean;
    deletedAt: string | null;
  };
};

export type CustomerCart = {
  id: string;
  status: string;
  currency: {
    code: string;
    symbol: string | null;
    decimalDigits: number;
  };
  items: CartItem[];
  itemCount: number;
  baseSubtotal: number;
  displaySubtotal: number;
  hasUnavailableItems: boolean;
};

function withAuth(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export function getCustomerProducts() {
  return apiRequest<CustomerProduct[]>("/products");
}

export function getCustomerProduct(slug: string) {
  return apiRequest<CustomerProduct>(`/products/${slug}`);
}

export function getCurrencies() {
  return apiRequest<CustomerCurrency[]>("/currencies");
}

export function getCart(accessToken: string) {
  return apiRequest<CustomerCart>("/cart", {
    headers: withAuth(accessToken),
  });
}

export function addCartItem(
  accessToken: string,
  payload: { variantId: string; quantity: number },
) {
  return apiRequest<CustomerCart>("/cart/items", {
    method: "POST",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function updateCartItem(
  accessToken: string,
  itemId: string,
  payload: { quantity: number },
) {
  return apiRequest<CustomerCart>(`/cart/items/${itemId}`, {
    method: "PATCH",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function removeCartItem(accessToken: string, itemId: string) {
  return apiRequest<CustomerCart>(`/cart/items/${itemId}`, {
    method: "DELETE",
    headers: withAuth(accessToken),
  });
}
