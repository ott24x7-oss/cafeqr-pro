-- Custom-domain feature: cafe owners request a vanity domain, admin
-- attaches it to Railway / Cloudflare and flips status=verified.
ALTER TABLE "Cafe" ADD COLUMN "customDomain"            TEXT;
ALTER TABLE "Cafe" ADD COLUMN "customDomainStatus"      TEXT DEFAULT 'pending';
ALTER TABLE "Cafe" ADD COLUMN "customDomainNote"        TEXT;
ALTER TABLE "Cafe" ADD COLUMN "customDomainRequestedAt" TIMESTAMP(3);
ALTER TABLE "Cafe" ADD COLUMN "customDomainVerifiedAt"  TIMESTAMP(3);

CREATE UNIQUE INDEX "Cafe_customDomain_key" ON "Cafe"("customDomain");
