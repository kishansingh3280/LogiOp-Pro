-- Party street address for last-mile dropoff
ALTER TABLE "Party" ADD COLUMN "address" TEXT;

-- Lalamove / last-mile deliveries
CREATE TABLE "LastMileDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL DEFAULT 'LALAMOVE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "externalOrderId" TEXT,
    "quoteAmount" REAL,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "vehicleType" TEXT,
    "trackingUrl" TEXT,
    "pickupAddress" TEXT,
    "dropoffAddress" TEXT,
    "notes" TEXT,
    "bookedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "pickupWarehouseId" TEXT,
    "customerId" TEXT,
    "shipmentId" TEXT,
    CONSTRAINT "LastMileDelivery_pickupWarehouseId_fkey" FOREIGN KEY ("pickupWarehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LastMileDelivery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Party" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "LastMileDeliveryBag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lastMileDeliveryId" TEXT NOT NULL,
    "bagId" TEXT NOT NULL,
    CONSTRAINT "LastMileDeliveryBag_lastMileDeliveryId_fkey" FOREIGN KEY ("lastMileDeliveryId") REFERENCES "LastMileDelivery" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LastMileDeliveryBag_bagId_fkey" FOREIGN KEY ("bagId") REFERENCES "Bag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LastMileDeliveryBag_lastMileDeliveryId_bagId_key" ON "LastMileDeliveryBag"("lastMileDeliveryId", "bagId");
CREATE INDEX "LastMileDelivery_status_idx" ON "LastMileDelivery"("status");
CREATE INDEX "LastMileDelivery_customerId_idx" ON "LastMileDelivery"("customerId");
CREATE INDEX "LastMileDelivery_shipmentId_idx" ON "LastMileDelivery"("shipmentId");
