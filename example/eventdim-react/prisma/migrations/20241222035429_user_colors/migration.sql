/*
  Warnings:

  - You are about to drop the column `lastLogin` on the `User` table. All the data in the column will be lost.
  - Added the required column `color` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiry` to the `UserSession` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Colors" AS ENUM ('red', 'rose', 'orange', 'green', 'blue', 'yellow', 'violet');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "lastLogin",
ADD COLUMN     "color" "Colors" NOT NULL;

-- AlterTable
ALTER TABLE "UserSession" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expiry" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
