-- Travel map: province visits + destination flags (household-wide)

CREATE TABLE "travel_province_visits" (
    "id" TEXT NOT NULL,
    "provinceCode" TEXT NOT NULL,
    "visitedOn" DATE NOT NULL,
    "note" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_province_visits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "travel_province_visits_provinceCode_key" ON "travel_province_visits"("provinceCode");

CREATE TABLE "travel_destinations" (
    "id" TEXT NOT NULL,
    "provinceCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "svgX" DOUBLE PRECISION NOT NULL,
    "svgY" DOUBLE PRECISION NOT NULL,
    "visitedOn" DATE NOT NULL,
    "note" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_destinations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "travel_destinations_provinceCode_idx" ON "travel_destinations"("provinceCode");

-- Split former menu key `travel` into overview + details
UPDATE "menu_permissions" SET "menuKey" = 'travel.overview' WHERE "menuKey" = 'travel';

INSERT INTO "menu_permissions" ("userId", "menuKey", "createdBy", "updatedBy", "createdAt", "updatedAt")
SELECT mp."userId", 'travel.details', mp."createdBy", mp."updatedBy", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "menu_permissions" mp
WHERE mp."menuKey" = 'travel.overview'
ON CONFLICT ("userId", "menuKey") DO NOTHING;
