ALTER TABLE "Warehouse" ADD COLUMN "latitude" REAL;
ALTER TABLE "Warehouse" ADD COLUMN "longitude" REAL;
ALTER TABLE "Warehouse" ADD COLUMN "placeId" TEXT;

ALTER TABLE "Party" ADD COLUMN "latitude" REAL;
ALTER TABLE "Party" ADD COLUMN "longitude" REAL;
ALTER TABLE "Party" ADD COLUMN "placeId" TEXT;

ALTER TABLE "LastMileDelivery" ADD COLUMN "pickupLat" REAL;
ALTER TABLE "LastMileDelivery" ADD COLUMN "pickupLng" REAL;
ALTER TABLE "LastMileDelivery" ADD COLUMN "dropoffLat" REAL;
ALTER TABLE "LastMileDelivery" ADD COLUMN "dropoffLng" REAL;
