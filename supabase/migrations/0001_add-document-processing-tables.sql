CREATE TABLE "disease" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"icd10Code" text,
	"annualIncidenceUs" integer,
	"sources" text[] NOT NULL,
	"lastUpdated" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" text PRIMARY KEY NOT NULL,
	"s3Url" text NOT NULL,
	"fileName" text NOT NULL,
	"fileHash" text NOT NULL,
	"companyName" text,
	"reportType" text,
	"reportingPeriod" text,
	"uploadedAt" timestamp DEFAULT now() NOT NULL,
	"uploadedBy" text NOT NULL,
	CONSTRAINT "document_fileHash_unique" UNIQUE("fileHash")
);
--> statement-breakpoint
CREATE TABLE "extraction" (
	"id" text PRIMARY KEY NOT NULL,
	"documentId" text NOT NULL,
	"extractedData" jsonb NOT NULL,
	"requiresReview" boolean DEFAULT true,
	"reviewNotes" text,
	"approvedBy" text,
	"approvedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "extraction_documentId_unique" UNIQUE("documentId")
);
--> statement-breakpoint
CREATE TABLE "jobQueue" (
	"id" text PRIMARY KEY NOT NULL,
	"documentId" text NOT NULL,
	"jobType" text NOT NULL,
	"priority" integer DEFAULT 3 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0,
	"maxAttempts" integer DEFAULT 3,
	"error" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"startedAt" timestamp,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "therapy" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"manufacturer" text NOT NULL,
	"mechanism" text NOT NULL,
	"pricePerTreatmentUsd" integer NOT NULL,
	"sources" text[] NOT NULL,
	"lastUpdated" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "therapyApproval" (
	"id" text PRIMARY KEY NOT NULL,
	"therapyId" text NOT NULL,
	"diseaseId" text NOT NULL,
	"region" text NOT NULL,
	"approvalDate" timestamp NOT NULL,
	"approvalType" text NOT NULL,
	"regulatoryBody" text NOT NULL,
	"sources" text[] NOT NULL,
	"lastUpdated" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "therapyRevenue" (
	"id" text PRIMARY KEY NOT NULL,
	"therapyId" text NOT NULL,
	"period" text NOT NULL,
	"region" text NOT NULL,
	"revenueMillionsUsd" integer NOT NULL,
	"sources" text[] NOT NULL,
	"lastUpdated" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "therapyApproval" ADD CONSTRAINT "therapyApproval_therapyId_therapy_id_fk" FOREIGN KEY ("therapyId") REFERENCES "public"."therapy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "therapyApproval" ADD CONSTRAINT "therapyApproval_diseaseId_disease_id_fk" FOREIGN KEY ("diseaseId") REFERENCES "public"."disease"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "therapyRevenue" ADD CONSTRAINT "therapyRevenue_therapyId_therapy_id_fk" FOREIGN KEY ("therapyId") REFERENCES "public"."therapy"("id") ON DELETE no action ON UPDATE no action;