ALTER TABLE "RefreshToken" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "deviceLabel" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "location" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "lastUsedAt" TIMESTAMP(3);

CREATE INDEX "RefreshToken_lastUsedAt_idx" ON "RefreshToken"("lastUsedAt");
