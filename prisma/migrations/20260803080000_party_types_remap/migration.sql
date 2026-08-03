-- Remap legacy party types to the new business categories
UPDATE "Party" SET "type" = 'LOGISTIC_CUSTOMER' WHERE "type" IN ('CUSTOMER_IN', 'CUSTOMER_TH');
UPDATE "Party" SET "type" = 'CARRIER' WHERE "type" = 'CARRY_PERSON';
UPDATE "Party" SET "type" = 'TRANSPORTER' WHERE "type" = 'AGENT';
UPDATE "Party" SET "type" = 'INDIVIDUAL' WHERE "type" = 'OTHER';
