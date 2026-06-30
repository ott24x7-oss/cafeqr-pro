-- Owner-managed home-screen promo carousel ("Posters & Slides").
-- See prisma/schema.prisma → model Poster.
CREATE TABLE "Poster" (
    "id" TEXT NOT NULL,
    "cafeId" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "caption" TEXT,
    "badge" TEXT,
    "imageUrl" TEXT,
    "ctaLabel" TEXT,
    "linkType" TEXT NOT NULL DEFAULT 'none',
    "linkValue" TEXT,
    "bgColor" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Poster_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Poster_cafeId_idx" ON "Poster"("cafeId");

ALTER TABLE "Poster" ADD CONSTRAINT "Poster_cafeId_fkey"
    FOREIGN KEY ("cafeId") REFERENCES "Cafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
