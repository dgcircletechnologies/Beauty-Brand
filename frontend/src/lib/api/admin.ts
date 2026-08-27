import { apiRequest } from "./client";

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAdminCategoryPayload = {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
};

export type UpdateAdminCategoryPayload = {
  name?: string;
  description?: string;
  parentId?: string | null;
  isActive?: boolean;
};

export type AdminCategorySlugAvailability = {
  slug: string;
  available: boolean;
  category: {
    id: string;
    name: string;
    deletedAt: string | null;
  } | null;
};

export type AdminProductCategory = {
  productId: string;
  categoryId: string;
  isPrimary: boolean;
  sortOrder: number;
  category: AdminCategory;
};

export type AdminProductImage = {
  id: string;
  productId: string;
  variantId: string | null;
  url: string;
  publicId: string | null;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  categories: AdminProductCategory[];
  images?: AdminProductImage[];
};

export type AdminProductVariant = {
  id: string;
  productId: string;
  sku: string;
  price: string;
  compareAtPrice: string | null;
  stockQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  images?: AdminProductImage[];
};

export type CreateAdminProductVariantPayload = {
  sku: string;
  price: number;
  compareAtPrice?: number;
  stockQuantity?: number;
  isActive?: boolean;
};

export type UpdateAdminProductPayload = {
  name?: string;
  shortDescription?: string;
  description?: string;
  usageInstructions?: string;
  warnings?: string;
  status?: AdminProduct["status"];
  isFeatured?: boolean;
  ingredientIds?: string[];
  audienceIds?: string[];
  skinTypeIds?: string[];
  ageGroupIds?: string[];
  hairProfileIds?: string[];
  concernIds?: string[];
  benefitIds?: string[];
};

export type UpdateAdminProductVariantPayload = {
  price?: number;
  compareAtPrice?: number | null;
  stockQuantity?: number;
  isActive?: boolean;
};

export type AdminProductSlugAvailability = {
  slug: string;
  available: boolean;
  product: {
    id: string;
    name: string;
    deletedAt: string | null;
  } | null;
};

export type AdminVariantSkuAvailability = {
  sku: string;
  available: boolean;
  variant: {
    id: string;
    sku: string;
    productId: string;
    deletedAt: string | null;
  } | null;
};

export type AdminProductDetail = AdminProduct & {
  description: string | null;
  usageInstructions: string | null;
  warnings: string | null;
  variants: AdminProductVariant[];
};

export type AdminAttribute = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  dataType: "TEXT" | "NUMBER" | "BOOLEAN" | "SELECT" | "MULTI_SELECT";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAdminAttributePayload = {
  name: string;
  slug: string;
  description?: string;
  dataType: AdminAttribute["dataType"];
  isActive?: boolean;
};

export type UpdateAdminAttributePayload = Partial<CreateAdminAttributePayload>;

export type AdminAttributeSlugAvailability = {
  slug: string;
  available: boolean;
  attribute: {
    id: string;
    name: string;
    deletedAt: string | null;
  } | null;
};

export type PaginatedAdminAttributes = {
  items: AdminAttribute[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type AdminAttributeListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  dataType?: string;
};

export type AdminCategoryAttribute = {
  id: string;
  categoryId: string;
  attributeDefinitionId: string;
  isRequired: boolean;
  isVariantAttribute: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  attributeDefinition: AdminAttribute;
};

export type AssignCategoryAttributePayload = {
  attributeDefinitionId: string;
  isRequired?: boolean;
  isVariantAttribute?: boolean;
  sortOrder?: number;
};

export type AdminAttributeOption = {
  id: string;
  attributeDefinitionId: string;
  label: string;
  value: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAdminAttributeOptionPayload = {
  label: string;
  value: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateAdminAttributeOptionPayload =
  Partial<CreateAdminAttributeOptionPayload>;

export type PaginatedAdminAttributeOptions = {
  items: AdminAttributeOption[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type AdminAttributeOptionListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
};

export type AdminAttributeOptionValueAvailability = {
  value: string;
  available: boolean;
  option: {
    id: string;
    label: string;
    deletedAt: string | null;
  } | null;
};

export type ProductMetadataResource =
  | "ingredients"
  | "skin-types"
  | "age-groups"
  | "audiences"
  | "hair-profiles"
  | "concerns"
  | "benefits";

export type AdminProductMetadataItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  inciName?: string | null;
  benefits?: string | null;
  warnings?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
};

export type CreateProductMetadataPayload = {
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
  inciName?: string;
  benefits?: string;
  warnings?: string;
  minAge?: number | null;
  maxAge?: number | null;
};

export type AdminProductMetadataOptions = {
  ingredients: AdminProductMetadataItem[];
  audiences: AdminProductMetadataItem[];
  skinTypes: AdminProductMetadataItem[];
  ageGroups: AdminProductMetadataItem[];
  hairProfiles: AdminProductMetadataItem[];
  concerns: AdminProductMetadataItem[];
  benefits: AdminProductMetadataItem[];
  categories: AdminCategory[];
};

export type CreateAdminProductIngredientPayload = {
  ingredientId: string;
  purpose?: string;
  concentration?: string;
  isKeyIngredient?: boolean;
  sortOrder?: number;
};

export type CreateAdminProductPayload = {
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  usageInstructions?: string;
  warnings?: string;
  status?: AdminProduct["status"];
  isFeatured?: boolean;
  ingredients?: CreateAdminProductIngredientPayload[];
  audienceIds?: string[];
  skinTypeIds?: string[];
  ageGroupIds?: string[];
  hairProfileIds?: string[];
  concernIds?: string[];
  benefitIds?: string[];
};

export type AssignProductCategoryPayload = {
  categoryId: string;
  isPrimary?: boolean;
  sortOrder?: number;
};

export type SetProductAttributeValuePayload = {
  attributeId: string;
  textValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
  optionId?: string;
  optionIds?: string[];
};

export type AdminCurrency = {
  code: string;
  name: string;
  symbol: string | null;
  decimalDigits: number;
  status: "ACTIVE" | "INACTIVE";
  isBase: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAdminCurrencyPayload = {
  code: string;
  name: string;
  symbol?: string;
  decimalDigits?: number;
  status?: AdminCurrency["status"];
  isBase?: boolean;
};

export type AdminExchangeRate = {
  id: string;
  baseCurrencyCode: string;
  quoteCurrencyCode: string;
  rate: string;
  provider: string;
  effectiveAt: string;
  expiresAt: string | null;
  createdAt: string;
  baseCurrency: AdminCurrency;
  quoteCurrency: AdminCurrency;
};

export type AdminShippingRate = {
  id: string;
  zoneId: string;
  name: string;
  serviceCode: string | null;
  calculation: "FLAT" | "FREE";
  amount: string;
  currencyCode: string;
  minOrderAmount: string | null;
  maxOrderAmount: string | null;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  currency?: AdminCurrency;
};

export type AdminZoneCountry = {
  id: string;
  zoneId: string;
  countryCode: string;
  countryName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminShippingZone = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  countries: AdminZoneCountry[];
  rates: AdminShippingRate[];
};

export type AdminOrder = {
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
  customerEmail: string;
  customerPhone: string | null;
  placedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
  };
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

export type AdminPayment = {
  id: string;
  orderId: string;
  type: "PAYMENT" | "REFUND";
  provider: string;
  providerTransactionId: string | null;
  providerIntentId: string | null;
  idempotencyKey: string;
  status:
    | "PENDING"
    | "PROCESSING"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED"
    | "PARTIALLY_REFUNDED"
    | "REFUNDED";
  amount: number;
  currencyCode: string;
  failureCode: string | null;
  failureReason: string | null;
  metadata: unknown;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  currency: AdminCurrency;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    customerEmail: string;
    customerPhone: string | null;
    totalAmount: number;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string | null;
    };
  } | null;
};

export type CreateAdminExchangeRatePayload = {
  baseCurrencyCode: string;
  quoteCurrencyCode: string;
  rate: number;
  provider: string;
  effectiveAt: string;
  expiresAt?: string;
};

function withAuth(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export function getAdminCategories(accessToken: string) {
  return apiRequest<AdminCategory[]>("/admin/categories", {
    headers: withAuth(accessToken),
  });
}

export function checkAdminCategorySlugAvailability(
  accessToken: string,
  slug: string,
  excludeId?: string,
) {
  const params = excludeId
    ? `?excludeId=${encodeURIComponent(excludeId)}`
    : "";

  return apiRequest<AdminCategorySlugAvailability>(
    `/admin/categories/slug-availability/${encodeURIComponent(slug)}${params}`,
    {
      headers: withAuth(accessToken),
    },
  );
}

export function createAdminCategory(
  accessToken: string,
  payload: CreateAdminCategoryPayload,
) {
  return apiRequest<AdminCategory>("/admin/categories", {
    method: "POST",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function updateAdminCategory(
  accessToken: string,
  categoryId: string,
  payload: UpdateAdminCategoryPayload,
) {
  return apiRequest<AdminCategory>(`/admin/categories/${categoryId}`, {
    method: "PATCH",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function deleteAdminCategory(accessToken: string, categoryId: string) {
  return apiRequest<AdminCategory>(`/admin/categories/${categoryId}`, {
    method: "DELETE",
    headers: withAuth(accessToken),
  });
}

export function getAdminProducts(accessToken: string) {
  return apiRequest<AdminProduct[]>("/admin/products", {
    headers: withAuth(accessToken),
  });
}

export function createAdminProduct(
  accessToken: string,
  payload: CreateAdminProductPayload,
) {
  return apiRequest<AdminProductDetail>("/admin/products", {
    method: "POST",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function checkAdminProductSlugAvailability(
  accessToken: string,
  slug: string,
  excludeId?: string,
) {
  const params = excludeId
    ? `?excludeId=${encodeURIComponent(excludeId)}`
    : "";

  return apiRequest<AdminProductSlugAvailability>(
    `/admin/products/slug-availability/${encodeURIComponent(slug)}${params}`,
    {
      headers: withAuth(accessToken),
    },
  );
}

export function getAdminProduct(accessToken: string, productId: string) {
  return apiRequest<AdminProductDetail>(`/admin/products/${productId}`, {
    headers: withAuth(accessToken),
  });
}

export function updateAdminProduct(
  accessToken: string,
  productId: string,
  payload: UpdateAdminProductPayload,
) {
  return apiRequest<AdminProductDetail>(`/admin/products/${productId}`, {
    method: "PATCH",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function updateAdminProductStatus(
  accessToken: string,
  productId: string,
  status: AdminProduct["status"],
) {
  return apiRequest<AdminProduct>(`/admin/products/${productId}/status`, {
    method: "PATCH",
    headers: withAuth(accessToken),
    body: JSON.stringify({ status }),
  });
}

export function deleteAdminProduct(accessToken: string, productId: string) {
  return apiRequest<AdminProduct>(`/admin/products/${productId}`, {
    method: "DELETE",
    headers: withAuth(accessToken),
  });
}

export function createAdminProductVariant(
  accessToken: string,
  productId: string,
  payload: CreateAdminProductVariantPayload,
) {
  return apiRequest<AdminProductVariant>(
    `/admin/products/${productId}/variants`,
    {
      method: "POST",
      headers: withAuth(accessToken),
      body: JSON.stringify(payload),
    },
  );
}

export function updateAdminProductVariant(
  accessToken: string,
  productId: string,
  variantId: string,
  payload: UpdateAdminProductVariantPayload,
) {
  return apiRequest<AdminProductVariant>(
    `/admin/products/${productId}/variants/${variantId}`,
    {
      method: "PATCH",
      headers: withAuth(accessToken),
      body: JSON.stringify(payload),
    },
  );
}

export function deleteAdminProductVariant(
  accessToken: string,
  productId: string,
  variantId: string,
) {
  return apiRequest<AdminProductVariant>(
    `/admin/products/${productId}/variants/${variantId}`,
    {
      method: "DELETE",
      headers: withAuth(accessToken),
    },
  );
}

export function checkAdminVariantSkuAvailability(
  accessToken: string,
  productId: string,
  sku: string,
  excludeId?: string,
) {
  const params = excludeId
    ? `?excludeId=${encodeURIComponent(excludeId)}`
    : "";

  return apiRequest<AdminVariantSkuAvailability>(
    `/admin/products/${productId}/variants/sku-availability/${encodeURIComponent(
      sku,
    )}${params}`,
    {
      headers: withAuth(accessToken),
    },
  );
}

export function getAdminProductImages(accessToken: string, productId: string) {
  return apiRequest<AdminProductImage[]>(`/admin/products/${productId}/images`, {
    headers: withAuth(accessToken),
  });
}

export function uploadAdminProductImages(
  accessToken: string,
  productId: string,
  files: File[],
) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("images", file);
  });

  return apiRequest<AdminProductImage[]>(`/admin/products/${productId}/images`, {
    method: "POST",
    headers: withAuth(accessToken),
    body: formData,
  });
}

export function uploadAdminVariantImages(
  accessToken: string,
  productId: string,
  variantId: string,
  files: File[],
) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("images", file);
  });

  return apiRequest<AdminProductImage[]>(
    `/admin/products/${productId}/variants/${variantId}/images`,
    {
      method: "POST",
      headers: withAuth(accessToken),
      body: formData,
    },
  );
}

export function updateAdminProductImage(
  accessToken: string,
  productId: string,
  imageId: string,
  payload: {
    altText?: string;
    sortOrder?: number;
    isPrimary?: boolean;
    variantId?: string | null;
  },
) {
  return apiRequest<AdminProductImage>(
    `/admin/products/${productId}/images/${imageId}`,
    {
      method: "PATCH",
      headers: withAuth(accessToken),
      body: JSON.stringify(payload),
    },
  );
}

export function deleteAdminProductImage(
  accessToken: string,
  productId: string,
  imageId: string,
) {
  return apiRequest<AdminProductImage>(
    `/admin/products/${productId}/images/${imageId}`,
    {
      method: "DELETE",
      headers: withAuth(accessToken),
    },
  );
}

export function assignAdminVariantImages(
  accessToken: string,
  productId: string,
  variantId: string,
  imageIds: string[],
) {
  return apiRequest<AdminProductImage[]>(
    `/admin/products/${productId}/variants/${variantId}/images`,
    {
      method: "PATCH",
      headers: withAuth(accessToken),
      body: JSON.stringify({ imageIds }),
    },
  );
}

export function getAdminProductMetadataOptions(accessToken: string) {
  return apiRequest<AdminProductMetadataOptions>("/admin/products/metadata", {
    headers: withAuth(accessToken),
  });
}

export function getAdminAttributes(accessToken: string) {
  return apiRequest<AdminAttribute[]>("/admin/attributes", {
    headers: withAuth(accessToken),
  });
}

export function getAdminAttributesPage(
  accessToken: string,
  params: AdminAttributeListParams,
) {
  const queryParams = new URLSearchParams();

  queryParams.set("page", String(params.page ?? 1));
  queryParams.set("pageSize", String(params.pageSize ?? 10));

  if (params.search?.trim()) {
    queryParams.set("search", params.search.trim());
  }

  if (params.status && params.status !== "all") {
    queryParams.set("status", params.status);
  }

  if (params.dataType && params.dataType !== "all") {
    queryParams.set("dataType", params.dataType);
  }

  return apiRequest<PaginatedAdminAttributes>(
    `/admin/attributes?${queryParams.toString()}`,
    {
      headers: withAuth(accessToken),
    },
  );
}

export function checkAdminAttributeSlugAvailability(
  accessToken: string,
  slug: string,
  excludeId?: string,
) {
  const params = excludeId
    ? `?excludeId=${encodeURIComponent(excludeId)}`
    : "";

  return apiRequest<AdminAttributeSlugAvailability>(
    `/admin/attributes/slug-availability/${encodeURIComponent(slug)}${params}`,
    {
      headers: withAuth(accessToken),
    },
  );
}

export function createAdminAttribute(
  accessToken: string,
  payload: CreateAdminAttributePayload,
) {
  return apiRequest<AdminAttribute>("/admin/attributes", {
    method: "POST",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function getAdminAttribute(accessToken: string, attributeId: string) {
  return apiRequest<AdminAttribute>(`/admin/attributes/${attributeId}`, {
    headers: withAuth(accessToken),
  });
}

export function updateAdminAttribute(
  accessToken: string,
  attributeId: string,
  payload: UpdateAdminAttributePayload,
) {
  return apiRequest<AdminAttribute>(`/admin/attributes/${attributeId}`, {
    method: "PATCH",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function setAdminAttributeActive(
  accessToken: string,
  attributeId: string,
  isActive: boolean,
) {
  return apiRequest<AdminAttribute>(`/admin/attributes/${attributeId}/active`, {
    method: "PATCH",
    headers: withAuth(accessToken),
    body: JSON.stringify({ isActive }),
  });
}

export function deleteAdminAttribute(accessToken: string, attributeId: string) {
  return apiRequest<AdminAttribute>(`/admin/attributes/${attributeId}`, {
    method: "DELETE",
    headers: withAuth(accessToken),
  });
}

export function getAdminCategoryAttributes(
  accessToken: string,
  categoryId: string,
) {
  return apiRequest<AdminCategoryAttribute[]>(
    `/admin/categories/${categoryId}/attributes`,
    {
      headers: withAuth(accessToken),
    },
  );
}

export function assignAdminCategoryAttribute(
  accessToken: string,
  categoryId: string,
  payload: AssignCategoryAttributePayload,
) {
  return apiRequest<AdminCategoryAttribute>(
    `/admin/categories/${categoryId}/attributes`,
    {
      method: "POST",
      headers: withAuth(accessToken),
      body: JSON.stringify(payload),
    },
  );
}

export function updateAdminCategoryAttribute(
  accessToken: string,
  categoryId: string,
  attributeDefinitionId: string,
  payload: Omit<AssignCategoryAttributePayload, "attributeDefinitionId">,
) {
  return apiRequest<AdminCategoryAttribute>(
    `/admin/categories/${categoryId}/attributes/${attributeDefinitionId}`,
    {
      method: "PATCH",
      headers: withAuth(accessToken),
      body: JSON.stringify(payload),
    },
  );
}

export function deleteAdminCategoryAttribute(
  accessToken: string,
  categoryId: string,
  attributeDefinitionId: string,
) {
  return apiRequest<AdminCategoryAttribute>(
    `/admin/categories/${categoryId}/attributes/${attributeDefinitionId}`,
    {
      method: "DELETE",
      headers: withAuth(accessToken),
    },
  );
}

export function createAdminAttributeOption(
  accessToken: string,
  attributeId: string,
  payload: CreateAdminAttributeOptionPayload,
) {
  return apiRequest<AdminAttributeOption>(
    `/admin/attributes/${attributeId}/options`,
    {
      method: "POST",
      headers: withAuth(accessToken),
      body: JSON.stringify(payload),
    },
  );
}

export function checkAdminAttributeOptionValueAvailability(
  accessToken: string,
  attributeId: string,
  value: string,
) {
  return apiRequest<AdminAttributeOptionValueAvailability>(
    `/admin/attributes/${attributeId}/options/value-availability/${encodeURIComponent(value)}`,
    {
      headers: withAuth(accessToken),
    },
  );
}

export function getAdminAttributeOption(
  accessToken: string,
  attributeId: string,
  optionId: string,
) {
  return apiRequest<AdminAttributeOption>(
    `/admin/attributes/${attributeId}/options/${optionId}`,
    {
      headers: withAuth(accessToken),
    },
  );
}

export function updateAdminAttributeOption(
  accessToken: string,
  attributeId: string,
  optionId: string,
  payload: UpdateAdminAttributeOptionPayload,
) {
  return apiRequest<AdminAttributeOption>(
    `/admin/attributes/${attributeId}/options/${optionId}`,
    {
      method: "PATCH",
      headers: withAuth(accessToken),
      body: JSON.stringify(payload),
    },
  );
}

export function setAdminAttributeOptionActive(
  accessToken: string,
  attributeId: string,
  optionId: string,
  isActive: boolean,
) {
  return apiRequest<AdminAttributeOption>(
    `/admin/attributes/${attributeId}/options/${optionId}/active`,
    {
      method: "PATCH",
      headers: withAuth(accessToken),
      body: JSON.stringify({ isActive }),
    },
  );
}

export function deleteAdminAttributeOption(
  accessToken: string,
  attributeId: string,
  optionId: string,
) {
  return apiRequest<AdminAttributeOption>(
    `/admin/attributes/${attributeId}/options/${optionId}`,
    {
      method: "DELETE",
      headers: withAuth(accessToken),
    },
  );
}

export function getAdminAttributeOptions(
  accessToken: string,
  attributeId: string,
) {
  return apiRequest<AdminAttributeOption[]>(
    `/admin/attributes/${attributeId}/options`,
    {
      headers: withAuth(accessToken),
    },
  );
}

export function getAdminAttributeOptionsPage(
  accessToken: string,
  attributeId: string,
  params: AdminAttributeOptionListParams,
) {
  const queryParams = new URLSearchParams();

  queryParams.set("page", String(params.page ?? 1));
  queryParams.set("pageSize", String(params.pageSize ?? 10));

  if (params.search?.trim()) {
    queryParams.set("search", params.search.trim());
  }

  if (params.status && params.status !== "all") {
    queryParams.set("status", params.status);
  }

  return apiRequest<PaginatedAdminAttributeOptions>(
    `/admin/attributes/${attributeId}/options?${queryParams.toString()}`,
    {
      headers: withAuth(accessToken),
    },
  );
}

export function assignAdminProductCategory(
  accessToken: string,
  productId: string,
  payload: AssignProductCategoryPayload,
) {
  return apiRequest<AdminProductCategory>(
    `/admin/products/${productId}/categories`,
    {
      method: "POST",
      headers: withAuth(accessToken),
      body: JSON.stringify(payload),
    },
  );
}

export function setAdminProductAttributeValue(
  accessToken: string,
  productId: string,
  payload: SetProductAttributeValuePayload,
) {
  return apiRequest<unknown>(`/admin/products/${productId}/attributes`, {
    method: "POST",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function getAdminProductAttributeValues(
  accessToken: string,
  productId: string,
) {
  return apiRequest<unknown[]>(`/admin/products/${productId}/attributes`, {
    headers: withAuth(accessToken),
  });
}

export function updateAdminProductAttributeValue(
  accessToken: string,
  productId: string,
  attributeId: string,
  payload: Omit<SetProductAttributeValuePayload, "attributeId">,
) {
  return apiRequest<unknown[]>(
    `/admin/products/${productId}/attributes/${attributeId}`,
    {
      method: "PATCH",
      headers: withAuth(accessToken),
      body: JSON.stringify(payload),
    },
  );
}

export function deleteAdminProductAttributeValue(
  accessToken: string,
  productId: string,
  attributeId: string,
) {
  return apiRequest<{ deleted: boolean; count: number }>(
    `/admin/products/${productId}/attributes/${attributeId}`,
    {
      method: "DELETE",
      headers: withAuth(accessToken),
    },
  );
}

export function setAdminVariantAttributeValue(
  accessToken: string,
  productId: string,
  variantId: string,
  payload: SetProductAttributeValuePayload,
) {
  return apiRequest<unknown[]>(
    `/admin/products/${productId}/variants/${variantId}/attributes`,
    {
      method: "POST",
      headers: withAuth(accessToken),
      body: JSON.stringify(payload),
    },
  );
}

export function getAdminVariantAttributeValues(
  accessToken: string,
  productId: string,
  variantId: string,
) {
  return apiRequest<unknown[]>(
    `/admin/products/${productId}/variants/${variantId}/attributes`,
    {
      headers: withAuth(accessToken),
    },
  );
}

export function updateAdminVariantAttributeValue(
  accessToken: string,
  productId: string,
  variantId: string,
  attributeId: string,
  payload: Omit<SetProductAttributeValuePayload, "attributeId">,
) {
  return apiRequest<unknown[]>(
    `/admin/products/${productId}/variants/${variantId}/attributes/${attributeId}`,
    {
      method: "PATCH",
      headers: withAuth(accessToken),
      body: JSON.stringify(payload),
    },
  );
}

export function deleteAdminVariantAttributeValue(
  accessToken: string,
  productId: string,
  variantId: string,
  attributeId: string,
) {
  return apiRequest<{ deleted: boolean; count: number }>(
    `/admin/products/${productId}/variants/${variantId}/attributes/${attributeId}`,
    {
      method: "DELETE",
      headers: withAuth(accessToken),
    },
  );
}

export function getProductMetadataItems(
  accessToken: string,
  resource: ProductMetadataResource,
) {
  return apiRequest<AdminProductMetadataItem[]>(
    `/admin/product-metadata/${resource}`,
    {
      headers: withAuth(accessToken),
    },
  );
}

export function createProductMetadataItem(
  accessToken: string,
  resource: ProductMetadataResource,
  payload: CreateProductMetadataPayload,
) {
  return apiRequest<AdminProductMetadataItem>(
    `/admin/product-metadata/${resource}`,
    {
      method: "POST",
      headers: withAuth(accessToken),
      body: JSON.stringify(payload),
    },
  );
}

export function updateProductMetadataItem(
  accessToken: string,
  resource: ProductMetadataResource,
  itemId: string,
  payload: CreateProductMetadataPayload,
) {
  return apiRequest<AdminProductMetadataItem>(
    `/admin/product-metadata/${resource}/${itemId}`,
    {
      method: "PATCH",
      headers: withAuth(accessToken),
      body: JSON.stringify(payload),
    },
  );
}

export function deleteProductMetadataItem(
  accessToken: string,
  resource: ProductMetadataResource,
  itemId: string,
) {
  return apiRequest<AdminProductMetadataItem>(
    `/admin/product-metadata/${resource}/${itemId}`,
    {
      method: "DELETE",
      headers: withAuth(accessToken),
    },
  );
}

export function getAdminCurrencies(accessToken: string) {
  return apiRequest<AdminCurrency[]>("/admin/currencies", {
    headers: withAuth(accessToken),
  });
}

export function createAdminCurrency(
  accessToken: string,
  payload: CreateAdminCurrencyPayload,
) {
  return apiRequest<AdminCurrency>("/admin/currencies", {
    method: "POST",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function updateAdminCurrency(
  accessToken: string,
  code: string,
  payload: Partial<CreateAdminCurrencyPayload>,
) {
  return apiRequest<AdminCurrency>(`/admin/currencies/${code}`, {
    method: "PATCH",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function getAdminExchangeRates(accessToken: string) {
  return apiRequest<AdminExchangeRate[]>("/admin/currencies/exchange-rates", {
    headers: withAuth(accessToken),
  });
}

export function createAdminExchangeRate(
  accessToken: string,
  payload: CreateAdminExchangeRatePayload,
) {
  return apiRequest<AdminExchangeRate>("/admin/currencies/exchange-rates", {
    method: "POST",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function getAdminShippingZones(accessToken: string) {
  return apiRequest<AdminShippingZone[]>("/admin/shipping/zones", {
    headers: withAuth(accessToken),
  });
}

export function createAdminShippingZone(
  accessToken: string,
  payload: { name: string; code: string; isActive?: boolean },
) {
  return apiRequest<AdminShippingZone>("/admin/shipping/zones", {
    method: "POST",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function updateAdminShippingZone(
  accessToken: string,
  zoneId: string,
  payload: { name?: string; code?: string; isActive?: boolean },
) {
  return apiRequest<AdminShippingZone>(`/admin/shipping/zones/${zoneId}`, {
    method: "PATCH",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function addAdminZoneCountry(
  accessToken: string,
  zoneId: string,
  payload: { countryCode: string; countryName: string; isActive?: boolean },
) {
  return apiRequest<AdminZoneCountry>(
    `/admin/shipping/zones/${zoneId}/countries`,
    {
      method: "POST",
      headers: withAuth(accessToken),
      body: JSON.stringify(payload),
    },
  );
}

export function updateAdminZoneCountry(
  accessToken: string,
  countryId: string,
  payload: { countryCode?: string; countryName?: string; isActive?: boolean },
) {
  return apiRequest<AdminZoneCountry>(`/admin/shipping/countries/${countryId}`, {
    method: "PATCH",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function createAdminShippingRate(
  accessToken: string,
  payload: {
    zoneId: string;
    name: string;
    serviceCode?: string;
    calculation?: "FLAT" | "FREE";
    amount: number;
    currencyCode: string;
    minOrderAmount?: number;
    maxOrderAmount?: number;
    estimatedDaysMin?: number;
    estimatedDaysMax?: number;
    isActive?: boolean;
  },
) {
  return apiRequest<AdminShippingRate>("/admin/shipping/rates", {
    method: "POST",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function updateAdminShippingRate(
  accessToken: string,
  rateId: string,
  payload: {
    zoneId?: string;
    name?: string;
    serviceCode?: string;
    calculation?: "FLAT" | "FREE";
    amount?: number;
    currencyCode?: string;
    minOrderAmount?: number | null;
    maxOrderAmount?: number | null;
    estimatedDaysMin?: number;
    estimatedDaysMax?: number;
    isActive?: boolean;
  },
) {
  return apiRequest<AdminShippingRate>(`/admin/shipping/rates/${rateId}`, {
    method: "PATCH",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function getAdminOrders(accessToken: string) {
  return apiRequest<AdminOrder[]>("/admin/orders", {
    headers: withAuth(accessToken),
  });
}

export function getAdminPayments(accessToken: string) {
  return apiRequest<AdminPayment[]>("/admin/payments", {
    headers: withAuth(accessToken),
  });
}

export function getAdminPayment(accessToken: string, paymentId: string) {
  return apiRequest<AdminPayment>(`/admin/payments/${paymentId}`, {
    headers: withAuth(accessToken),
  });
}

export function updateAdminOrderStatus(
  accessToken: string,
  orderId: string,
  payload: { status: string; reason?: string },
) {
  return apiRequest<AdminOrder>(`/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: withAuth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function decideAdminCancellationRequest(
  accessToken: string,
  requestId: string,
  payload: { status: "APPROVED" | "REJECTED"; decisionNote?: string },
) {
  return apiRequest<AdminOrder>(
    `/admin/orders/cancellation-requests/${requestId}`,
    {
      method: "PATCH",
      headers: withAuth(accessToken),
      body: JSON.stringify(payload),
    },
  );
}

export function updateAdminShipment(
  accessToken: string,
  orderId: string,
  payload: {
    status?: string;
    carrier?: string;
    service?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    estimatedDeliveryAt?: string;
  },
) {
  return apiRequest<AdminOrder["shipments"][number]>(
    `/admin/orders/${orderId}/shipment`,
    {
      method: "PATCH",
      headers: withAuth(accessToken),
      body: JSON.stringify(payload),
    },
  );
}
