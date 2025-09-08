import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "@/lib/api/trpc";
import { db } from "@/lib/db";
import { regulatoryBody } from "@/lib/db/schema";
import { eq, like, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const regulatoryBodySchema = z.object({
  name: z.string().min(1, "Name is required"),
  fullName: z.string().min(1, "Full name is required"),
  region: z.string().min(1, "Region is required"),
  country: z.string().nullable().optional(),
});

export const regulatoryBodyAdminRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        region: z.string().optional(),
        sortBy: z.enum(["name", "region", "lastUpdated"]).default("name"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, search, region, sortBy, sortOrder } = input;
      const offset = (page - 1) * pageSize;

      // Build where conditions
      const whereConditions = [];
      
      if (search) {
        whereConditions.push(
          sql`(${regulatoryBody.name} ILIKE ${`%${search}%`} OR ${regulatoryBody.fullName} ILIKE ${`%${search}%`})`
        );
      }
      
      if (region) {
        whereConditions.push(eq(regulatoryBody.region, region));
      }

      const whereClause = whereConditions.length > 0 
        ? sql`${whereConditions.reduce((acc, condition, index) => 
            index === 0 ? condition : sql`${acc} AND ${condition}`
          )}`
        : undefined;

      // Build order by clause
      let orderByClause;
      switch (sortBy) {
        case "region":
          orderByClause = sortOrder === "desc" ? desc(regulatoryBody.region) : regulatoryBody.region;
          break;
        case "lastUpdated":
          orderByClause = sortOrder === "desc" ? desc(regulatoryBody.lastUpdated) : regulatoryBody.lastUpdated;
          break;
        default:
          orderByClause = sortOrder === "desc" ? desc(regulatoryBody.name) : regulatoryBody.name;
      }

      const [bodies, totalCount] = await Promise.all([
        db
          .select()
          .from(regulatoryBody)
          .where(whereClause)
          .orderBy(orderByClause)
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(regulatoryBody)
          .where(whereClause),
      ]);

      return {
        bodies,
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
        .from(regulatoryBody)
        .where(eq(regulatoryBody.id, input.id))
        .limit(1);

      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Regulatory body not found",
        });
      }

      return result[0];
    }),

  create: adminProcedure
    .input(regulatoryBodySchema)
    .mutation(async ({ input }) => {
      // Check if name already exists
      const existing = await db
        .select()
        .from(regulatoryBody)
        .where(eq(regulatoryBody.name, input.name))
        .limit(1);

      if (existing[0]) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A regulatory body with this name already exists",
        });
      }

      const [newBody] = await db
        .insert(regulatoryBody)
        .values({
          ...input,
          lastUpdated: new Date(),
        })
        .returning();

      return newBody;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: regulatoryBodySchema,
      })
    )
    .mutation(async ({ input }) => {
      // Check if new name conflicts with existing
      const existing = await db
        .select()
        .from(regulatoryBody)
        .where(sql`${regulatoryBody.name} = ${input.data.name} AND ${regulatoryBody.id} != ${input.id}`)
        .limit(1);

      if (existing[0]) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A regulatory body with this name already exists",
        });
      }

      const [updatedBody] = await db
        .update(regulatoryBody)
        .set({
          ...input.data,
          lastUpdated: new Date(),
        })
        .where(eq(regulatoryBody.id, input.id))
        .returning();

      if (!updatedBody) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Regulatory body not found",
        });
      }

      return updatedBody;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const [deletedBody] = await db
        .delete(regulatoryBody)
        .where(eq(regulatoryBody.id, input.id))
        .returning();

      if (!deletedBody) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Regulatory body not found",
        });
      }

      return { success: true, deletedBody };
    }),

  // Get unique regions for filters
  getRegions: adminProcedure.query(async () => {
    const regions = await db
      .selectDistinct({ region: regulatoryBody.region })
      .from(regulatoryBody)
      .orderBy(regulatoryBody.region);

    return regions.map(r => r.region);
  }),

  bulkCreate: adminProcedure
    .input(
      z.object({
        bodies: z.array(regulatoryBodySchema),
      })
    )
    .mutation(async ({ input }) => {
      // Check for duplicates
      const names = input.bodies.map(b => b.name);
      
      const allBodies = await db
        .select({ name: regulatoryBody.name })
        .from(regulatoryBody);
      
      const existing = allBodies.filter(body => 
        names.some(name => body.name.toLowerCase() === name.toLowerCase())
      );

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `The following regulatory bodies already exist: ${existing.map(e => e.name).join(", ")}`,
        });
      }

      const bodiesWithTimestamp = input.bodies.map(bodyData => ({
        ...bodyData,
        lastUpdated: new Date(),
      }));

      const createdBodies = await db
        .insert(regulatoryBody)
        .values(bodiesWithTimestamp)
        .returning();

      return {
        success: true,
        created: createdBodies.length,
        bodies: createdBodies,
      };
    }),
});