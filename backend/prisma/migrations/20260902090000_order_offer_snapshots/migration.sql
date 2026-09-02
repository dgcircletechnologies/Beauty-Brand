ALTER TABLE "public"."Order"
ADD COLUMN "rewardSavings" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "public"."OrderItem"
ADD COLUMN "unitDiscountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "appliedOfferId" TEXT,
ADD COLUMN "appliedOfferName" TEXT,
ADD COLUMN "appliedOfferType" "public"."OfferType",
ADD COLUMN "appliedOfferValue" DECIMAL(10,2),
ADD COLUMN "appliedOfferMaxDiscountAmount" DECIMAL(10,2),
ADD COLUMN "isOfferReward" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sourceOfferId" TEXT,
ADD COLUMN "sourceOrderItemId" TEXT;

CREATE INDEX "OrderItem_appliedOfferId_idx" ON "public"."OrderItem"("appliedOfferId");
CREATE INDEX "OrderItem_sourceOfferId_idx" ON "public"."OrderItem"("sourceOfferId");
CREATE INDEX "OrderItem_sourceOrderItemId_idx" ON "public"."OrderItem"("sourceOrderItemId");
