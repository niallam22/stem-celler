-- For now, we'll keep the old columns for backward compatibility
-- but make the new columns NOT NULL since they're populated

-- Make new columns NOT NULL now that migration is complete
ALTER TABLE "therapyApproval"
ALTER COLUMN "therapyName" SET NOT NULL,
ALTER COLUMN "diseaseIndication" SET NOT NULL;

-- Note: In a future migration, we can remove therapyId and diseaseId columns
-- once we're certain all systems are using the new columns