-- CreateTable
CREATE TABLE "DriverRefreshToken" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverRefreshToken_tokenHash_key" ON "DriverRefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "DriverRefreshToken_driverId_idx" ON "DriverRefreshToken"("driverId");

-- AddForeignKey
ALTER TABLE "DriverRefreshToken" ADD CONSTRAINT "DriverRefreshToken_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "VehicleFueling" ADD COLUMN     "offlineClientId" TEXT,
ADD COLUMN     "data_sincronizacao" TIMESTAMP(3);

-- Backfill sync timestamp for existing rows
UPDATE "VehicleFueling" SET "data_sincronizacao" = "createdAt" WHERE "data_sincronizacao" IS NULL;

-- Allow PWA-created fuelings without admin User
ALTER TABLE "VehicleFueling" ALTER COLUMN "createdById" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "VehicleFueling_offlineClientId_key" ON "VehicleFueling"("offlineClientId");
