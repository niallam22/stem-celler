-- Create regulatory body table
CREATE TABLE "regulatoryBody" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "fullName" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "country" TEXT,
  "lastUpdated" TIMESTAMP NOT NULL
);

-- Create index for better query performance
CREATE INDEX idx_regulatory_body_name ON "regulatoryBody"("name");
CREATE INDEX idx_regulatory_body_region ON "regulatoryBody"("region");