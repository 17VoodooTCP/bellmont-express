-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "company" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "ShipmentRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "serviceLevel" TEXT NOT NULL DEFAULT 'standard',
    "senderName" TEXT NOT NULL,
    "senderPhone" TEXT,
    "senderAddress" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "receiverName" TEXT NOT NULL,
    "receiverPhone" TEXT,
    "receiverAddress" TEXT NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "packageType" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "dimensions" TEXT,
    "declaredValue" DOUBLE PRECISION,
    "contents" TEXT,
    "pickupDate" TIMESTAMP(3),
    "notes" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "shipmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "payload" JSONB NOT NULL,
    "sentBy" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentRequest_reference_key" ON "ShipmentRequest"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentRequest_shipmentId_key" ON "ShipmentRequest"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentRequest_userId_createdAt_idx" ON "ShipmentRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ShipmentRequest_status_createdAt_idx" ON "ShipmentRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Document_userId_createdAt_idx" ON "Document"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Shipment_ownerId_idx" ON "Shipment"("ownerId");

-- AddForeignKey
ALTER TABLE "ShipmentRequest" ADD CONSTRAINT "ShipmentRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentRequest" ADD CONSTRAINT "ShipmentRequest_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

