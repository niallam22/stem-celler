import dotenv from "dotenv";

// Load .env.local first, then .env as fallback
dotenv.config({ path: ".env.local" });
dotenv.config();

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { therapy, disease, therapyApproval, therapyRevenue } from "../src/lib/db/schema";
import { therapies, diseases, therapyApprovals, therapyRevenue as therapyRevenueData } from "../src/components/graphs/therapy-data";

// Create dedicated connection for seeding to avoid shared connection issues
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function seed() {
  console.log("🌱 Starting seed...");

  try {
    // Seed therapies
    console.log("Seeding therapies...");
    for (const t of therapies) {
      console.log(`Inserting therapy: ${t.name}`);
      await db.insert(therapy).values({
        id: t.id,
        name: t.name,
        manufacturer: t.manufacturer,
        mechanism: t.mechanism,
        pricePerTreatmentUsd: t.price_per_treatment_usd,
        sources: t.sources,
        lastUpdated: new Date(t.last_updated),
      }).onConflictDoNothing();
    }

    // Seed diseases
    console.log("Seeding diseases...");
    for (const d of diseases) {
      await db.insert(disease).values({
        id: d.id,
        name: d.name,
        category: d.category,
        subcategory: d.subcategory || null,
        icd10Code: d.icd_10_code || null,
        annualIncidenceUs: d.annual_incidence_us || null,
        sources: d.sources,
        lastUpdated: new Date(d.last_updated),
      }).onConflictDoNothing();
    }

    // Seed therapy approvals
    console.log("Seeding therapy approvals...");
    for (const ta of therapyApprovals) {
      await db.insert(therapyApproval).values({
        id: ta.id,
        therapyId: ta.therapy_id,
        diseaseId: ta.disease_id,
        region: ta.region,
        approvalDate: new Date(ta.approval_date),
        approvalType: ta.approval_type,
        regulatoryBody: ta.regulatory_body,
        sources: ta.sources,
        lastUpdated: new Date(ta.last_updated),
      }).onConflictDoNothing();
    }

    // Seed therapy revenue
    console.log("Seeding therapy revenue...");
    for (const tr of therapyRevenueData) {
      await db.insert(therapyRevenue).values({
        id: tr.id,
        therapyId: tr.therapy_id,
        period: tr.period,
        region: tr.region,
        revenueMillionsUsd: tr.revenue_millions_usd,
        sources: tr.sources,
        lastUpdated: new Date(tr.last_updated),
      }).onConflictDoNothing();
    }

    console.log("✅ Seed completed successfully!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }

  process.exit(0);
}

// Run the seed
seed();