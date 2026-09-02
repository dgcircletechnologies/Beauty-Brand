export const ProductStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const ReviewStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const CartStatus = {
  ACTIVE: 'ACTIVE',
  CONVERTED: 'CONVERTED',
  CHECKED_OUT: 'CHECKED_OUT',
  ABANDONED: 'ABANDONED',
} as const;

export type CartStatus = (typeof CartStatus)[keyof typeof CartStatus];

export const UserRole = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AttributeDataType = {
  TEXT: 'TEXT',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  SELECT: 'SELECT',
  MULTI_SELECT: 'MULTI_SELECT',
} as const;

export type AttributeDataType =
  (typeof AttributeDataType)[keyof typeof AttributeDataType];

export const OfferType = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED_AMOUNT: 'FIXED_AMOUNT',
  BUY_X_GET_Y: 'BUY_X_GET_Y',
} as const;

export type OfferType = (typeof OfferType)[keyof typeof OfferType];
