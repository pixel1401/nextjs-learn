/*
  Warnings:

  - You are about to drop the column `customerId` on the `invoices` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_customerId_fkey";

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "customerId";
