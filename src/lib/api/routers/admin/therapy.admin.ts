import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "@/lib/api/trpc";
import { db } from "@/lib/db";
import { therapy, therapyApproval, therapyRevenue } from "@/lib/db/schema";
import { eq, like, desc, sql, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const therapySchema = z.object({
  name: z.string().min(1, "Name is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  mechanism: z.string().min(1, "Mechanism is required"),
  pricePerTreatmentUsd: z.number().positive("Price must be positive"),
  sources: z.array(z.string()).min(1, "At least one source is required"),
});

export const therapyAdminRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        sortBy: z.enum(["name", "manufacturer", "pricePerTreatmentUsd", "lastUpdated"]).default("name"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, search, sortBy, sortOrder } = input;
      const offset = (page - 1) * pageSize;

      const whereClause = search
        ? like(therapy.name, `%${search}%`)
        : undefined;

      const [therapies, totalCount] = await Promise.all([
        db
          .select()
          .from(therapy)
          .where(whereClause)
          .orderBy(
            sortOrder === "desc" 
              ? desc(therapy[sortBy])
              : therapy[sortBy]
          )
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(therapy)
          .where(whereClause),
      ]);

      return {
        therapies,
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
        .from(therapy)
        .where(eq(therapy.id, input.id))
        .limit(1);

      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Therapy not found",
        });
      }

      return result[0];
    }),

  create: adminProcedure
    .input(therapySchema)
    .mutation(async ({ input }) => {
      const [newTherapy] = await db
        .insert(therapy)
        .values({
          ...input,
          lastUpdated: new Date(),
        })
        .returning();

      return newTherapy;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: therapySchema,
      })
    )
    .mutation(async ({ input }) => {
      const [updatedTherapy] = await db
        .update(therapy)
        .set({
          ...input.data,
          lastUpdated: new Date(),
        })
        .where(eq(therapy.id, input.id))
        .returning();

      if (!updatedTherapy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Therapy not found",
        });
      }

      return updatedTherapy;
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
      const [approvalCount, revenueCount] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(therapyApproval)
          .where(eq(therapyApproval.therapyId, input.id)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(therapyRevenue)
          .where(eq(therapyRevenue.therapyId, input.id)),
      ]);

      const hasRelatedRecords = 
        (approvalCount[0]?.count ?? 0) > 0 || 
        (revenueCount[0]?.count ?? 0) > 0;

      if (hasRelatedRecords && !input.cascade) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `This therapy has ${approvalCount[0]?.count ?? 0} approval(s) and ${revenueCount[0]?.count ?? 0} revenue record(s). Delete with cascade option to remove all related records.`,
        });
      }

      // If cascade is true, delete related records first
      if (input.cascade) {
        await Promise.all([
          db.delete(therapyApproval).where(eq(therapyApproval.therapyId, input.id)),
          db.delete(therapyRevenue).where(eq(therapyRevenue.therapyId, input.id)),
        ]);
      }

      const [deletedTherapy] = await db
        .delete(therapy)
        .where(eq(therapy.id, input.id))
        .returning();

      if (!deletedTherapy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Therapy not found",
        });
      }

      return { success: true, deletedTherapy };
    }),

  // Get counts for dashboard
  getCounts: adminProcedure.query(async () => {
    const [therapyCount, approvalCount, revenueCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(therapy),
      db.select({ count: sql<number>`count(*)` }).from(therapyApproval),
      db.select({ count: sql<number>`count(*)` }).from(therapyRevenue),
    ]);

    return {
      therapies: therapyCount[0]?.count ?? 0,
      approvals: approvalCount[0]?.count ?? 0,
      revenueRecords: revenueCount[0]?.count ?? 0,
    };
  }),
});