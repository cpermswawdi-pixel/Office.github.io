/*
  Warnings:

  - You are about to alter the column `sku` on the `products` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(80)`.
  - You are about to alter the column `barcode` on the `products` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(100)`.
  - You are about to alter the column `unit` on the `products` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(30)`.
  - You are about to alter the column `requesterName` on the `stock_movements` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(120)`.

*/
-- AlterTable
ALTER TABLE `products` MODIFY `sku` VARCHAR(80) NOT NULL,
    MODIFY `barcode` VARCHAR(100) NULL,
    MODIFY `name` VARCHAR(200) NOT NULL,
    MODIFY `unit` VARCHAR(30) NOT NULL DEFAULT 'ชิ้น',
    MODIFY `imageUrl` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `stock_movements` MODIFY `requesterName` VARCHAR(120) NULL,
    MODIFY `purpose` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `suppliers` MODIFY `email` VARCHAR(254) NULL,
    MODIFY `address` TEXT NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `email` VARCHAR(254) NOT NULL;
