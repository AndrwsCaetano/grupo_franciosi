-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "fuelTankLiters" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "cpf" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseIssueDate" DATE NOT NULL,
    "licenseExpiryDate" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverVehicleAssignment" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverVehicleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_cpf_key" ON "Driver"("cpf");

-- CreateIndex
CREATE INDEX "Driver_userId_idx" ON "Driver"("userId");

-- CreateIndex
CREATE INDEX "DriverVehicleAssignment_driverId_idx" ON "DriverVehicleAssignment"("driverId");

-- CreateIndex
CREATE INDEX "DriverVehicleAssignment_vehicleId_idx" ON "DriverVehicleAssignment"("vehicleId");

-- CreateIndex
CREATE INDEX "DriverVehicleAssignment_driverId_endDate_idx" ON "DriverVehicleAssignment"("driverId", "endDate");

-- CreateIndex
CREATE INDEX "DriverVehicleAssignment_vehicleId_endDate_idx" ON "DriverVehicleAssignment"("vehicleId", "endDate");

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverVehicleAssignment" ADD CONSTRAINT "DriverVehicleAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverVehicleAssignment" ADD CONSTRAINT "DriverVehicleAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
