import { adminProcedure, createTRPCRouter } from "@/lib/api/trpc";
import { db } from "@/lib/db";
import {
  disease,
  document,
  extraction,
  therapy,
  therapyApproval,
  therapyRevenue,
} from "@/lib/db/schema";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

// Schema for extracted data structure
const extractedDataSchema = z.object({
  therapy: z
    .array(
      z.object({
        name: z.string(),
        manufacturer: z.string(),
        mechanism: z.string(),
        pricePerTreatmentUsd: z.number(),
        sources: z.array(z.string()),
      })
    )
    .optional(),
  revenue: z
    .array(
      z.object({
        therapyId: z.string().optional(),
        therapyName: z.string(),
        period: z.string(),
        region: z.string(),
        revenueMillionsUsd: z.number(),
        sources: z.array(z.string()),
      })
    )
    .optional(),
  approvals: z
    .array(
      z.object({
        therapyId: z.string().optional(),
        therapyName: z.string(),
        diseaseId: z.string().optional(),
        diseaseName: z.string(),
        region: z.string(),
        approvalDate: z.date(),
        approvalType: z.string(),
        regulatoryBody: z.string(),
        sources: z.array(z.string()),
      })
    )
    .optional(),
  confidence: z.object({
    therapy: z.number().min(0).max(100),
    revenue: z.number().min(0).max(100),
    approvals: z.number().min(0).max(100),
  }),
  sources: z.array(
    z.object({
      page: z.number(),
      section: z.string(),
      quote: z.string(),
    })
  ),
});

export const extractionAdminRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        status: z.enum(["pending", "approved", "rejected", "all"]).default("all"),
        sortBy: z
          .enum(["createdAt", "updatedAt", "approvedAt"])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, search, status, sortBy, sortOrder } = input;
      const offset = (page - 1) * pageSize;

      // Build where conditions
      const whereConditions = [];

      if (search) {
        // Join with document to search by filename or company
        whereConditions.push(
          sql`EXISTS (
            SELECT 1 FROM ${document} 
            WHERE ${document.id} = ${extraction.documentId}
            AND (
              ${document.fileName} ILIKE ${`%${search}%`}
              OR ${document.companyName} ILIKE ${`%${search}%`}
            )
          )`
        );
      }

      if (status === "pending") {
        whereConditions.push(eq(extraction.requiresReview, true));
      } else if (status === "approved") {
        whereConditions.push(
          and(
            eq(extraction.requiresReview, false),
            sql`${extraction.approvedAt} IS NOT NULL`
          )
        );
      } else if (status === "rejected") {
        whereConditions.push(
          and(
            eq(extraction.requiresReview, false),
            sql`${extraction.approvedAt} IS NULL`
          )
        );
      }

      const whereClause =
        whereConditions.length > 0
          ? sql`${whereConditions.reduce((acc, condition, index) =>
              index === 0 ? condition : sql`${acc} AND ${condition}`
            )}`
          : undefined;

      // Build order by clause
      let orderByClause;
      switch (sortBy) {
        case "updatedAt":
          orderByClause =
            sortOrder === "desc"
              ? desc(extraction.updatedAt)
              : extraction.updatedAt;
          break;
        case "approvedAt":
          orderByClause =
            sortOrder === "desc"
              ? desc(extraction.approvedAt)
              : extraction.approvedAt;
          break;
        default:
          orderByClause =
            sortOrder === "desc"
              ? desc(extraction.createdAt)
              : extraction.createdAt;
      }

      // Fetch extractions with document info
      const extractions = await db
        .select({
          extraction: extraction,
          document: document,
        })
        .from(extraction)
        .innerJoin(document, eq(extraction.documentId, document.id))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(pageSize + 1)
        .offset(offset);

      const hasNextPage = extractions.length > pageSize;
      const actualExtractions = hasNextPage
        ? extractions.slice(0, pageSize)
        : extractions;

      return {
        extractions: actualExtractions.map((e) => ({
          ...e.extraction,
          document: e.document,
          // Parse and validate extracted data
          extractedData: e.extraction.extractedData as z.infer<
            typeof extractedDataSchema
          >,
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
        .select({
          extraction: extraction,
          document: document,
        })
        .from(extraction)
        .innerJoin(document, eq(extraction.documentId, document.id))
        .where(eq(extraction.id, input.id))
        .limit(1);

      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Extraction not found",
        });
      }

      return {
        ...result[0].extraction,
        document: result[0].document,
        extractedData: result[0].extraction.extractedData as z.infer<
          typeof extractedDataSchema
        >,
      };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: extractedDataSchema,
        reviewNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(extraction)
        .set({
          extractedData: input.data,
          reviewNotes: input.reviewNotes,
          updatedAt: new Date(),
        })
        .where(eq(extraction.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Extraction not found",
        });
      }

      return updated;
    }),

  approve: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get extraction data
      const [extractionData] = await db
        .select()
        .from(extraction)
        .where(eq(extraction.id, input.id))
        .limit(1);

      if (!extractionData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Extraction not found",
        });
      }

      const data = extractionData.extractedData as z.infer<
        typeof extractedDataSchema
      >;

      // Process in transaction
      await db.transaction(async (tx) => {
        // Insert therapies
        if (data.therapy && data.therapy.length > 0) {
          for (const therapyData of data.therapy) {
            // Check if therapy exists by name and manufacturer
            const existing = await tx
              .select()
              .from(therapy)
              .where(
                and(
                  eq(therapy.name, therapyData.name),
                  eq(therapy.manufacturer, therapyData.manufacturer)
                )
              )
              .limit(1);

            if (existing.length === 0) {
              await tx.insert(therapy).values({
                ...therapyData,
                lastUpdated: new Date(),
              });
            } else {
              // Update existing therapy
              await tx
                .update(therapy)
                .set({
                  mechanism: therapyData.mechanism,
                  pricePerTreatmentUsd: therapyData.pricePerTreatmentUsd,
                  sources: therapyData.sources,
                  lastUpdated: new Date(),
                })
                .where(eq(therapy.id, existing[0].id));
            }
          }
        }

        // Insert revenue data
        if (data.revenue && data.revenue.length > 0) {
          for (const revenue of data.revenue) {
            // Find therapy ID if not provided
            let therapyId = revenue.therapyId;
            if (!therapyId && revenue.therapyName) {
              const [therapyMatch] = await tx
                .select({ id: therapy.id })
                .from(therapy)
                .where(eq(therapy.name, revenue.therapyName))
                .limit(1);

              if (therapyMatch) {
                therapyId = therapyMatch.id;
              }
            }

            if (therapyId) {
              // Check for existing revenue record to prevent duplicates
              const existingRevenue = await tx
                .select()
                .from(therapyRevenue)
                .where(
                  and(
                    eq(therapyRevenue.therapyId, therapyId),
                    eq(therapyRevenue.period, revenue.period),
                    eq(therapyRevenue.region, revenue.region)
                  )
                )
                .limit(1);

              // Only insert if no duplicate exists
              if (existingRevenue.length === 0) {
                await tx.insert(therapyRevenue).values({
                  therapyId,
                  period: revenue.period,
                  region: revenue.region,
                  revenueMillionsUsd: revenue.revenueMillionsUsd,
                  sources: revenue.sources,
                  lastUpdated: new Date(),
                });
              }
            }
          }
        }

        // Insert approvals
        if (data.approvals && data.approvals.length > 0) {
          for (const approval of data.approvals) {
            // Find therapy ID if not provided
            let therapyId = approval.therapyId;
            if (!therapyId && approval.therapyName) {
              const [therapyMatch] = await tx
                .select({ id: therapy.id })
                .from(therapy)
                .where(eq(therapy.name, approval.therapyName))
                .limit(1);

              if (therapyMatch) {
                therapyId = therapyMatch.id;
              }
            }

            // Find or create disease
            let diseaseId = approval.diseaseId;
            if (!diseaseId && approval.diseaseName) {
              const [diseaseMatch] = await tx
                .select({ id: disease.id })
                .from(disease)
                .where(eq(disease.name, approval.diseaseName))
                .limit(1);

              if (diseaseMatch) {
                diseaseId = diseaseMatch.id;
              } else {
                // Create new disease with minimal info
                const [newDisease] = await tx
                  .insert(disease)
                  .values({
                    name: approval.diseaseName,
                    category: "Uncategorized", // Default category
                    sources: approval.sources,
                    lastUpdated: new Date(),
                  })
                  .returning();
                diseaseId = newDisease.id;
              }
            }

            if (therapyId && diseaseId) {
              await tx.insert(therapyApproval).values({
                therapyId,
                diseaseId,
                therapyName: approval.therapyName,
                diseaseIndication: approval.diseaseName,
                region: approval.region,
                approvalDate: approval.approvalDate,
                approvalType: approval.approvalType,
                regulatoryBody: approval.regulatoryBody,
                sources: approval.sources,
                lastUpdated: new Date(),
              });
            }
          }
        }

        // Mark extraction as approved
        await tx
          .update(extraction)
          .set({
            requiresReview: false,
            approvedBy: ctx.session.user.id,
            approvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(extraction.id, input.id));
      });

      return { success: true };
    }),

  reject: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if extraction exists and is still pending
      const [extractionData] = await db
        .select()
        .from(extraction)
        .where(eq(extraction.id, input.id))
        .limit(1);

      if (!extractionData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Extraction not found",
        });
      }

      if (!extractionData.requiresReview) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot reject an already processed extraction",
        });
      }

      // Mark extraction as rejected using existing fields
      const [updated] = await db
        .update(extraction)
        .set({
          requiresReview: false,
          approvedBy: ctx.session.user.id,
          approvedAt: null, // Explicitly set to null to indicate rejection
          updatedAt: new Date(),
        })
        .where(eq(extraction.id, input.id))
        .returning();

      return { success: true, extraction: updated };
    }),

  delete: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if extraction exists
      const [extractionData] = await db
        .select()
        .from(extraction)
        .where(eq(extraction.id, input.id))
        .limit(1);

      if (!extractionData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Extraction not found",
        });
      }

      // Don't allow deletion of approved extractions
      if (!extractionData.requiresReview && extractionData.approvedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete an approved extraction",
        });
      }

      // Delete the extraction
      await db
        .delete(extraction)
        .where(eq(extraction.id, input.id));

      return { success: true };
    }),

  // Create extraction (used by background worker)
  create: adminProcedure
    .input(
      z.object({
        documentId: z.string(),
        extractedData: extractedDataSchema,
      })
    )
    .mutation(async ({ input }) => {
      // Check if extraction already exists
      const existing = await db
        .select()
        .from(extraction)
        .where(eq(extraction.documentId, input.documentId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing extraction
        const [updated] = await db
          .update(extraction)
          .set({
            extractedData: input.extractedData,
            requiresReview: true,
            updatedAt: new Date(),
          })
          .where(eq(extraction.documentId, input.documentId))
          .returning();

        return updated;
      }

      // Create new extraction
      const [created] = await db
        .insert(extraction)
        .values({
          documentId: input.documentId,
          extractedData: input.extractedData,
          requiresReview: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return created;
    }),
});
