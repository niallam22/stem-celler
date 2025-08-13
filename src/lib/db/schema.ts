import { pgTable, text, timestamp, boolean, integer, pgEnum, primaryKey, jsonb } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// Enum for user roles
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

// User table - using camelCase column names for NextAuth compatibility
export const user = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  hashedPassword: text("hashedPassword"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  login: text("login"),
  role: userRoleEnum("role").default("user").notNull(),
  isAdmin: boolean("isAdmin").default(false).notNull(),
});

// Account table for OAuth providers - using camelCase column names for NextAuth compatibility
export const account = pgTable("account", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

// Session table for NextAuth - sessionToken is the primary key, no id column needed
export const session = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// Allowlist table - using camelCase column names for consistency
export const allowlist = pgTable("allowlist", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  email: text("email").notNull().unique(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// Verification token table for NextAuth - composite primary key, no id column
export const verificationToken = pgTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (table) => ({
  compositePk: primaryKey({ columns: [table.identifier, table.token] }),
}));

// Therapy table
export const therapy = pgTable("therapy", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  manufacturer: text("manufacturer").notNull(),
  mechanism: text("mechanism").notNull(),
  pricePerTreatmentUsd: integer("pricePerTreatmentUsd").notNull(),
  sources: text("sources").array().notNull(),
  lastUpdated: timestamp("lastUpdated", { mode: "date" }).notNull(),
});

// Disease table
export const disease = pgTable("disease", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  icd10Code: text("icd10Code"),
  annualIncidenceUs: integer("annualIncidenceUs"),
  sources: text("sources").array().notNull(),
  lastUpdated: timestamp("lastUpdated", { mode: "date" }).notNull(),
});

// Therapy Approval table
export const therapyApproval = pgTable("therapyApproval", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  therapyId: text("therapyId")
    .notNull()
    .references(() => therapy.id),
  diseaseId: text("diseaseId")
    .notNull()
    .references(() => disease.id),
  region: text("region").notNull(),
  approvalDate: timestamp("approvalDate", { mode: "date" }).notNull(),
  approvalType: text("approvalType").notNull(),
  regulatoryBody: text("regulatoryBody").notNull(),
  sources: text("sources").array().notNull(),
  lastUpdated: timestamp("lastUpdated", { mode: "date" }).notNull(),
});

// Therapy Revenue table
export const therapyRevenue = pgTable("therapyRevenue", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  therapyId: text("therapyId")
    .notNull()
    .references(() => therapy.id),
  period: text("period").notNull(),
  region: text("region").notNull(),
  revenueMillionsUsd: integer("revenueMillionsUsd").notNull(),
  sources: text("sources").array().notNull(),
  lastUpdated: timestamp("lastUpdated", { mode: "date" }).notNull(),
});

// Document Processing System Tables

// Job Queue table for processing queue
export const jobQueue = pgTable("jobQueue", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  documentId: text("documentId").notNull(),
  jobType: text("jobType").notNull(), // 'extraction', 'reprocessing'
  priority: integer("priority").notNull().default(3), // 1=high, 2=medium, 3=low (default low)
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  attempts: integer("attempts").default(0),
  maxAttempts: integer("maxAttempts").default(3),
  error: text("error"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  startedAt: timestamp("startedAt", { mode: "date" }),
  completedAt: timestamp("completedAt", { mode: "date" }),
});

// Document metadata and storage location
export const document = pgTable("document", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  s3Url: text("s3Url").notNull(),
  fileName: text("fileName").notNull(),
  fileHash: text("fileHash").notNull().unique(), // SHA-256, prevents duplicates
  companyName: text("companyName"), // From therapy manufacturer field
  reportType: text("reportType"), // 'annual', 'quarterly'
  reportingPeriod: text("reportingPeriod"), // 'Q3-2024', '2024'
  uploadedAt: timestamp("uploadedAt", { mode: "date" }).notNull().defaultNow(),
  uploadedBy: text("uploadedBy").notNull(),
});

// Staging area for extracted data pending approval
export const extraction = pgTable("extraction", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  documentId: text("documentId").notNull().unique(), // One extraction per document
  extractedData: jsonb("extractedData").notNull(), // All agent outputs
  requiresReview: boolean("requiresReview").default(true),
  reviewNotes: text("reviewNotes"),
  approvedBy: text("approvedBy"),
  approvedAt: timestamp("approvedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

// Export types for TypeScript inference
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type Allowlist = typeof allowlist.$inferSelect;
export type NewAllowlist = typeof allowlist.$inferInsert;
export type VerificationToken = typeof verificationToken.$inferSelect;
export type NewVerificationToken = typeof verificationToken.$inferInsert;
export type Therapy = typeof therapy.$inferSelect;
export type NewTherapy = typeof therapy.$inferInsert;
export type Disease = typeof disease.$inferSelect;
export type NewDisease = typeof disease.$inferInsert;
export type TherapyApproval = typeof therapyApproval.$inferSelect;
export type NewTherapyApproval = typeof therapyApproval.$inferInsert;
export type TherapyRevenue = typeof therapyRevenue.$inferSelect;
export type NewTherapyRevenue = typeof therapyRevenue.$inferInsert;
export type JobQueue = typeof jobQueue.$inferSelect;
export type NewJobQueue = typeof jobQueue.$inferInsert;
export type Document = typeof document.$inferSelect;
export type NewDocument = typeof document.$inferInsert;
export type Extraction = typeof extraction.$inferSelect;
export type NewExtraction = typeof extraction.$inferInsert;