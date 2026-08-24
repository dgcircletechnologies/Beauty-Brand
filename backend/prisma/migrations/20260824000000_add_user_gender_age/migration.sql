-- CreateEnum
CREATE TYPE "UserGender" AS ENUM ('FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "gender" "UserGender",
ADD COLUMN "age" INTEGER;
