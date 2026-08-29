import { apiRequest } from "./client";

import type { AuthUser } from "@/lib/auth/types";
import type { UserGender } from "@/lib/auth/types";

export type CustomerProductVariant = {
  id: string;
  sku: string;
  price: string;
  compareAtPrice: string | null;
  stockQuantity: number;
  isActive: boolean;
  images?: CustomerProductImage[];
  attributeValues?: CustomerProductAttributeValue[];
};

export type CustomerProductImage = {
  id: string;
  productId: string;
  variantId: string | null;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  width: number | null;
  height: number | null;
  format: string | null;
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

export type CustomerCategoryImage = {
  id: string;
  categoryId: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  width: number | null;
  height: number | null;
  format: string | null;
};

export type CustomerCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  images?: CustomerCategoryImage[];
};

export type CustomerCategoryDetail = CustomerCategory & {
  parent?: CustomerCategory | null;
  children?: CustomerCategory[];
  products?: CustomerProduct[];
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
  images?: CustomerProductImage[];
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

export type CustomerShopFilterOption = {
  name: string;
  slug: string;
};

export type CustomerShopPriceRange = {
  name: string;
  minPrice: number | null;
  maxPrice: number | null;
};

export type CustomerShopFilters = {
  categories: CustomerShopFilterOption[];
  skinTypes: CustomerShopFilterOption[];
  concerns: CustomerShopFilterOption[];
  benefits: CustomerShopFilterOption[];
  ageGroups: CustomerShopFilterOption[];
  formula: CustomerShopFilterOption[];
  priceRanges: CustomerShopPriceRange[];
};

export type CustomerShopPagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type CustomerShopProductsResponse = {
  items: CustomerProduct[];
  pagination: CustomerShopPagination;
  filters: CustomerShopFilters;
};

export type CustomerShopProductParams = {
  q?: string;
  category?: string[];
  skinType?: string[];
  concern?: string[];
  benefit?: string[];
  ageGroup?: string[];
  formula?: string[];
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
  excludeProductId?: string;
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
    attributeValues?: CustomerProductAttributeValue[];
  };
  image: CustomerProductImage | null;
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

export type CheckoutItem = {
  cartItemId: string;
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  quantity: number;
  baseUnitPrice: number;
  baseLineTotal: number;
  displayUnitPrice: number;
  displayLineTotal: number;
  unitPrice: number;
  lineTotal: number;
};

export type CheckoutShippingRate = {
  id: string;
  name: string;
  serviceCode: string | null;
  calculation: string;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  baseAmount: number;
  displayAmount: number;
  amount: number;
  currency: {
    code: string;
    symbol: string | null;
    decimalDigits: number;
  };
  zone: {
    id: string;
    name: string;
    code: string;
  };
};

export type CheckoutPreview = {
  cartId: string;
  currency: {
    code: string;
    symbol: string | null;
    decimalDigits: number;
  };
  exchangeRate: number;
  items: CheckoutItem[];
  itemCount: number;
  baseSubtotal: number;
  displaySubtotal: number;
  subtotal: number;
  baseShippingAmount: number;
  displayShippingAmount: number;
  shippingAmount: number;
  taxAmount: number;
  discountAmount: number;
  baseTotalAmount: number;
  displayTotalAmount: number;
  totalAmount: number;
  shippingRates: CheckoutShippingRate[];
  shippingAvailability: {
    country: {
      id: string;
      countryCode: string;
      countryName: string;
    } | null;
    zone: {
      id: string;
      name: string;
      code: string;
    } | null;
    activeRateCount: number;
    eligibleRateCount: number;
    message: string;
  };
  selectedShippingRate: CheckoutShippingRate | null;
  selectedCartItemIds: string[];
};

export type RazorpayOrder = {
  keyId: string;
  localOrderId: string;
  orderNumber: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerPhone: string | null;
};

export type CustomerOrder = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  baseSubtotal: number;
  baseShippingAmount: number;
  baseTaxAmount: number;
  baseDiscountAmount: number;
  baseTotalAmount: number;
  displaySubtotal: number;
  displayShippingAmount: number;
  displayTaxAmount: number;
  displayDiscountAmount: number;
  displayTotalAmount: number;
  shippingMethodName: string | null;
  shippingServiceCode: string | null;
  customerEmail: string;
  customerPhone: string | null;
  placedAt: string | null;
  paidAt?: string | null;
  cancelledAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  displayCurrency: {
    code: string;
    symbol: string | null;
    decimalDigits: number;
  };
  items: {
    id: string;
    productName: string;
    variantLabel: string | null;
    sku: string;
    quantity: number;
    baseUnitPrice: number;
    baseLineTotal: number;
    displayUnitPrice: number;
    displayLineTotal: number;
    unitPrice: number;
    lineTotal: number;
    image: CustomerProductImage | null;
  }[];
  addresses: {
    id: string;
    type: "SHIPPING" | "BILLING";
    firstName: string;
    lastName: string;
    line1: string;
    line2: string | null;
    city: string;
    stateOrProvince: string | null;
    postalCode: string;
    countryCode: string;
    phone: string | null;
  }[];
  statusHistory: {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
    createdAt: string;
  }[];
  shipments: {
    id: string;
    status: string;
    carrier: string | null;
    service: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    estimatedDeliveryAt: string | null;
  }[];
  cancellationRequests: {
    id: string;
    reason: string;
    details: string | null;
    status: string;
    decisionNote: string | null;
    requestedAt: string;
    decidedAt: string | null;
  }[];
};

export type CustomerOrdersResponse = {
  items: CustomerOrder[];
  pagination: CustomerShopPagination;
};

export type CustomerAddress = {
  id: string;
  label: string | null;
  firstName: string;
  lastName: string;
  company: string | null;
  line1: string;
  line2: string | null;
  city: string;
  stateOrProvince: string | null;
  postalCode: string;
  countryCode: string;
  phone: string | null;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomerShippingCountry = {
  id: string;
  countryCode: string;
  countryName: string;
  zone: {
    id: string;
    name: string;
    code: string;
  };
};

export type UpdateProfilePayload = {
  firstName: string;
  lastName?: string;
  phone?: string;
  gender?: UserGender;
  age?: number;
};

export type AccountSessions = {
  activeSessionCount: number;
  sessions: {
    id: string;
    ipAddress: string | null;
    userAgent: string | null;
    deviceLabel: string | null;
    location: string | null;
    lastUsedAt: string | null;
    createdAt: string;
    expiresAt: string;
    revokedAt: string | null;
    isCurrent: boolean;
    isActive: boolean;
  }[];
};

export type UpsertAddressPayload = {
  label?: string;
  firstName: string;
  lastName: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  stateOrProvince?: string;
  postalCode: string;
  countryCode: string;
  phone?: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
};

function withAuth(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function appendListParam(
  params: URLSearchParams,
  name: string,
  values: string[] | undefined,
) {
  if (values?.length) {
    params.set(name, values.join(","));
  }
}

export function getCustomerShopProducts(options: CustomerShopProductParams = {}) {
  const params = new URLSearchParams();

  if (options.q) {
    params.set("q", options.q);
  }

  appendListParam(params, "category", options.category);
  appendListParam(params, "skinType", options.skinType);
  appendListParam(params, "concern", options.concern);
  appendListParam(params, "benefit", options.benefit);
  appendListParam(params, "ageGroup", options.ageGroup);
  appendListParam(params, "formula", options.formula);

  if (options.minPrice) {
    params.set("minPrice", options.minPrice);
  }

  if (options.maxPrice) {
    params.set("maxPrice", options.maxPrice);
  }

  if (options.sort) {
    params.set("sort", options.sort);
  }

  if (options.page) {
    params.set("page", options.page);
  }

  if (options.pageSize) {
    params.set("pageSize", options.pageSize);
  }

  if (options.excludeProductId) {
    params.set("excludeProductId", options.excludeProductId);
  }

  const query = params.toString();

  return apiRequest<CustomerShopProductsResponse>(
    `/products${query ? `?${query}` : ""}`,
  );
}

export async function getCustomerProducts() {
  const response = await getCustomerShopProducts();

  return response.items;
}

export function getCustomerProduct(slug: string) {
  return apiRequest<CustomerProduct>(`/products/${slug}`);
}

export function getCustomerCategories() {
  return apiRequest<CustomerCategory[]>("/categories");
}

export function getCustomerCategory(slug: string) {
  return apiRequest<CustomerCategoryDetail>(
    `/categories/${encodeURIComponent(slug)}`,
  );
}

export function getCustomerCategoryProducts(slug: string) {
  return apiRequest<CustomerProduct[]>(
    `/categories/${encodeURIComponent(slug)}/products`,
  );
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

export function getCheckoutPreview(
  accessToken: string,
  options: {
    cartItemIds?: string[];
    currencyCode?: string;
    shippingAddressId?: string;
    shippingRateId?: string;
  } = {},
) {
  const params = new URLSearchParams();

  if (options.cartItemIds?.length) {
    params.set("cartItemIds", options.cartItemIds.join(","));
  }

  if (options.currencyCode) {
    params.set("currencyCode", options.currencyCode);
  }

  if (options.shippingAddressId) {
    params.set("shippingAddressId", options.shippingAddressId);
  }

  if (options.shippingRateId) {
    params.set("shippingRateId", options.shippingRateId);
  }

  const query = params.toString();

  return apiRequest<CheckoutPreview>(`/orders/checkout${query ? `?${query}` : ""}`, {
    headers: withAuth(accessToken),
  });
}

export function createOrder(
  accessToken: string,
  payload: {
    cartItemIds?: string[];
    shippingAddressId: string;
    billingAddressId?: string;
    shippingRateId: string;
    currencyCode?: string;
    customerPhone?: string;
  },
) {
  return apiRequest<CustomerOrder>("/orders/checkout", {
    method: "POST",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function createRazorpayOrder(
  accessToken: string,
  payload: {
    cartItemIds?: string[];
    shippingAddressId: string;
    billingAddressId?: string;
    shippingRateId: string;
    currencyCode?: string;
    customerPhone?: string;
  },
) {
  return apiRequest<RazorpayOrder>("/payments/razorpay/create-order", {
    method: "POST",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function verifyRazorpayPayment(
  accessToken: string,
  payload: {
    localOrderId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
) {
  return apiRequest<CustomerOrder>("/payments/razorpay/verify", {
    method: "POST",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function getOrders(
  accessToken: string,
  options: { page?: number; pageSize?: number } = {},
) {
  const params = new URLSearchParams();

  if (options.page) {
    params.set("page", String(options.page));
  }

  if (options.pageSize) {
    params.set("pageSize", String(options.pageSize));
  }

  const query = params.toString();

  return apiRequest<CustomerOrdersResponse>(`/orders${query ? `?${query}` : ""}`, {
    headers: withAuth(accessToken),
  });
}

export function getOrder(accessToken: string, orderId: string) {
  return apiRequest<CustomerOrder>(`/orders/${encodeURIComponent(orderId)}`, {
    headers: withAuth(accessToken),
  });
}

export function requestOrderCancellation(
  accessToken: string,
  orderId: string,
  payload: { reason: string; details?: string },
) {
  return apiRequest<CustomerOrder["cancellationRequests"][number]>(
    `/orders/${orderId}/cancellation-requests`,
    {
      method: "POST",
      headers: withAuth(accessToken),
      body: JSON.stringify(payload),
    },
  );
}

export function getProfile(accessToken: string) {
  return apiRequest<AuthUser>("/account/profile", {
    headers: withAuth(accessToken),
  });
}

export function updateProfile(
  accessToken: string,
  payload: UpdateProfilePayload,
) {
  return apiRequest<AuthUser>("/account/profile", {
    method: "PATCH",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function changePassword(
  accessToken: string,
  payload: { currentPassword: string; newPassword: string },
) {
  return apiRequest<{ passwordChanged: boolean }>("/account/password", {
    method: "PATCH",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function getAccountSessions(
  accessToken: string,
  refreshToken: string,
) {
  return apiRequest<AccountSessions>("/account/sessions", {
    method: "POST",
    headers: withAuth(accessToken),
    body: JSON.stringify({ refreshToken }),
  });
}

export function revokeAccountSession(accessToken: string, sessionId: string) {
  return apiRequest<{ revoked: boolean }>(`/account/sessions/${sessionId}`, {
    method: "DELETE",
    headers: withAuth(accessToken),
  });
}

export function getAddresses(accessToken: string) {
  return apiRequest<CustomerAddress[]>("/account/addresses", {
    headers: withAuth(accessToken),
  });
}

export function getShippingCountries(accessToken: string) {
  return apiRequest<CustomerShippingCountry[]>("/shipping/countries", {
    headers: withAuth(accessToken),
  });
}

export function createAddress(
  accessToken: string,
  payload: UpsertAddressPayload,
) {
  return apiRequest<CustomerAddress>("/account/addresses", {
    method: "POST",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function updateAddress(
  accessToken: string,
  addressId: string,
  payload: UpsertAddressPayload,
) {
  return apiRequest<CustomerAddress>(`/account/addresses/${addressId}`, {
    method: "PATCH",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function deleteAddress(accessToken: string, addressId: string) {
  return apiRequest<CustomerAddress>(`/account/addresses/${addressId}`, {
    method: "DELETE",
    headers: withAuth(accessToken),
  });
}
