-- CreateTable
CREATE TABLE `Asset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('ART', 'METAL', 'REAL_ESTATE', 'CARBON', 'OTHER') NOT NULL,
    `valuation` DECIMAL(65, 30) NOT NULL,
    `aiPricing` DECIMAL(65, 30) NULL,
    `aiReasoning` TEXT NULL,
    `nav` DECIMAL(65, 30) NULL,
    `por` DECIMAL(65, 30) NULL,
    `tokenAddress` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'TOKENIZED', 'LISTED', 'ONBOARDED') NOT NULL DEFAULT 'PENDING',
    `companyName` VARCHAR(191) NULL,
    `companyRegNumber` VARCHAR(191) NULL,
    `ownerId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Token` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `assetId` INTEGER NOT NULL,
    `navOracle` VARCHAR(191) NULL,
    `porContract` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Token_address_key`(`address`),
    UNIQUE INDEX `Token_assetId_key`(`assetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pool` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `address` VARCHAR(191) NOT NULL,
    `assetId` INTEGER NOT NULL,
    `stablecoinAddress` VARCHAR(191) NOT NULL,
    `totalLiquidity` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Pool_address_key`(`address`),
    UNIQUE INDEX `Pool_assetId_key`(`assetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Asset` ADD CONSTRAINT `Asset_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Token` ADD CONSTRAINT `Token_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `Asset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pool` ADD CONSTRAINT `Pool_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `Asset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
