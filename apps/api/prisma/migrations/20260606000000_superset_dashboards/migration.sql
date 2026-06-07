-- CreateTable
CREATE TABLE "SupersetDashboard" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "embeddedUuid" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupersetDashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSupersetDashboard" (
    "userId" TEXT NOT NULL,
    "supersetDashboardId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSupersetDashboard_pkey" PRIMARY KEY ("userId","supersetDashboardId")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupersetDashboard_slug_key" ON "SupersetDashboard"("slug");

-- AddForeignKey
ALTER TABLE "UserSupersetDashboard" ADD CONSTRAINT "UserSupersetDashboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSupersetDashboard" ADD CONSTRAINT "UserSupersetDashboard_supersetDashboardId_fkey" FOREIGN KEY ("supersetDashboardId") REFERENCES "SupersetDashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
