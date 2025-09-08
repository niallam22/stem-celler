import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "@/lib/api/trpc";
import { db } from "@/lib/db";
import { therapyRevenue, therapy } from "@/lib/db/schema";
import { eq, like, desc, sql, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const revenueSchema = z.object({
  therapyId: z.string().min(1, "Therapy is required"),
  period: z.string().min(1, "Period is required").regex(
    /^(Q[1-4]\s\d{4}|\d{4})$/,
    "Period must be in format 'Q1 2024' or '2024'"
  ),
  region: z.string().min(1, "Region is required"),
  revenueMillionsUsd: z.number().positive("Revenue must be positive"),
  sources: z.array(z.string()).min(1, "At least one source is required"),
});

export const revenueAdminRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        therapyId: z.string().optional(),
        period: z.string().optional(),
        region: z.string().optional(),
        sortBy: z.enum(["therapyName", "period", "region", "revenueMillionsUsd", "lastUpdated"]).default("lastUpdated"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, search, therapyId, period, region, sortBy, sortOrder } = input;
      const offset = (page - 1) * pageSize;

      // Build where conditions
      const whereConditions = [];
      
      if (search) {
        whereConditions.push(
          sql`(${therapy.name} ILIKE ${`%${search}%`} OR ${therapyRevenue.period} ILIKE ${`%${search}%`})`
        );
      }
      
      if (therapyId) {
        whereConditions.push(eq(therapyRevenue.therapyId, therapyId));
      }
      
      if (period) {
        whereConditions.push(like(therapyRevenue.period, `%${period}%`));
      }
      
      if (region) {
        whereConditions.push(eq(therapyRevenue.region, region));
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
        case "period":
          orderByClause = sortOrder === "desc" ? desc(therapyRevenue.period) : therapyRevenue.period;
          break;
        case "region":
          orderByClause = sortOrder === "desc" ? desc(therapyRevenue.region) : therapyRevenue.region;
          break;
        case "revenueMillionsUsd":
          orderByClause = sortOrder === "desc" ? desc(therapyRevenue.revenueMillionsUsd) : therapyRevenue.revenueMillionsUsd;
          break;
        default:
          orderByClause = sortOrder === "desc" ? desc(therapyRevenue.lastUpdated) : therapyRevenue.lastUpdated;
      }

      // Fetch one extra record to determine if there are more pages
      const revenues = await db
        .select({
          id: therapyRevenue.id,
          therapyId: therapyRevenue.therapyId,
          period: therapyRevenue.period,
          region: therapyRevenue.region,
          revenueMillionsUsd: therapyRevenue.revenueMillionsUsd,
          sources: therapyRevenue.sources,
          lastUpdated: therapyRevenue.lastUpdated,
          therapyName: therapy.name,
        })
        .from(therapyRevenue)
        .innerJoin(therapy, eq(therapyRevenue.therapyId, therapy.id))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(pageSize + 1)
        .offset(offset);

      const hasNextPage = revenues.length > pageSize;
      const actualRevenues = hasNextPage ? revenues.slice(0, pageSize) : revenues;

      return {
        revenues: actualRevenues,
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
        .from(therapyRevenue)
        .where(eq(therapyRevenue.id, input.id))
        .limit(1);

      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Revenue record not found",
        });
      }

      return result[0];
    }),

  create: adminProcedure
    .input(revenueSchema)
    .mutation(async ({ input }) => {
      const [newRevenue] = await db
        .insert(therapyRevenue)
        .values({
          ...input,
          lastUpdated: new Date(),
        })
        .returning();

      return newRevenue;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: revenueSchema,
      })
    )
    .mutation(async ({ input }) => {
      const [updatedRevenue] = await db
        .update(therapyRevenue)
        .set({
          ...input.data,
          lastUpdated: new Date(),
        })
        .where(eq(therapyRevenue.id, input.id))
        .returning();

      if (!updatedRevenue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Revenue record not found",
        });
      }

      return updatedRevenue;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const [deletedRevenue] = await db
        .delete(therapyRevenue)
        .where(eq(therapyRevenue.id, input.id))
        .returning();

      if (!deletedRevenue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Revenue record not found",
        });
      }

      return { success: true, deletedRevenue };
    }),

  // Get therapy options for dropdowns
  getTherapyOptions: adminProcedure.query(async () => {
    const therapies = await db
      .select({ id: therapy.id, name: therapy.name })
      .from(therapy)
      .orderBy(therapy.name);

    return therapies;
  }),

  // Get unique periods and regions for filters
  getFilterOptions: adminProcedure.query(async () => {
    const periods = await db
      .selectDistinct({ period: therapyRevenue.period })
      .from(therapyRevenue)
      .orderBy(desc(therapyRevenue.period));

    const regions = await db
      .selectDistinct({ region: therapyRevenue.region })
      .from(therapyRevenue)
      .orderBy(therapyRevenue.region);

    return {
      periods: periods.map(p => p.period),
      regions: regions.map(r => r.region),
    };
  }),

  bulkCreate: adminProcedure
    .input(
      z.object({
        revenues: z.array(revenueSchema),
      })
    )
    .mutation(async ({ input }) => {
      const revenuesWithTimestamp = input.revenues.map(revenueData => ({
        ...revenueData,
        lastUpdated: new Date(),
      }));

      const createdRevenues = await db
        .insert(therapyRevenue)
        .values(revenuesWithTimestamp)
        .returning();

      return {
        success: true,
        created: createdRevenues.length,
        revenues: createdRevenues,
      };
    }),

});