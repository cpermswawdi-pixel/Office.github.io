-- AlterTable
ALTER TABLE `products` ADD COLUMN `unitCatalogId` INTEGER NULL;

-- AlterTable
ALTER TABLE `roles` MODIFY `name` ENUM('SUPER_ADMIN', 'ADMIN', 'STAFF', 'WAREHOUSE_STAFF', 'USER') NOT NULL;

-- AlterTable
ALTER TABLE `stock_movements` ADD COLUMN `requisitionItemId` INTEGER NULL,
    ADD COLUMN `unitCost` DECIMAL(14, 2) NULL;

-- CreateTable
CREATE TABLE `units` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(60) NOT NULL,
    `abbreviation` VARCHAR(20) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `units_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `requisitions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestNumber` VARCHAR(40) NOT NULL,
    `requesterId` INTEGER NOT NULL,
    `departmentId` INTEGER NOT NULL,
    `purpose` VARCHAR(500) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED') NOT NULL DEFAULT 'PENDING',
    `decisionNote` VARCHAR(500) NULL,
    `decidedById` INTEGER NULL,
    `decidedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `requisitions_requestNumber_key`(`requestNumber`),
    INDEX `requisitions_requesterId_createdAt_idx`(`requesterId`, `createdAt`),
    INDEX `requisitions_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `requisitions_departmentId_idx`(`departmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `requisition_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requisitionId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `requisition_items_productId_idx`(`productId`),
    UNIQUE INDEX `requisition_items_requisitionId_productId_key`(`requisitionId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `requisitionId` INTEGER NULL,
    `type` ENUM('REQUISITION_CREATED', 'REQUISITION_APPROVED', 'REQUISITION_REJECTED', 'REQUISITION_FULFILLED') NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `products_unitCatalogId_idx` ON `products`(`unitCatalogId`);

-- CreateIndex
CREATE UNIQUE INDEX `stock_movements_requisitionItemId_key` ON `stock_movements`(`requisitionItemId`);

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_unitCatalogId_fkey` FOREIGN KEY (`unitCatalogId`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requisitions` ADD CONSTRAINT `requisitions_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requisitions` ADD CONSTRAINT `requisitions_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requisitions` ADD CONSTRAINT `requisitions_decidedById_fkey` FOREIGN KEY (`decidedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requisition_items` ADD CONSTRAINT `requisition_items_requisitionId_fkey` FOREIGN KEY (`requisitionId`) REFERENCES `requisitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requisition_items` ADD CONSTRAINT `requisition_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_requisitionId_fkey` FOREIGN KEY (`requisitionId`) REFERENCES `requisitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_requisitionItemId_fkey` FOREIGN KEY (`requisitionItemId`) REFERENCES `requisition_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
