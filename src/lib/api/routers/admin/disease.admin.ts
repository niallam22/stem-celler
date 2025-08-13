import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "@/lib/api/trpc";
import { db } from "@/lib/db";
import { disease, therapyApproval } from "@/lib/db/schema";
import { eq, like, desc, sql, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const diseaseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  icd10Code: z.string().optional(),
  annualIncidenceUs: z.number().positive().optional(),
  sources: z.array(z.string()).min(1, "At least one source is required"),
});

export const diseaseAdminRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        category: z.string().optional(),
        subcategory: z.string().optional(),
        sortBy: z.enum(["name", "category", "subcategory", "icd10Code", "annualIncidenceUs", "lastUpdated"]).default("name"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, search, category, subcategory, sortBy, sortOrder } = input;
      const offset = (page - 1) * pageSize;

      // Build where conditions
      const whereConditions = [];
      
      if (search) {
        whereConditions.push(
          sql`(${disease.name} ILIKE ${`%${search}%`} OR ${disease.icd10Code} ILIKE ${`%${search}%`})`
        );
      }
      
      if (category) {
        whereConditions.push(eq(disease.category, category));
      }
      
      if (subcategory) {
        whereConditions.push(eq(disease.subcategory, subcategory));
      }

      const whereClause = whereConditions.length > 0 
        ? sql`${whereConditions.reduce((acc, condition, index) => 
            index === 0 ? condition : sql`${acc} AND ${condition}`
          )}`
        : undefined;

      // Build order by clause
      let orderByClause;
      switch (sortBy) {
        case "category":
          orderByClause = sortOrder === "desc" ? desc(disease.category) : disease.category;
          break;
        case "subcategory":
          orderByClause = sortOrder === "desc" ? desc(disease.subcategory) : disease.subcategory;
          break;
        case "icd10Code":
          orderByClause = sortOrder === "desc" ? desc(disease.icd10Code) : disease.icd10Code;
          break;
        case "annualIncidenceUs":
          orderByClause = sortOrder === "desc" ? desc(disease.annualIncidenceUs) : disease.annualIncidenceUs;
          break;
        case "lastUpdated":
          orderByClause = sortOrder === "desc" ? desc(disease.lastUpdated) : disease.lastUpdated;
          break;
        default:
          orderByClause = sortOrder === "desc" ? desc(disease.name) : disease.name;
      }

      // Fetch one extra record to determine if there are more pages
      const diseases = await db
        .select()
        .from(disease)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(pageSize + 1)
        .offset(offset);

      const hasNextPage = diseases.length > pageSize;
      const actualDiseases = hasNextPage ? diseases.slice(0, pageSize) : diseases;

      return {
        diseases: actualDiseases,
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
        .from(disease)
        .where(eq(disease.id, input.id))
        .limit(1);

      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Disease not found",
        });
      }

      return result[0];
    }),

  create: adminProcedure
    .input(diseaseSchema)
    .mutation(async ({ input }) => {
      const [newDisease] = await db
        .insert(disease)
        .values({
          ...input,
          lastUpdated: new Date(),
        })
        .returning();

      return newDisease;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: diseaseSchema,
      })
    )
    .mutation(async ({ input }) => {
      const [updatedDisease] = await db
        .update(disease)
        .set({
          ...input.data,
          lastUpdated: new Date(),
        })
        .where(eq(disease.id, input.id))
        .returning();

      if (!updatedDisease) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Disease not found",
        });
      }

      return updatedDisease;
    }),

  delete: adminProcedure
    .input(
      z.object({
        id: z.string(),
        cascade: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      // Check for related records
      const [approvalCount] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(therapyApproval)
          .where(eq(therapyApproval.diseaseId, input.id)),
      ]);

      const hasRelatedRecords = (approvalCount[0]?.count ?? 0) > 0;

      if (hasRelatedRecords && !input.cascade) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `This disease has ${approvalCount[0]?.count ?? 0} approval(s). Delete with cascade option to remove all related records.`,
        });
      }

      // If cascade is true, delete related records first
      if (input.cascade) {
        await db.delete(therapyApproval).where(eq(therapyApproval.diseaseId, input.id));
      }

      const [deletedDisease] = await db
        .delete(disease)
        .where(eq(disease.id, input.id))
        .returning();

      if (!deletedDisease) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Disease not found",
        });
      }

      return { success: true, deletedDisease };
    }),

  // Get unique categories and subcategories for filters
  getFilterOptions: adminProcedure.query(async () => {
    const categories = await db
      .selectDistinct({ category: disease.category })
      .from(disease)
      .orderBy(disease.category);

    const subcategories = await db
      .selectDistinct({ subcategory: disease.subcategory })
      .from(disease)
      .where(sql`${disease.subcategory} IS NOT NULL`)
      .orderBy(disease.subcategory);

    return {
      categories: categories.map(c => c.category),
      subcategories: subcategories.map(s => s.subcategory).filter((s): s is string => Boolean(s)),
    };
  }),
});