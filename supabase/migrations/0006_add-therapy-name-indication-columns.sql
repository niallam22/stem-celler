-- Add new columns for therapy name and disease indication to therapyApproval table
ALTER TABLE "therapyApproval" 
ADD COLUMN "therapyName" text,
ADD COLUMN "diseaseIndication" text;

-- Create indexes for the new columns for better query performance
CREATE INDEX IF NOT EXISTS "idx_therapy_approval_therapy_name" ON "therapyApproval"("therapyName");
CREATE INDEX IF NOT EXISTS "idx_therapy_approval_disease_indication" ON "therapyApproval"("diseaseIndication");