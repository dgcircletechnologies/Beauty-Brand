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

export type AdminProductCategory = {
  productId: string;
  categoryId: string;
  isPrimary: boolean;
  sortOrder: number;
  category: AdminCategory;
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
};

export type CreateAdminProductVariantPayload = {
  sku: string;
  price: number;
  compareAtPrice?: number;
  stockQuantity?: number;
  isActive?: boolean;
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

export function getAdminProduct(accessToken: string, productId: string) {
  return apiRequest<AdminProductDetail>(`/admin/products/${productId}`, {
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
