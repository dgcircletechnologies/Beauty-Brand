-- CreateEnum
CREATE TYPE "HairProfileType" AS ENUM ('TEXTURE', 'CONDITION', 'SCALP_TYPE');

-- CreateTable
CREATE TABLE "AgeGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgeGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeOption" (
    "id" TEXT NOT NULL,
    "attributeDefinitionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttributeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audience" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Audience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Benefit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Benefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryClosure" (
    "ancestorId" TEXT NOT NULL,
    "descendantId" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,

    CONSTRAINT "CategoryClosure_pkey" PRIMARY KEY ("ancestorId","descendantId")
);

-- CreateTable
CREATE TABLE "CollectionProduct" (
    "collectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionProduct_pkey" PRIMARY KEY ("collectionId","productId")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concern" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Concern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HairProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" "HairProfileType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HairProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "inciName" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAgeGroup" (
    "productId" TEXT NOT NULL,
    "ageGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAgeGroup_pkey" PRIMARY KEY ("productId","ageGroupId")
);

-- CreateTable
CREATE TABLE "ProductApplicationArea" (
    "productId" TEXT NOT NULL,
    "applicationAreaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductApplicationArea_pkey" PRIMARY KEY ("productId","applicationAreaId")
);

-- CreateTable
CREATE TABLE "ProductAttributeValue" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "optionId" TEXT,
    "textValue" TEXT,
    "numberValue" DECIMAL(12,4),
    "booleanValue" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAudience" (
    "productId" TEXT NOT NULL,
    "audienceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAudience_pkey" PRIMARY KEY ("productId","audienceId")
);

-- CreateTable
CREATE TABLE "ProductBenefit" (
    "productId" TEXT NOT NULL,
    "benefitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBenefit_pkey" PRIMARY KEY ("productId","benefitId")
);

-- CreateTable
CREATE TABLE "ProductConcern" (
    "productId" TEXT NOT NULL,
    "concernId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductConcern_pkey" PRIMARY KEY ("productId","concernId")
);

-- CreateTable
CREATE TABLE "ProductHairProfile" (
    "productId" TEXT NOT NULL,
    "hairProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductHairProfile_pkey" PRIMARY KEY ("productId","hairProfileId")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductIngredient" (
    "productId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isKeyIngredient" BOOLEAN NOT NULL DEFAULT false,
    "concentrationPercent" DECIMAL(5,2),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductIngredient_pkey" PRIMARY KEY ("productId","ingredientId")
);

-- CreateTable
CREATE TABLE "ProductSkinType" (
    "productId" TEXT NOT NULL,
    "skinTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSkinType_pkey" PRIMARY KEY ("productId","skinTypeId")
);

-- CreateTable
CREATE TABLE "ProductTag" (
    "productId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("productId","tagId")
);

-- CreateTable
CREATE TABLE "SkinType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkinType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantAttributeValue" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "optionId" TEXT,
    "textValue" TEXT,
    "numberValue" DECIMAL(12,4),
    "booleanValue" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariantAttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgeGroup_slug_key" ON "AgeGroup"("slug");

-- CreateIndex
CREATE INDEX "AgeGroup_name_idx" ON "AgeGroup"("name");

-- CreateIndex
CREATE INDEX "AgeGroup_isActive_idx" ON "AgeGroup"("isActive");

-- CreateIndex
CREATE INDEX "AgeGroup_sortOrder_idx" ON "AgeGroup"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationArea_slug_key" ON "ApplicationArea"("slug");

-- CreateIndex
CREATE INDEX "ApplicationArea_name_idx" ON "ApplicationArea"("name");

-- CreateIndex
CREATE INDEX "ApplicationArea_isActive_idx" ON "ApplicationArea"("isActive");

-- CreateIndex
CREATE INDEX "ApplicationArea_sortOrder_idx" ON "ApplicationArea"("sortOrder");

-- CreateIndex
CREATE INDEX "AttributeOption_attributeDefinitionId_idx" ON "AttributeOption"("attributeDefinitionId");

-- CreateIndex
CREATE INDEX "AttributeOption_attributeDefinitionId_isActive_idx" ON "AttributeOption"("attributeDefinitionId", "isActive");

-- CreateIndex
CREATE INDEX "AttributeOption_attributeDefinitionId_sortOrder_idx" ON "AttributeOption"("attributeDefinitionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeOption_attributeDefinitionId_value_key" ON "AttributeOption"("attributeDefinitionId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Audience_slug_key" ON "Audience"("slug");

-- CreateIndex
CREATE INDEX "Audience_name_idx" ON "Audience"("name");

-- CreateIndex
CREATE INDEX "Audience_isActive_idx" ON "Audience"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Benefit_slug_key" ON "Benefit"("slug");

-- CreateIndex
CREATE INDEX "Benefit_name_idx" ON "Benefit"("name");

-- CreateIndex
CREATE INDEX "Benefit_isActive_idx" ON "Benefit"("isActive");

-- CreateIndex
CREATE INDEX "Benefit_sortOrder_idx" ON "Benefit"("sortOrder");

-- CreateIndex
CREATE INDEX "CategoryClosure_ancestorId_depth_idx" ON "CategoryClosure"("ancestorId", "depth");

-- CreateIndex
CREATE INDEX "CategoryClosure_descendantId_depth_idx" ON "CategoryClosure"("descendantId", "depth");

-- CreateIndex
CREATE INDEX "CollectionProduct_productId_idx" ON "CollectionProduct"("productId");

-- CreateIndex
CREATE INDEX "CollectionProduct_collectionId_sortOrder_idx" ON "CollectionProduct"("collectionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "Collection_isActive_idx" ON "Collection"("isActive");

-- CreateIndex
CREATE INDEX "Collection_sortOrder_idx" ON "Collection"("sortOrder");

-- CreateIndex
CREATE INDEX "Collection_startsAt_endsAt_idx" ON "Collection"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Concern_slug_key" ON "Concern"("slug");

-- CreateIndex
CREATE INDEX "Concern_name_idx" ON "Concern"("name");

-- CreateIndex
CREATE INDEX "Concern_isActive_idx" ON "Concern"("isActive");

-- CreateIndex
CREATE INDEX "Concern_sortOrder_idx" ON "Concern"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "HairProfile_slug_key" ON "HairProfile"("slug");

-- CreateIndex
CREATE INDEX "HairProfile_type_idx" ON "HairProfile"("type");

-- CreateIndex
CREATE INDEX "HairProfile_name_idx" ON "HairProfile"("name");

-- CreateIndex
CREATE INDEX "HairProfile_isActive_idx" ON "HairProfile"("isActive");

-- CreateIndex
CREATE INDEX "HairProfile_type_sortOrder_idx" ON "HairProfile"("type", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_slug_key" ON "Ingredient"("slug");

-- CreateIndex
CREATE INDEX "Ingredient_name_idx" ON "Ingredient"("name");

-- CreateIndex
CREATE INDEX "Ingredient_isActive_idx" ON "Ingredient"("isActive");

-- CreateIndex
CREATE INDEX "ProductAgeGroup_ageGroupId_idx" ON "ProductAgeGroup"("ageGroupId");

-- CreateIndex
CREATE INDEX "ProductApplicationArea_applicationAreaId_idx" ON "ProductApplicationArea"("applicationAreaId");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_productId_idx" ON "ProductAttributeValue"("productId");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_attributeId_idx" ON "ProductAttributeValue"("attributeId");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_optionId_idx" ON "ProductAttributeValue"("optionId");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_productId_attributeId_idx" ON "ProductAttributeValue"("productId", "attributeId");

-- CreateIndex
CREATE INDEX "ProductAudience_audienceId_idx" ON "ProductAudience"("audienceId");

-- CreateIndex
CREATE INDEX "ProductBenefit_benefitId_idx" ON "ProductBenefit"("benefitId");

-- CreateIndex
CREATE INDEX "ProductConcern_concernId_idx" ON "ProductConcern"("concernId");

-- CreateIndex
CREATE INDEX "ProductHairProfile_hairProfileId_idx" ON "ProductHairProfile"("hairProfileId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "ProductImage_variantId_idx" ON "ProductImage"("variantId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductImage_variantId_sortOrder_idx" ON "ProductImage"("variantId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductIngredient_productId_sortOrder_idx" ON "ProductIngredient"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductIngredient_ingredientId_idx" ON "ProductIngredient"("ingredientId");

-- CreateIndex
CREATE INDEX "ProductIngredient_ingredientId_productId_idx" ON "ProductIngredient"("ingredientId", "productId");

-- CreateIndex
CREATE INDEX "ProductIngredient_productId_isKeyIngredient_idx" ON "ProductIngredient"("productId", "isKeyIngredient");

-- CreateIndex
CREATE INDEX "ProductSkinType_skinTypeId_idx" ON "ProductSkinType"("skinTypeId");

-- CreateIndex
CREATE INDEX "ProductTag_tagId_idx" ON "ProductTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "SkinType_slug_key" ON "SkinType"("slug");

-- CreateIndex
CREATE INDEX "SkinType_name_idx" ON "SkinType"("name");

-- CreateIndex
CREATE INDEX "SkinType_isActive_idx" ON "SkinType"("isActive");

-- CreateIndex
CREATE INDEX "SkinType_sortOrder_idx" ON "SkinType"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "Tag_name_idx" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_isActive_idx" ON "Tag"("isActive");

-- CreateIndex
CREATE INDEX "Tag_sortOrder_idx" ON "Tag"("sortOrder");

-- CreateIndex
CREATE INDEX "VariantAttributeValue_variantId_idx" ON "VariantAttributeValue"("variantId");

-- CreateIndex
CREATE INDEX "VariantAttributeValue_attributeId_idx" ON "VariantAttributeValue"("attributeId");

-- CreateIndex
CREATE INDEX "VariantAttributeValue_optionId_idx" ON "VariantAttributeValue"("optionId");

-- CreateIndex
CREATE INDEX "VariantAttributeValue_variantId_attributeId_idx" ON "VariantAttributeValue"("variantId", "attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "VariantAttributeValue_variantId_attributeId_optionId_key" ON "VariantAttributeValue"("variantId", "attributeId", "optionId");

-- AddForeignKey
ALTER TABLE "AttributeOption" ADD CONSTRAINT "AttributeOption_attributeDefinitionId_fkey" FOREIGN KEY ("attributeDefinitionId") REFERENCES "AttributeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryClosure" ADD CONSTRAINT "CategoryClosure_ancestorId_fkey" FOREIGN KEY ("ancestorId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryClosure" ADD CONSTRAINT "CategoryClosure_descendantId_fkey" FOREIGN KEY ("descendantId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionProduct" ADD CONSTRAINT "CollectionProduct_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionProduct" ADD CONSTRAINT "CollectionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAgeGroup" ADD CONSTRAINT "ProductAgeGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAgeGroup" ADD CONSTRAINT "ProductAgeGroup_ageGroupId_fkey" FOREIGN KEY ("ageGroupId") REFERENCES "AgeGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductApplicationArea" ADD CONSTRAINT "ProductApplicationArea_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductApplicationArea" ADD CONSTRAINT "ProductApplicationArea_applicationAreaId_fkey" FOREIGN KEY ("applicationAreaId") REFERENCES "ApplicationArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "AttributeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "AttributeOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAudience" ADD CONSTRAINT "ProductAudience_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAudience" ADD CONSTRAINT "ProductAudience_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBenefit" ADD CONSTRAINT "ProductBenefit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBenefit" ADD CONSTRAINT "ProductBenefit_benefitId_fkey" FOREIGN KEY ("benefitId") REFERENCES "Benefit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductConcern" ADD CONSTRAINT "ProductConcern_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductConcern" ADD CONSTRAINT "ProductConcern_concernId_fkey" FOREIGN KEY ("concernId") REFERENCES "Concern"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductHairProfile" ADD CONSTRAINT "ProductHairProfile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductHairProfile" ADD CONSTRAINT "ProductHairProfile_hairProfileId_fkey" FOREIGN KEY ("hairProfileId") REFERENCES "HairProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductIngredient" ADD CONSTRAINT "ProductIngredient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductIngredient" ADD CONSTRAINT "ProductIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSkinType" ADD CONSTRAINT "ProductSkinType_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSkinType" ADD CONSTRAINT "ProductSkinType_skinTypeId_fkey" FOREIGN KEY ("skinTypeId") REFERENCES "SkinType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantAttributeValue" ADD CONSTRAINT "VariantAttributeValue_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantAttributeValue" ADD CONSTRAINT "VariantAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "AttributeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantAttributeValue" ADD CONSTRAINT "VariantAttributeValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "AttributeOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
