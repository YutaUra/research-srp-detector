/*
  Warnings:

  - A unique constraint covering the columns `[repositoryId,path]` on the table `File` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[fileId,content]` on the table `Function` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `commitHash` to the `Repository` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Repository" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "author" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "license" TEXT,
    "url" TEXT NOT NULL,
    "commitHash" TEXT NOT NULL
);
INSERT INTO "new_Repository" ("author", "id", "license", "name", "url") SELECT "author", "id", "license", "name", "url" FROM "Repository";
DROP TABLE "Repository";
ALTER TABLE "new_Repository" RENAME TO "Repository";
CREATE UNIQUE INDEX "Repository_author_name_commitHash_key" ON "Repository"("author", "name", "commitHash");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "File_repositoryId_path_key" ON "File"("repositoryId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "Function_fileId_content_key" ON "Function"("fileId", "content");
