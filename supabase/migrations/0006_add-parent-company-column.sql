-- Add parent_company column to therapy table
ALTER TABLE "therapy" 
ADD COLUMN "parentCompany" TEXT;

-- Add index for better query performance
CREATE INDEX idx_therapy_parent_company ON "therapy"("parentCompany");