-- AlterTable
ALTER TABLE "agents" ADD COLUMN "fallbacks" TEXT DEFAULT '[]';

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_stations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_stations" ("color", "created_at", "description", "icon", "id", "name", "sort_order", "updated_at") SELECT "color", "created_at", "description", "icon", "id", "name", "sort_order", "updated_at" FROM "stations";
DROP TABLE "stations";
ALTER TABLE "new_stations" RENAME TO "stations";
CREATE UNIQUE INDEX "stations_name_key" ON "stations"("name");
CREATE INDEX "stations_sort_order_idx" ON "stations"("sort_order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
