import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "@/lib/api/trpc";
import { db } from "@/lib/db";
import { therapyApproval, therapy, disease } from "@/lib/db/schema";
import { eq, like, desc, sql, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const approvalSchema = z.object({
  therapyId: z.string().min(1, "Therapy is required"),
  diseaseId: z.string().min(1, "Disease is required"),
  region: z.string().min(1, "Region is required"),
  approvalDate: z.date({ required_error: "Approval date is required" }),
  approvalType: z.string().min(1, "Approval type is required"),
  regulatoryBody: z.string().min(1, "Regulatory body is required"),
  sources: z.array(z.string()).min(1, "At least one source is required"),
});

export const approvalAdminRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        therapyId: z.string().optional(),
        region: z.string().optional(),
        regulatoryBody: z.string().optional(),
        sortBy: z.enum(["therapyName", "diseaseName", "region", "approvalDate", "regulatoryBody"]).default("approvalDate"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, search, therapyId, region, regulatoryBody, sortBy, sortOrder } = input;
      const offset = (page - 1) * pageSize;

      // Build where conditions
      const whereConditions = [];
      
      if (search) {
        whereConditions.push(
          sql`(${therapy.name} ILIKE ${`%${search}%`} OR ${disease.name} ILIKE ${`%${search}%`})`
        );
      }
      
      if (therapyId) {
        whereConditions.push(eq(therapyApproval.therapyId, therapyId));
      }
      
      if (region) {
        whereConditions.push(eq(therapyApproval.region, region));
      }
      
      if (regulatoryBody) {
        whereConditions.push(eq(therapyApproval.regulatoryBody, regulatoryBody));
      }

      const whereClause = whereConditions.length > 0 
        ? sql`${whereConditions.reduce((acc, condition, index) => 
            index === 0 ? condition : sql`${acc} AND ${condition}`
          )}`
        : undefined;

      // Build order by clause
      let orderByClause;
      switch (sortBy) {
        case "therapyName":
          orderByClause = sortOrder === "desc" ? desc(therapy.name) : therapy.name;
          break;
        case "diseaseName":
          orderByClause = sortOrder === "desc" ? desc(disease.name) : disease.name;
          break;
        case "region":
          orderByClause = sortOrder === "desc" ? desc(therapyApproval.region) : therapyApproval.region;
          break;
        case "regulatoryBody":
          orderByClause = sortOrder === "desc" ? desc(therapyApproval.regulatoryBody) : therapyApproval.regulatoryBody;
          break;
        default:
          orderByClause = sortOrder === "desc" ? desc(therapyApproval.approvalDate) : therapyApproval.approvalDate;
      }

      const [approvals, totalCount] = await Promise.all([
        db
          .select({
            id: therapyApproval.id,
            therapyId: therapyApproval.therapyId,
            diseaseId: therapyApproval.diseaseId,
            region: therapyApproval.region,
            approvalDate: therapyApproval.approvalDate,
            approvalType: therapyApproval.approvalType,
            regulatoryBody: therapyApproval.regulatoryBody,
            sources: therapyApproval.sources,
            lastUpdated: therapyApproval.lastUpdated,
            therapyName: therapy.name,
            diseaseName: disease.name,
          })
          .from(therapyApproval)
          .innerJoin(therapy, eq(therapyApproval.therapyId, therapy.id))
          .innerJoin(disease, eq(therapyApproval.diseaseId, disease.id))
          .where(whereClause)
          .orderBy(orderByClause)
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(therapyApproval)
          .innerJoin(therapy, eq(therapyApproval.therapyId, therapy.id))
          .innerJoin(disease, eq(therapyApproval.diseaseId, disease.id))
          .where(whereClause),
      ]);

      return {
        approvals,
        totalCount: totalCount[0]?.count ?? 0,
        totalPages: Math.ceil((totalCount[0]?.count ?? 0) / pageSize),
        currentPage: page,
      };
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(therapyApproval)
        .where(eq(therapyApproval.id, input.id))
        .limit(1);

      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Approval not found",
        });
      }

      return result[0];
    }),

  create: adminProcedure
    .input(approvalSchema)
    .mutation(async ({ input }) => {
      const [newApproval] = await db
        .insert(therapyApproval)
        .values({
          ...input,
          lastUpdated: new Date(),
        })
        .returning();

      return newApproval;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: approvalSchema,
      })
    )
    .mutation(async ({ input }) => {
      const [updatedApproval] = await db
        .update(therapyApproval)
        .set({
          ...input.data,
          lastUpdated: new Date(),
        })
        .where(eq(therapyApproval.id, input.id))
        .returning();

      if (!updatedApproval) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Approval not found",
        });
      }

      return updatedApproval;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const [deletedApproval] = await db
        .delete(therapyApproval)
        .where(eq(therapyApproval.id, input.id))
        .returning();

      if (!deletedApproval) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Approval not found",
        });
      }

      return { success: true, deletedApproval };
    }),

  // Get therapy and disease options for dropdowns
  getOptions: adminProcedure.query(async () => {
    const [therapies, diseases] = await Promise.all([
      db.select({ id: therapy.id, name: therapy.name }).from(therapy).orderBy(therapy.name),
      db.select({ id: disease.id, name: disease.name }).from(disease).orderBy(disease.name),
    ]);

    return { therapies, diseases };
  }),

  // Get unique regions and regulatory bodies for filters
  getFilterOptions: adminProcedure.query(async () => {
    const regions = await db
      .selectDistinct({ region: therapyApproval.region })
      .from(therapyApproval)
      .orderBy(therapyApproval.region);

    const regulatoryBodies = await db
      .selectDistinct({ regulatoryBody: therapyApproval.regulatoryBody })
      .from(therapyApproval)
      .orderBy(therapyApproval.regulatoryBody);

    return {
      regions: regions.map(r => r.region),
      regulatoryBodies: regulatoryBodies.map(rb => rb.regulatoryBody),
    };
  }),
});