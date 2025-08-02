import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "@/lib/db";
import { therapy, disease, therapyApproval, therapyRevenue } from "@/lib/db/schema";
import { eq, inArray, and } from "drizzle-orm";

export const therapyRouter = createTRPCRouter({
  // Get all therapies
  getAllTherapies: publicProcedure.query(async () => {
    return await db.select().from(therapy);
  }),

  // Get all diseases
  getAllDiseases: publicProcedure.query(async () => {
    return await db.select().from(disease);
  }),

  // Get all therapy approvals with optional filters
  getAllTherapyApprovals: publicProcedure
    .input(z.object({
      therapyIds: z.array(z.string()).optional(),
      diseaseIds: z.array(z.string()).optional(),
      regions: z.array(z.string()).optional(),
      approvalTypes: z.array(z.string()).optional(),
      regulatoryBodies: z.array(z.string()).optional(),
    }).optional())
    .query(async ({ input }) => {
      let conditions = [];
      
      if (input?.therapyIds?.length) {
        conditions.push(inArray(therapyApproval.therapyId, input.therapyIds));
      }
      if (input?.diseaseIds?.length) {
        conditions.push(inArray(therapyApproval.diseaseId, input.diseaseIds));
      }
      if (input?.regions?.length) {
        conditions.push(inArray(therapyApproval.region, input.regions));
      }
      if (input?.approvalTypes?.length) {
        conditions.push(inArray(therapyApproval.approvalType, input.approvalTypes));
      }
      if (input?.regulatoryBodies?.length) {
        conditions.push(inArray(therapyApproval.regulatoryBody, input.regulatoryBodies));
      }

      if (conditions.length > 0) {
        return await db.select().from(therapyApproval).where(and(...conditions));
      }
      
      return await db.select().from(therapyApproval);
    }),

  // Get all therapy revenue data with optional filters
  getAllTherapyRevenue: publicProcedure
    .input(z.object({
      therapyIds: z.array(z.string()).optional(),
      regions: z.array(z.string()).optional(),
      periods: z.array(z.string()).optional(),
    }).optional())
    .query(async ({ input }) => {
      let conditions = [];
      
      if (input?.therapyIds?.length) {
        conditions.push(inArray(therapyRevenue.therapyId, input.therapyIds));
      }
      if (input?.regions?.length) {
        conditions.push(inArray(therapyRevenue.region, input.regions));
      }
      if (input?.periods?.length) {
        conditions.push(inArray(therapyRevenue.period, input.periods));
      }

      if (conditions.length > 0) {
        return await db.select().from(therapyRevenue).where(and(...conditions));
      }
      
      return await db.select().from(therapyRevenue);
    }),

  // Get complete dashboard data in one query
  getDashboardData: publicProcedure.query(async () => {
    console.log('getDashboardData called on server');
    
    try {
      const [therapies, diseases, approvals, revenue] = await Promise.all([
        db.select().from(therapy),
        db.select().from(disease),
        db.select().from(therapyApproval),
        db.select().from(therapyRevenue),
      ]);

      console.log('getDashboardData results:', {
        therapies: therapies.length,
        diseases: diseases.length,
        approvals: approvals.length,
        revenue: revenue.length,
      });

      return {
        therapies,
        diseases,
        therapyApprovals: approvals,
        therapyRevenue: revenue,
      };
    } catch (error) {
      console.error('getDashboardData error:', error);
      throw error;
    }
  }),
});