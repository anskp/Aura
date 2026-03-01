/*
  Warnings:

  - You are about to alter the column `kycStatus` on the `user` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(1))` to `Enum(EnumId(1))`.
  - A unique constraint covering the columns `[sumsubApplicantId]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `wallet` DROP FOREIGN KEY `Wallet_userId_fkey`;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `kycLevel` VARCHAR(191) NULL,
    ADD COLUMN `kycRejectionReason` VARCHAR(191) NULL,
    ADD COLUMN `kycReviewedAt` DATETIME(3) NULL,
    ADD COLUMN `kycSnapshot` JSON NULL,
    ADD COLUMN `sumsubApplicantId` VARCHAR(191) NULL,
    MODIFY `kycStatus` ENUM('NOT_STARTED', 'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'NOT_STARTED';

-- CreateIndex
CREATE UNIQUE INDEX `user_sumsubApplicantId_key` ON `user`(`sumsubApplicantId`);

-- AddForeignKey
ALTER TABLE `wallet` ADD CONSTRAINT `wallet_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `wallet` RENAME INDEX `Wallet_address_chain_key` TO `wallet_address_chain_key`;
