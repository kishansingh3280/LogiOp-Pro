-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "city" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "exchangeRate" REAL,
    "quoteMode" TEXT NOT NULL DEFAULT 'INR_PER_THB',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'INR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "carryRatePerKg" REAL
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partyId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT,
    "entryDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fxRate" REAL,
    "fxAmount" REAL,
    "fxCurrency" TEXT,
    "transportAssignmentId" TEXT,
    "isAutoSynced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LedgerEntry_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LedgerEntry_transportAssignmentId_fkey" FOREIGN KEY ("transportAssignmentId") REFERENCES "TransportAssignment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ledgerEntryId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillAttachment_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotNumber" TEXT NOT NULL,
    "batchNumber" TEXT,
    "direction" TEXT NOT NULL,
    "originWarehouseId" TEXT,
    "destWarehouseId" TEXT,
    "notes" TEXT,
    "shipDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Shipment_originWarehouseId_fkey" FOREIGN KEY ("originWarehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Shipment_destWarehouseId_fkey" FOREIGN KEY ("destWarehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bagNumber" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "customerId" TEXT,
    "warehouseId" TEXT,
    "weightKg" REAL,
    "description" TEXT,
    "contents" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "deliveredAt" DATETIME,
    "arrivedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bag_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Bag_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Party" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bag_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransportAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL,
    "carrierId" TEXT,
    "carrierName" TEXT,
    "assignedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "departureDate" DATETIME,
    "arrivalDate" DATETIME,
    "ratePerKg" REAL,
    "totalWeightKg" REAL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "trackingRef" TEXT,
    "notes" TEXT,
    "deliveredToCustomer" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TransportAssignment_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Party" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransportAssignmentBag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transportAssignmentId" TEXT NOT NULL,
    "bagId" TEXT NOT NULL,
    CONSTRAINT "TransportAssignmentBag_transportAssignmentId_fkey" FOREIGN KEY ("transportAssignmentId") REFERENCES "TransportAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransportAssignmentBag_bagId_fkey" FOREIGN KEY ("bagId") REFERENCES "Bag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "LedgerEntry_partyId_idx" ON "LedgerEntry"("partyId");

-- CreateIndex
CREATE INDEX "LedgerEntry_entryDate_idx" ON "LedgerEntry"("entryDate");

-- CreateIndex
CREATE INDEX "LedgerEntry_currency_idx" ON "LedgerEntry"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_lotNumber_key" ON "Shipment"("lotNumber");

-- CreateIndex
CREATE INDEX "Shipment_lotNumber_idx" ON "Shipment"("lotNumber");

-- CreateIndex
CREATE INDEX "Shipment_batchNumber_idx" ON "Shipment"("batchNumber");

-- CreateIndex
CREATE INDEX "Bag_status_idx" ON "Bag"("status");

-- CreateIndex
CREATE INDEX "Bag_bagNumber_idx" ON "Bag"("bagNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Bag_shipmentId_bagNumber_key" ON "Bag"("shipmentId", "bagNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TransportAssignmentBag_transportAssignmentId_bagId_key" ON "TransportAssignmentBag"("transportAssignmentId", "bagId");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_key_key" ON "AppSetting"("key");
