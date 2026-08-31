import type { ProductMetadataResource } from "@/lib/api/admin";

export type ProductMetadataConfig = {
  resource: ProductMetadataResource;
  singularLabel: string;
  pluralLabel: string;
  description: string;
};

export const productMetadataConfigs: ProductMetadataConfig[] = [
  {
    resource: "ingredients",
    singularLabel: "Ingredient",
    pluralLabel: "Ingredients",
    description: "INCI names, benefits, warnings, and ingredient references.",
  },
  {
    resource: "skin-types",
    singularLabel: "Skin Type",
    pluralLabel: "Skin Types",
    description: "Skin suitability values like oily, dry, sensitive, and more.",
  },
  {
    resource: "age-groups",
    singularLabel: "Age Group",
    pluralLabel: "Age Groups",
    description: "Age ranges used for recommendations and filtering.",
  },
  {
    resource: "audiences",
    singularLabel: "Audience",
    pluralLabel: "Audiences",
    description: "Audience tags like women, men, unisex, kids, and more.",
  },
  {
    resource: "hair-profiles",
    singularLabel: "Hair Profile",
    pluralLabel: "Hair Profiles",
    description: "Hair and scalp suitability values.",
  },
  {
    resource: "concerns",
    singularLabel: "Concern",
    pluralLabel: "Concerns",
    description: "Customer concerns such as acne, dullness, dryness, and more.",
  },
  {
    resource: "benefits",
    singularLabel: "Benefit",
    pluralLabel: "Benefits",
    description: "Reusable benefit claims for product discovery.",
  },
  {
    resource: "tags",
    singularLabel: "Tag",
    pluralLabel: "Tags",
    description: "Campaign labels such as bestseller, new launch, and offers.",
  },
];

export function getProductMetadataConfig(resource: string) {
  return productMetadataConfigs.find((config) => config.resource === resource);
}
