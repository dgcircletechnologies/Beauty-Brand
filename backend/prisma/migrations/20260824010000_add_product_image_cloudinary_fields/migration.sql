ALTER TABLE "ProductImage" ADD COLUMN "publicId" TEXT;
ALTER TABLE "ProductImage" ADD COLUMN "width" INTEGER;
ALTER TABLE "ProductImage" ADD COLUMN "height" INTEGER;
ALTER TABLE "ProductImage" ADD COLUMN "format" TEXT;
ALTER TABLE "ProductImage" ADD COLUMN "bytes" INTEGER;
ALTER TABLE "ProductImage" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "ProductImage_deletedAt_idx" ON "ProductImage"("deletedAt");
