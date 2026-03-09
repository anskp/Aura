/*
  Warnings:

  - You are about to drop the column `navOracle` on the `token` table. All the data in the column will be lost.
  - You are about to drop the column `porContract` on the `token` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `asset` ADD COLUMN `deploymentTxHash` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `pool` ADD COLUMN `deploymentTxHash` VARCHAR(191) NULL,
    ADD COLUMN `totalShares` DECIMAL(65, 30) NOT NULL DEFAULT 0.000000000000000000000000000000;

-- AlterTable
ALTER TABLE `token` DROP COLUMN `navOracle`,
    DROP COLUMN `porContract`,
    ADD COLUMN `deploymentTxHash` VARCHAR(191) NULL,
    ADD COLUMN `navOracleAddress` VARCHAR(191) NULL,
    ADD COLUMN `porAddress` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `investment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `poolId` INTEGER NOT NULL,
    `investorAddress` VARCHAR(191) NOT NULL,
    `amountPaid` DECIMAL(65, 30) NOT NULL,
    `sharesReceived` DECIMAL(65, 30) NOT NULL,
    `txHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Investment_txHash_key`(`txHash`),
    INDEX `Investment_poolId_fkey`(`poolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assetId` INTEGER NULL,
    `userAddress` VARCHAR(191) NOT NULL,
    `actionType` ENUM('DEPLOY_TOKEN', 'MINT_RWA', 'DEPLOY_POOL', 'DEPOSIT_COLLATERAL', 'INVEST', 'REDEEM', 'SYNC_ORACLE') NOT NULL,
    `txHash` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Transaction_txHash_key`(`txHash`),
    INDEX `Transaction_assetId_fkey`(`assetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `investment` ADD CONSTRAINT `Investment_poolId_fkey` FOREIGN KEY (`poolId`) REFERENCES `pool`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction` ADD CONSTRAINT `Transaction_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
