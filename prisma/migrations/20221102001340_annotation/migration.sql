-- CreateTable
CREATE TABLE "Annotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "functionId" TEXT NOT NULL,
    "isFulfillSRP" BOOLEAN NOT NULL,
    CONSTRAINT "Annotation_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "Function" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Annotation_functionId_key" ON "Annotation"("functionId");
