-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'BUY_X_GET_Y');

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "OfferType" NOT NULL,
    "value" DECIMAL(10,2),
    "maxDiscountAmount" DECIMAL(10,2),
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferTarget" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "productId" TEXT,
    "categoryId" TEXT,
    "variantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferBuyXGetY" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "buyQuantity" INTEGER NOT NULL,
    "getQuantity" INTEGER NOT NULL,
    "rewardProductId" TEXT,
    "rewardVariantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferBuyXGetY_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Offer_type_idx" ON "Offer"("type");

-- CreateIndex
CREATE INDEX "Offer_isActive_idx" ON "Offer"("isActive");

-- CreateIndex
CREATE INDEX "Offer_startAt_idx" ON "Offer"("startAt");

-- CreateIndex
CREATE INDEX "Offer_endAt_idx" ON "Offer"("endAt");

-- CreateIndex
CREATE INDEX "Offer_priority_idx" ON "Offer"("priority");

-- CreateIndex
CREATE INDEX "Offer_isActive_startAt_endAt_idx" ON "Offer"("isActive", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "OfferTarget_productId_idx" ON "OfferTarget"("productId");

-- CreateIndex
CREATE INDEX "OfferTarget_categoryId_idx" ON "OfferTarget"("categoryId");

-- CreateIndex
CREATE INDEX "OfferTarget_variantId_idx" ON "OfferTarget"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferTarget_offerId_productId_key" ON "OfferTarget"("offerId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferTarget_offerId_categoryId_key" ON "OfferTarget"("offerId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferTarget_offerId_variantId_key" ON "OfferTarget"("offerId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferBuyXGetY_offerId_key" ON "OfferBuyXGetY"("offerId");

-- CreateIndex
CREATE INDEX "OfferBuyXGetY_rewardProductId_idx" ON "OfferBuyXGetY"("rewardProductId");

-- CreateIndex
CREATE INDEX "OfferBuyXGetY_rewardVariantId_idx" ON "OfferBuyXGetY"("rewardVariantId");

-- AddForeignKey
ALTER TABLE "OfferTarget" ADD CONSTRAINT "OfferTarget_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferTarget" ADD CONSTRAINT "OfferTarget_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferTarget" ADD CONSTRAINT "OfferTarget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferTarget" ADD CONSTRAINT "OfferTarget_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferBuyXGetY" ADD CONSTRAINT "OfferBuyXGetY_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferBuyXGetY" ADD CONSTRAINT "OfferBuyXGetY_rewardProductId_fkey" FOREIGN KEY ("rewardProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferBuyXGetY" ADD CONSTRAINT "OfferBuyXGetY_rewardVariantId_fkey" FOREIGN KEY ("rewardVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
