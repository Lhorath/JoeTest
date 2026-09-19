-- AlterTable
ALTER TABLE "submission_upgrades" ALTER COLUMN "previousTierSnapshotId" DROP NOT NULL,
ALTER COLUMN "originalPaymentId" DROP NOT NULL;
