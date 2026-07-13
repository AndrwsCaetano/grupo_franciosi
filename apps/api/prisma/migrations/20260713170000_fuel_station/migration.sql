-- CreateEnum
CREATE TYPE "FuelPointType" AS ENUM ('POSTO', 'COMBOIO');

-- CreateEnum
CREATE TYPE "MachineryStatus" AS ENUM ('ATIVO', 'MANUTENCAO', 'INATIVO');

-- CreateEnum
CREATE TYPE "FuelSyncStatus" AS ENUM ('PENDENTE', 'SINCRONIZADO', 'ERRO');

-- CreateEnum
CREATE TYPE "FuelTransferStatus" AS ENUM ('PENDENTE', 'ACEITA', 'RECUSADA');

-- CreateEnum
CREATE TYPE "FuelStockMovementType" AS ENUM ('ABASTECIMENTO', 'TRANSFERENCIA_SAIDA', 'TRANSFERENCIA_ENTRADA', 'NF_ENTRADA');

-- CreateEnum
CREATE TYPE "FuelErpImportKind" AS ENUM ('EQUIPAMENTO', 'NF_ENTRADA');

-- CreateEnum
CREATE TYPE "FuelErpImportStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateTable
CREATE TABLE "FuelProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'L',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelPoint" (
    "id" TEXT NOT NULL,
    "type" "FuelPointType" NOT NULL,
    "name" TEXT NOT NULL,
    "maxCapacityLiters" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelStock" (
    "id" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityLiters" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "minReserveLiters" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machinery" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "defaultProductId" TEXT,
    "hourMeter" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "odometerKm" INTEGER NOT NULL DEFAULT 0,
    "status" "MachineryStatus" NOT NULL DEFAULT 'ATIVO',
    "erpExternalId" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machinery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelDispensing" (
    "id" TEXT NOT NULL,
    "machineryId" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "liters" DECIMAL(12,2) NOT NULL,
    "hourMeterReported" DECIMAL(12,2),
    "kmReported" INTEGER,
    "operatorUserId" TEXT NOT NULL,
    "offlineClientId" TEXT,
    "syncStatus" "FuelSyncStatus" NOT NULL DEFAULT 'PENDENTE',
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelDispensing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelTransfer" (
    "id" TEXT NOT NULL,
    "originPointId" TEXT NOT NULL,
    "destPointId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "liters" DECIMAL(12,2) NOT NULL,
    "status" "FuelTransferStatus" NOT NULL DEFAULT 'PENDENTE',
    "observation" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "acceptedByUserId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelStockMovement" (
    "id" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "deltaLiters" DECIMAL(12,2) NOT NULL,
    "type" "FuelStockMovementType" NOT NULL,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelStockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelErpImport" (
    "id" TEXT NOT NULL,
    "kind" "FuelErpImportKind" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "FuelErpImportStatus" NOT NULL DEFAULT 'PENDENTE',
    "validatedByUserId" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelErpImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelSyncLog" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "lastAttemptAt" TIMESTAMP(3),
    "erpResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFuelPointAccess" (
    "userId" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFuelPointAccess_pkey" PRIMARY KEY ("userId","pointId")
);

-- CreateIndex
CREATE UNIQUE INDEX "FuelProduct_name_key" ON "FuelProduct"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FuelPoint_name_key" ON "FuelPoint"("name");

-- CreateIndex
CREATE INDEX "FuelStock_pointId_idx" ON "FuelStock"("pointId");

-- CreateIndex
CREATE INDEX "FuelStock_productId_idx" ON "FuelStock"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "FuelStock_pointId_productId_key" ON "FuelStock"("pointId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Machinery_tag_key" ON "Machinery"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "Machinery_erpExternalId_key" ON "Machinery"("erpExternalId");

-- CreateIndex
CREATE INDEX "Machinery_status_idx" ON "Machinery"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FuelDispensing_offlineClientId_key" ON "FuelDispensing"("offlineClientId");

-- CreateIndex
CREATE INDEX "FuelDispensing_machineryId_idx" ON "FuelDispensing"("machineryId");

-- CreateIndex
CREATE INDEX "FuelDispensing_pointId_idx" ON "FuelDispensing"("pointId");

-- CreateIndex
CREATE INDEX "FuelDispensing_productId_idx" ON "FuelDispensing"("productId");

-- CreateIndex
CREATE INDEX "FuelDispensing_createdAt_idx" ON "FuelDispensing"("createdAt");

-- CreateIndex
CREATE INDEX "FuelDispensing_syncStatus_idx" ON "FuelDispensing"("syncStatus");

-- CreateIndex
CREATE INDEX "FuelTransfer_originPointId_idx" ON "FuelTransfer"("originPointId");

-- CreateIndex
CREATE INDEX "FuelTransfer_destPointId_idx" ON "FuelTransfer"("destPointId");

-- CreateIndex
CREATE INDEX "FuelTransfer_productId_idx" ON "FuelTransfer"("productId");

-- CreateIndex
CREATE INDEX "FuelTransfer_status_idx" ON "FuelTransfer"("status");

-- CreateIndex
CREATE INDEX "FuelTransfer_createdAt_idx" ON "FuelTransfer"("createdAt");

-- CreateIndex
CREATE INDEX "FuelStockMovement_pointId_idx" ON "FuelStockMovement"("pointId");

-- CreateIndex
CREATE INDEX "FuelStockMovement_productId_idx" ON "FuelStockMovement"("productId");

-- CreateIndex
CREATE INDEX "FuelStockMovement_type_idx" ON "FuelStockMovement"("type");

-- CreateIndex
CREATE INDEX "FuelStockMovement_createdAt_idx" ON "FuelStockMovement"("createdAt");

-- CreateIndex
CREATE INDEX "FuelErpImport_kind_idx" ON "FuelErpImport"("kind");

-- CreateIndex
CREATE INDEX "FuelErpImport_status_idx" ON "FuelErpImport"("status");

-- CreateIndex
CREATE INDEX "FuelSyncLog_tipo_referenceId_idx" ON "FuelSyncLog"("tipo", "referenceId");

-- CreateIndex
CREATE INDEX "FuelSyncLog_status_idx" ON "FuelSyncLog"("status");

-- CreateIndex
CREATE INDEX "FuelSyncLog_createdAt_idx" ON "FuelSyncLog"("createdAt");

-- CreateIndex
CREATE INDEX "UserFuelPointAccess_userId_idx" ON "UserFuelPointAccess"("userId");

-- CreateIndex
CREATE INDEX "UserFuelPointAccess_pointId_idx" ON "UserFuelPointAccess"("pointId");

-- AddForeignKey
ALTER TABLE "FuelStock" ADD CONSTRAINT "FuelStock_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "FuelPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelStock" ADD CONSTRAINT "FuelStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "FuelProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machinery" ADD CONSTRAINT "Machinery_defaultProductId_fkey" FOREIGN KEY ("defaultProductId") REFERENCES "FuelProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelDispensing" ADD CONSTRAINT "FuelDispensing_machineryId_fkey" FOREIGN KEY ("machineryId") REFERENCES "Machinery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelDispensing" ADD CONSTRAINT "FuelDispensing_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "FuelPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelDispensing" ADD CONSTRAINT "FuelDispensing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "FuelProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelDispensing" ADD CONSTRAINT "FuelDispensing_operatorUserId_fkey" FOREIGN KEY ("operatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelTransfer" ADD CONSTRAINT "FuelTransfer_originPointId_fkey" FOREIGN KEY ("originPointId") REFERENCES "FuelPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelTransfer" ADD CONSTRAINT "FuelTransfer_destPointId_fkey" FOREIGN KEY ("destPointId") REFERENCES "FuelPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelTransfer" ADD CONSTRAINT "FuelTransfer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "FuelProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelTransfer" ADD CONSTRAINT "FuelTransfer_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelTransfer" ADD CONSTRAINT "FuelTransfer_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelStockMovement" ADD CONSTRAINT "FuelStockMovement_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "FuelPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelStockMovement" ADD CONSTRAINT "FuelStockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "FuelProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelErpImport" ADD CONSTRAINT "FuelErpImport_validatedByUserId_fkey" FOREIGN KEY ("validatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFuelPointAccess" ADD CONSTRAINT "UserFuelPointAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFuelPointAccess" ADD CONSTRAINT "UserFuelPointAccess_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "FuelPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
