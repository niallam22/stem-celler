-- Create treatment_center table
CREATE TABLE "treatmentCenter" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "availableTherapies" TEXT[] NOT NULL,
  "website" TEXT,
  "phone" TEXT,
  "about" TEXT,
  "lastUpdated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_treatment_center_name ON "treatmentCenter"("name");
CREATE INDEX idx_treatment_center_therapies ON "treatmentCenter" USING GIN("availableTherapies");