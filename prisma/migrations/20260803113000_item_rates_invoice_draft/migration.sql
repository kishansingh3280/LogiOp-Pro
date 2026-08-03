-- Optional purchase / sale rates on catalog items (P&L tracking)
ALTER TABLE "CatalogItem" ADD COLUMN "purchaseRate" REAL;
ALTER TABLE "CatalogItem" ADD COLUMN "saleRate" REAL;

-- New invoices default to Draft (SQLite has no ALTER DEFAULT easily; Prisma client uses schema default)
