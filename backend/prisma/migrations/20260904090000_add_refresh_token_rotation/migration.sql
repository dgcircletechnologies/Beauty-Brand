ALTER TABLE "RefreshToken" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "jti" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "replacedAt" TIMESTAMP(3);
ALTER TABLE "RefreshToken" ADD COLUMN "replacedByTokenId" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "reusedAt" TIMESTAMP(3);

UPDATE "RefreshToken" SET "sessionId" = "id" WHERE "sessionId" IS NULL;

ALTER TABLE "RefreshToken" ALTER COLUMN "sessionId" SET NOT NULL;

CREATE UNIQUE INDEX "RefreshToken_jti_key" ON "RefreshToken"("jti");
CREATE INDEX "RefreshToken_userId_sessionId_idx" ON "RefreshToken"("userId", "sessionId");
CREATE INDEX "RefreshToken_replacedAt_idx" ON "RefreshToken"("replacedAt");
CREATE INDEX "RefreshToken_reusedAt_idx" ON "RefreshToken"("reusedAt");
