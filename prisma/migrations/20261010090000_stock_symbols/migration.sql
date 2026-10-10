CREATE TABLE "stock_symbols" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_symbols_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_symbols_symbol_key" ON "stock_symbols"("symbol");

INSERT INTO "stock_symbols" ("symbol", "createdBy", "updatedBy", "updatedAt")
VALUES
  ('MBB', 'system', 'system', CURRENT_TIMESTAMP),
  ('HPG', 'system', 'system', CURRENT_TIMESTAMP),
  ('TCB', 'system', 'system', CURRENT_TIMESTAMP),
  ('BID', 'system', 'system', CURRENT_TIMESTAMP),
  ('CTG', 'system', 'system', CURRENT_TIMESTAMP)
ON CONFLICT ("symbol") DO NOTHING;
