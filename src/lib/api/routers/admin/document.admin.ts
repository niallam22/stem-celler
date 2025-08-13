import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "@/lib/api/trpc";
import { db } from "@/lib/db";
import { document, jobQueue, extraction, therapy } from "@/lib/db/schema";
import { eq, desc, sql, and, or, like } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createHash } from "crypto";

export const documentAdminRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        companyName: z.string().optional(),
        reportType: z.string().optional(),
        sortBy: z.enum(["fileName", "companyName", "reportType", "reportingPeriod", "uploadedAt"]).default("uploadedAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, search, companyName, reportType, sortBy, sortOrder } = input;
      const offset = (page - 1) * pageSize;

      // Build where conditions
      const whereConditions = [];
      
      if (search) {
        whereConditions.push(
          or(
            like(document.fileName, `%${search}%`),
            like(document.companyName, `%${search}%`),
            like(document.reportingPeriod, `%${search}%`)
          )
        );
      }
      
      if (companyName) {
        whereConditions.push(eq(document.companyName, companyName));
      }
      
      if (reportType) {
        whereConditions.push(eq(document.reportType, reportType));
      }

      const whereClause = whereConditions.length > 0 
        ? and(...whereConditions)
        : undefined;

      // Build order by clause
      let orderByClause;
      switch (sortBy) {
        case "companyName":
          orderByClause = sortOrder === "desc" ? desc(document.companyName) : document.companyName;
          break;
        case "reportType":
          orderByClause = sortOrder === "desc" ? desc(document.reportType) : document.reportType;
          break;
        case "reportingPeriod":
          orderByClause = sortOrder === "desc" ? desc(document.reportingPeriod) : document.reportingPeriod;
          break;
        case "fileName":
          orderByClause = sortOrder === "desc" ? desc(document.fileName) : document.fileName;
          break;
        default:
          orderByClause = sortOrder === "desc" ? desc(document.uploadedAt) : document.uploadedAt;
      }

      // Fetch documents with their processing status
      const documents = await db
        .select({
          document: document,
          jobStatus: sql<string | null>`(
            SELECT status FROM ${jobQueue} 
            WHERE ${jobQueue.documentId} = ${document.id} 
            ORDER BY ${jobQueue.createdAt} DESC 
            LIMIT 1
          )`,
          hasExtraction: sql<boolean>`EXISTS (
            SELECT 1 FROM ${extraction} 
            WHERE ${extraction.documentId} = ${document.id}
          )`,
        })
        .from(document)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(pageSize + 1)
        .offset(offset);

      const hasNextPage = documents.length > pageSize;
      const actualDocuments = hasNextPage ? documents.slice(0, pageSize) : documents;

      return {
        documents: actualDocuments.map(d => ({
          ...d.document,
          status: d.hasExtraction ? 'completed' : (d.jobStatus || 'not_queued'),
        })),
        hasNextPage,
        hasPreviousPage: page > 1,
        currentPage: page,
      };
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(document)
        .where(eq(document.id, input.id))
        .limit(1);

      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      return result[0];
    }),

  upload: adminProcedure
    .input(
      z.object({
        fileName: z.string(),
        s3Url: z.string(),
        fileHash: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate
      const existing = await db
        .select()
        .from(document)
        .where(eq(document.fileHash, input.fileHash))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Document already exists",
        });
      }

      const [newDoc] = await db
        .insert(document)
        .values({
          ...input,
          uploadedBy: ctx.session.user.id,
          uploadedAt: new Date(),
        })
        .returning();

      return newDoc;
    }),

  queueExtraction: adminProcedure
    .input(
      z.object({
        documentId: z.string(),
        priority: z.enum(["high", "medium", "low"]).default("low"),
      })
    )
    .mutation(async ({ input }) => {
      // Check if already queued
      const existingJob = await db
        .select()
        .from(jobQueue)
        .where(
          and(
            eq(jobQueue.documentId, input.documentId),
            sql`${jobQueue.status} IN ('pending', 'processing')`
          )
        )
        .limit(1);

      if (existingJob.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Document already in queue",
        });
      }

      const priorityMap = {
        high: 1,
        medium: 2,
        low: 3,
      };

      const [newJob] = await db
        .insert(jobQueue)
        .values({
          documentId: input.documentId,
          jobType: "extraction",
          priority: priorityMap[input.priority],
          status: "pending",
          createdAt: new Date(),
        })
        .returning();

      return newJob;
    }),

  updatePriority: adminProcedure
    .input(
      z.object({
        documentId: z.string(),
        priority: z.enum(["high", "medium", "low"]),
      })
    )
    .mutation(async ({ input }) => {
      const priorityMap = {
        high: 1,
        medium: 2,
        low: 3,
      };

      const [updated] = await db
        .update(jobQueue)
        .set({
          priority: priorityMap[input.priority],
        })
        .where(
          and(
            eq(jobQueue.documentId, input.documentId),
            eq(jobQueue.status, "pending")
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No pending job found for this document",
        });
      }

      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      // Check if has extraction or jobs
      const hasRelated = await db.transaction(async (tx) => {
        const [hasExtraction] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(extraction)
          .where(eq(extraction.documentId, input.id));

        const [hasJobs] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(jobQueue)
          .where(eq(jobQueue.documentId, input.id));

        return (hasExtraction?.count ?? 0) > 0 || (hasJobs?.count ?? 0) > 0;
      });

      if (hasRelated) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete document with extractions or active jobs",
        });
      }

      const [deleted] = await db
        .delete(document)
        .where(eq(document.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      return { success: true };
    }),

  // Get unique companies for filter dropdown
  getCompanyOptions: adminProcedure.query(async () => {
    const companies = await db
      .selectDistinct({ companyName: document.companyName })
      .from(document)
      .where(sql`${document.companyName} IS NOT NULL`)
      .orderBy(document.companyName);

    // Also get companies from therapy table
    const therapyCompanies = await db
      .selectDistinct({ manufacturer: therapy.manufacturer })
      .from(therapy)
      .orderBy(therapy.manufacturer);

    const allCompanies = new Set([
      ...companies.map(c => c.companyName).filter(Boolean),
      ...therapyCompanies.map(t => t.manufacturer),
    ]);

    return Array.from(allCompanies).sort();
  }),
});