-- AlterTable
ALTER TABLE "queue_entries" ADD COLUMN     "loadedIntoPlayerAt" TIMESTAMP(3),
ADD COLUMN     "originPriorityRank" INTEGER,
ADD COLUMN     "originSortOrder" DECIMAL(20,8);
