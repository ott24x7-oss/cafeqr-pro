-- Persist Baileys WhatsApp auth state across deploys / container restarts.

CREATE TABLE "BaileysAuthFile" (
  "id"        TEXT        NOT NULL,
  "sessionId" TEXT        NOT NULL,
  "file"      TEXT        NOT NULL,
  "data"      TEXT        NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BaileysAuthFile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BaileysAuthFile_sessionId_file_key" ON "BaileysAuthFile"("sessionId", "file");
CREATE INDEX "BaileysAuthFile_sessionId_idx" ON "BaileysAuthFile"("sessionId");
