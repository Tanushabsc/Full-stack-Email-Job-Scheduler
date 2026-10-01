/*
  Warnings:

  - You are about to drop the column `minDelayMs` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledAt` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `to` on the `Email` table. All the data in the column will be lost.
  - Added the required column `body` to the `Campaign` table without a default value. This is not possible if the table is not empty.
  - Added the required column `delayMs` to the `Campaign` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `Campaign` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject` to the `Campaign` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipient` to the `Email` table without a default value. This is not possible if the table is not empty.
  - Made the column `campaignId` on table `Email` required. This step will fail if there are existing NULL values in that column.
  - Made the column `senderId` on table `Email` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `Sender` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Email" DROP CONSTRAINT "Email_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "Email" DROP CONSTRAINT "Email_senderId_fkey";

-- DropIndex
DROP INDEX "Campaign_scheduledAt_idx";

-- DropIndex
DROP INDEX "Email_to_idx";

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "minDelayMs",
DROP COLUMN "name",
DROP COLUMN "scheduledAt",
ADD COLUMN     "body" TEXT NOT NULL,
ADD COLUMN     "delayMs" INTEGER NOT NULL,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "subject" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Email" DROP COLUMN "to",
ADD COLUMN     "recipient" TEXT NOT NULL,
ALTER COLUMN "campaignId" SET NOT NULL,
ALTER COLUMN "senderId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Sender" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "SlackConnection" ADD COLUMN     "channelId" TEXT;

-- CreateIndex
CREATE INDEX "Campaign_startTime_idx" ON "Campaign"("startTime");

-- CreateIndex
CREATE INDEX "Email_senderId_idx" ON "Email"("senderId");

-- CreateIndex
CREATE INDEX "Email_recipient_idx" ON "Email"("recipient");

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Sender"("id") ON DELETE CASCADE ON UPDATE CASCADE;
