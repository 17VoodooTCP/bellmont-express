CREATE TABLE "LetterDraft" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "signerName" TEXT NOT NULL DEFAULT '',
    "signerTitle" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT 'Operations',
    "classification" TEXT NOT NULL DEFAULT 'Private & Confidential',
    "reference" TEXT NOT NULL,
    "savedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LetterDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Executive" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "prefix" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Executive_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IssuedLetter" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerTitle" TEXT NOT NULL DEFAULT '',
    "authorizationId" TEXT NOT NULL DEFAULT '',
    "issuedOn" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "statusReason" TEXT,
    "fingerprint" TEXT NOT NULL DEFAULT '',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3),
    "verifyCount" INTEGER NOT NULL DEFAULT 0,
    "issuedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IssuedLetter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IssuedLetter_reference_key" ON "IssuedLetter"("reference");
CREATE INDEX "LetterDraft_updatedAt_idx" ON "LetterDraft"("updatedAt");
CREATE INDEX "Executive_isActive_idx" ON "Executive"("isActive");
CREATE INDEX "IssuedLetter_createdAt_idx" ON "IssuedLetter"("createdAt");
CREATE INDEX "IssuedLetter_status_idx" ON "IssuedLetter"("status");
