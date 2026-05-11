-- CreateTable
CREATE TABLE "VehicleFueling" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverNameSnapshot" TEXT NOT NULL,
    "fuelDate" DATE NOT NULL,
    "quantityLiters" DECIMAL(10,2) NOT NULL,
    "receiptImagePath" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleFueling_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleFueling_driverId_idx" ON "VehicleFueling"("driverId");

-- CreateIndex
CREATE INDEX "VehicleFueling_vehicleId_idx" ON "VehicleFueling"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleFueling_fuelDate_idx" ON "VehicleFueling"("fuelDate");

-- CreateIndex
CREATE INDEX "VehicleFueling_createdAt_idx" ON "VehicleFueling"("createdAt");

-- AddForeignKey
ALTER TABLE "VehicleFueling" ADD CONSTRAINT "VehicleFueling_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleFueling" ADD CONSTRAINT "VehicleFueling_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleFueling" ADD CONSTRAINT "VehicleFueling_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
