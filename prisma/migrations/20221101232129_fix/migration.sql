-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Repository" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "author" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "license" TEXT,
    "url" TEXT NOT NULL,
    "commitHash" TEXT
);
INSERT INTO "new_Repository" ("author", "commitHash", "id", "license", "name", "url") SELECT "author", "commitHash", "id", "license", "name", "url" FROM "Repository";
DROP TABLE "Repository";
ALTER TABLE "new_Repository" RENAME TO "Repository";
CREATE UNIQUE INDEX "Repository_author_name_commitHash_key" ON "Repository"("author", "name", "commitHash");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
