-- CreateEnum
CREATE TYPE "ApiIdempotencyStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "api_idempotency_records" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "operationPath" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "status" "ApiIdempotencyStatus" NOT NULL DEFAULT 'PROCESSING',
    "responseData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_idempotency_records_userId_idempotencyKey_operationPa_key" ON "api_idempotency_records"("userId", "idempotencyKey", "operationPath");

-- AddForeignKey
ALTER TABLE "api_idempotency_records" ADD CONSTRAINT "api_idempotency_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
