import { db } from "@/lib/db";
import { therapy, disease, therapyApproval, therapyRevenue, treatmentCenter } from "@/lib/db/schema";
import type { Therapy, Disease, TherapyApproval, TherapyRevenue, TreatmentCenter } from "@/lib/db/schema";

/**
 * Server-side data fetching for dashboard
 * This function runs on the server and directly queries the database
 * No API endpoints are exposed to the client
 */
export async function getDashboardData(): Promise<{
  therapies: Therapy[];
  diseases: Disease[];
  therapyApprovals: TherapyApproval[];
  therapyRevenue: TherapyRevenue[];
  treatmentCenters: TreatmentCenter[];
}> {
  try {
    const [therapies, diseases, approvals, revenue, centers] = await Promise.all([
      db.select().from(therapy),
      db.select().from(disease),
      db.select().from(therapyApproval),
      db.select().from(therapyRevenue),
      db.select().from(treatmentCenter),
    ]);

    return {
      therapies,
      diseases,
      therapyApprovals: approvals,
      therapyRevenue: revenue,
      treatmentCenters: centers,
    };
  } catch (error) {
    console.error('getDashboardData error:', error);
    // Return empty data structure on error to prevent page crash
    return {
      therapies: [],
      diseases: [],
      therapyApprovals: [],
      therapyRevenue: [],
      treatmentCenters: [],
    };
  }
}