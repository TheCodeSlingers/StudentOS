-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "StudentImportJob" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentImportRow" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "status" "ImportRowStatus" NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "StudentImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentImportJob_batchId_idx" ON "StudentImportJob"("batchId");

-- CreateIndex
CREATE INDEX "StudentImportRow_jobId_idx" ON "StudentImportRow"("jobId");

-- AddForeignKey
ALTER TABLE "StudentImportJob" ADD CONSTRAINT "StudentImportJob_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentImportRow" ADD CONSTRAINT "StudentImportRow_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "StudentImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
