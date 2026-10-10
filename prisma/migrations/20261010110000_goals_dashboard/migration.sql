CREATE TABLE "goals" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "goalType" TEXT NOT NULL DEFAULT 'OTHER',
    "targetYear" INTEGER NOT NULL,
    "targetAmount" INTEGER NOT NULL,
    "currentAmount" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "goals_targetYear_idx" ON "goals"("targetYear");

INSERT INTO "goals" ("title", "goalType", "targetYear", "targetAmount", "currentAmount", "note", "sortOrder", "createdBy", "updatedBy", "updatedAt")
VALUES
  ('Xe hơi đầu tiên - VinFast VF3', 'CAR', 2028, 250000000, 0, 'Chiếc xe đầu tiên của gia đình.', 1, 'system', 'system', CURRENT_TIMESTAMP),
  ('Nhà 2N1K OCP1', 'HOME', 2030, 2800000000, 1000000000, 'Căn hộ 2 ngủ 1 khách khu Ocean Park 1.', 2, 'system', 'system', CURRENT_TIMESTAMP),
  ('Xe thứ hai - Geely Coolray Flagship', 'CAR', 2032, 650000000, 0, 'Nâng cấp chiếc xe thứ hai khi tài chính vững hơn.', 3, 'system', 'system', CURRENT_TIMESTAMP);
