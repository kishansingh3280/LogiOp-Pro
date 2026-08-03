-- CreateTable
CREATE TABLE "SavedAddress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "placeId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'BOTH',
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SavedAddress_kind_idx" ON "SavedAddress"("kind");

-- CreateIndex
CREATE INDEX "SavedAddress_isActive_idx" ON "SavedAddress"("isActive");

-- AlterTable
ALTER TABLE "LastMileDelivery" ADD COLUMN "quotationId" TEXT;
ALTER TABLE "LastMileDelivery" ADD COLUMN "pickupContact" TEXT;
ALTER TABLE "LastMileDelivery" ADD COLUMN "pickupPhone" TEXT;
ALTER TABLE "LastMileDelivery" ADD COLUMN "dropoffContact" TEXT;
ALTER TABLE "LastMileDelivery" ADD COLUMN "dropoffPhone" TEXT;
ALTER TABLE "LastMileDelivery" ADD COLUMN "driverId" TEXT;
ALTER TABLE "LastMileDelivery" ADD COLUMN "driverName" TEXT;
ALTER TABLE "LastMileDelivery" ADD COLUMN "driverPhone" TEXT;
ALTER TABLE "LastMileDelivery" ADD COLUMN "providerStatus" TEXT;
ALTER TABLE "LastMileDelivery" ADD COLUMN "priorityFee" REAL;

-- CreateIndex
CREATE INDEX "LastMileDelivery_externalOrderId_idx" ON "LastMileDelivery"("externalOrderId");
