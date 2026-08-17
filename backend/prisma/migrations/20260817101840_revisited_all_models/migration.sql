/*
  Warnings:

  - You are about to drop the column `benefits` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `ingredientsText` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `personalizationEnabled` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Collection` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CollectionProduct` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryMovement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryReservation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SeoRedirect` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StoreSetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserAvoidedIngredient` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CollectionProduct" DROP CONSTRAINT "CollectionProduct_collectionId_fkey";

-- DropForeignKey
ALTER TABLE "CollectionProduct" DROP CONSTRAINT "CollectionProduct_productId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryMovement" DROP CONSTRAINT "InventoryMovement_orderId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryMovement" DROP CONSTRAINT "InventoryMovement_performedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryMovement" DROP CONSTRAINT "InventoryMovement_variantId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryReservation" DROP CONSTRAINT "InventoryReservation_orderId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryReservation" DROP CONSTRAINT "InventoryReservation_variantId_fkey";

-- DropForeignKey
ALTER TABLE "UserAvoidedIngredient" DROP CONSTRAINT "UserAvoidedIngredient_ingredientId_fkey";

-- DropForeignKey
ALTER TABLE "UserAvoidedIngredient" DROP CONSTRAINT "UserAvoidedIngredient_profileId_fkey";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "benefits",
DROP COLUMN "ingredientsText",
ADD COLUMN     "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "personalizationEnabled",
ADD COLUMN     "phone" TEXT;

-- DropTable
DROP TABLE "Collection";

-- DropTable
DROP TABLE "CollectionProduct";

-- DropTable
DROP TABLE "InventoryMovement";

-- DropTable
DROP TABLE "InventoryReservation";

-- DropTable
DROP TABLE "SeoRedirect";

-- DropTable
DROP TABLE "StoreSetting";

-- DropTable
DROP TABLE "UserAvoidedIngredient";
