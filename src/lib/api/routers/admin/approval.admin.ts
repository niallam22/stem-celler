import { adminProcedure, createTRPCRouter } from "@/lib/api/trpc";
import { db } from "@/lib/db";
import {
  disease,
  regulatoryBody,
  therapy,
  therapyApproval,
} from "@/lib/db/schema";
import { TRPCError } from "@trpc/server";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

const approvalSchema = z.object({
  therapyName: z.string().min(1, "Therapy is required"),
  diseaseIndication: z.string().min(1, "Disease indication is required"),
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
        pageSize: z.number().min(1).max(1000).default(10),
        search: z.string().optional(),
        therapyId: z.string().optional(),
        region: z.string().optional(),
        regulatoryBody: z.string().optional(),
        sortBy: z
          .enum([
            "therapyName",
            "diseaseName",
            "region",
            "approvalDate",
            "regulatoryBody",
          ])
          .default("approvalDate"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ input }) => {
      const {
        page,
        pageSize,
        search,
        therapyId,
        region,
        regulatoryBody,
        sortBy,
        sortOrder,
      } = input;
      const offset = (page - 1) * pageSize;

      // Build where conditions
      const whereConditions = [];

      if (search) {
        whereConditions.push(
          sql`(${therapyApproval.therapyName} ILIKE ${`%${search}%`} OR ${
            therapyApproval.diseaseIndication
          } ILIKE ${`%${search}%`})`
        );
      }

      if (therapyId) {
        // therapyId is actually a therapy name now for filtering
        whereConditions.push(eq(therapyApproval.therapyName, therapyId));
      }

      if (region) {
        whereConditions.push(eq(therapyApproval.region, region));
      }

      if (regulatoryBody) {
        whereConditions.push(
          eq(therapyApproval.regulatoryBody, regulatoryBody)
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
        case "therapyName":
          orderByClause =
            sortOrder === "desc" ? desc(therapyApproval.therapyName) : therapyApproval.therapyName;
          break;
        case "diseaseName":
          orderByClause =
            sortOrder === "desc" ? desc(therapyApproval.diseaseIndication) : therapyApproval.diseaseIndication;
          break;
        case "region":
          orderByClause =
            sortOrder === "desc"
              ? desc(therapyApproval.region)
              : therapyApproval.region;
          break;
        case "regulatoryBody":
          orderByClause =
            sortOrder === "desc"
              ? desc(therapyApproval.regulatoryBody)
              : therapyApproval.regulatoryBody;
          break;
        default:
          orderByClause =
            sortOrder === "desc"
              ? desc(therapyApproval.approvalDate)
              : therapyApproval.approvalDate;
      }

      const [approvals, totalCount] = await Promise.all([
        db
          .select({
            id: therapyApproval.id,
            therapyId: therapyApproval.therapyId,
            diseaseId: therapyApproval.diseaseId,
            therapyName: therapyApproval.therapyName,
            diseaseIndication: therapyApproval.diseaseIndication,
            diseaseName: therapyApproval.diseaseIndication, // Use diseaseIndication for display
            region: therapyApproval.region,
            approvalDate: therapyApproval.approvalDate,
            approvalType: therapyApproval.approvalType,
            regulatoryBody: therapyApproval.regulatoryBody,
            sources: therapyApproval.sources,
            lastUpdated: therapyApproval.lastUpdated,
          })
          .from(therapyApproval)
          .where(whereClause)
          .orderBy(orderByClause)
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(therapyApproval)
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

  create: adminProcedure.input(approvalSchema).mutation(async ({ input }) => {
    // Look up therapy and disease IDs for backward compatibility
    const [therapyRecord] = await db
      .select({ id: therapy.id })
      .from(therapy)
      .where(eq(therapy.name, input.therapyName))
      .limit(1);

    const [diseaseRecord] = await db
      .select({ id: disease.id })
      .from(disease)
      .where(eq(disease.indication, input.diseaseIndication))
      .limit(1);

    if (!therapyRecord) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Therapy '${input.therapyName}' not found`,
      });
    }

    if (!diseaseRecord) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Disease with indication '${input.diseaseIndication}' not found`,
      });
    }

    const [newApproval] = await db
      .insert(therapyApproval)
      .values({
        therapyId: therapyRecord.id, // Keep for backward compatibility
        diseaseId: diseaseRecord.id, // Keep for backward compatibility
        therapyName: input.therapyName,
        diseaseIndication: input.diseaseIndication,
        region: input.region,
        approvalDate: input.approvalDate,
        approvalType: input.approvalType,
        regulatoryBody: input.regulatoryBody,
        sources: input.sources,
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
      // Verify therapy exists
      const [therapyRecord] = await db
        .select({ id: therapy.id })
        .from(therapy)
        .where(eq(therapy.name, input.data.therapyName))
        .limit(1);

      if (!therapyRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Therapy '${input.data.therapyName}' not found`,
        });
      }

      // Verify disease exists by indication
      const [diseaseRecord] = await db
        .select({ id: disease.id })
        .from(disease)
        .where(eq(disease.indication, input.data.diseaseIndication))
        .limit(1);

      if (!diseaseRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Disease with indication '${input.data.diseaseIndication}' not found`,
        });
      }

      const [updatedApproval] = await db
        .update(therapyApproval)
        .set({
          therapyId: therapyRecord.id, // Still required by schema for now
          diseaseId: diseaseRecord.id, // Still required by schema for now
          therapyName: input.data.therapyName,
          diseaseIndication: input.data.diseaseIndication,
          region: input.data.region,
          approvalDate: input.data.approvalDate,
          approvalType: input.data.approvalType,
          regulatoryBody: input.data.regulatoryBody,
          sources: input.data.sources,
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
      db
        .select({ name: therapy.name })
        .from(therapy)
        .orderBy(therapy.name),
      db
        .select({ indication: disease.indication, name: disease.name })
        .from(disease)
        .orderBy(disease.name),
    ]);

    // Only return unique indications
    const uniqueIndications = [...new Set(diseases
      .map(d => d.indication)
      .filter(indication => indication !== null)
    )];

    return { 
      therapies: therapies.map(t => ({ name: t.name })),
      diseaseIndications: uniqueIndications.sort()
    };
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
      regions: regions.map((r) => r.region),
      regulatoryBodies: regulatoryBodies.map((rb) => rb.regulatoryBody),
    };
  }),

  bulkCreate: adminProcedure
    .input(
      z.object({
        approvals: z.array(approvalSchema),
      })
    )
    .mutation(async ({ input }) => {
      const validationErrors: Array<{
        row: number;
        field: string;
        message: string;
      }> = [];

      // 1. Check date validation (not in future)
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      input.approvals.forEach((approval, index) => {
        if (approval.approvalDate > today) {
          validationErrors.push({
            row: index + 1,
            field: "approvalDate",
            message: "Approval date cannot be in the future",
          });
        }
      });

      // 2. Get all unique therapy names and disease indications
      const therapyNames = [
        ...new Set(input.approvals.map((a) => a.therapyName.toLowerCase())),
      ];

      const diseaseIndications = [
        ...new Set(input.approvals.map((a) => a.diseaseIndication.toUpperCase())),
      ];

      // 3. Check if therapies exist (case-insensitive by name)
      const allTherapies = await db
        .select({ id: therapy.id, name: therapy.name })
        .from(therapy);

      console.log("allTherapies from database:", allTherapies);
      console.log("therapyNames we're looking for:", therapyNames);

      const existingTherapies = allTherapies.filter(t => 
        therapyNames.some(name => t.name.toLowerCase() === name.toLowerCase())
      );

      console.log("existingTherapies after filter:", existingTherapies);

      const existingTherapyNames = new Set(
        existingTherapies.map((t) => t.name.toLowerCase())
      );

      // 4. Check if diseases exist by indication (case-insensitive)
      const allDiseases = await db
        .select({
          id: disease.id,
          name: disease.name,
          indication: disease.indication,
        })
        .from(disease);

      console.log("allDiseases from database:", allDiseases);
      console.log("diseaseIndications we're looking for:", diseaseIndications);

      const existingDiseases = allDiseases.filter(d => 
        diseaseIndications.some(indication => 
          d.indication?.toUpperCase() === indication.toUpperCase()
        )
      );

      console.log("existingDiseases after filter:", existingDiseases);

      const indicationToId = new Map(
        existingDiseases.map((d) => [d.indication?.toUpperCase() || "", d.id])
      );

      // 5. Check regulatory bodies exist
      const regulatoryBodies = [
        ...new Set(input.approvals.map((a) => a.regulatoryBody)),
      ];

      const allRegulatoryBodies = await db
        .select({ name: regulatoryBody.name, region: regulatoryBody.region })
        .from(regulatoryBody);

      console.log("allRegulatoryBodies from database:", allRegulatoryBodies);
      console.log("regulatoryBodies we're looking for:", regulatoryBodies);

      const existingBodies = allRegulatoryBodies.filter(b => 
        regulatoryBodies.some(bodyName => 
          b.name.toUpperCase() === bodyName.toUpperCase()
        )
      );

      console.log("existingBodies after filter:", existingBodies);

      const bodyToRegion = new Map(
        existingBodies.map((b) => [b.name, b.region])
      );

      // 6. Validate each approval and prepare for insertion
      const processedApprovals: Array<{
        therapyId: string;
        diseaseId: string;
        therapyName: string;
        diseaseIndication: string;
        region: string;
        approvalDate: Date;
        approvalType: string;
        regulatoryBody: string;
        sources: string[];
        lastUpdated: Date;
      }> = [];

      for (let i = 0; i < input.approvals.length; i++) {
        const approval = input.approvals[i];
        const rowNum = i + 1;

        // Check therapy exists
        if (!existingTherapyNames.has(approval.therapyName.toLowerCase())) {
          validationErrors.push({
            row: rowNum,
            field: "therapyName",
            message: `Therapy '${approval.therapyName}' not found`,
          });
        }

        // Check disease exists by indication
        const diseaseId = indicationToId.get(approval.diseaseIndication.toUpperCase());
        if (!diseaseId) {
          validationErrors.push({
            row: rowNum,
            field: "diseaseIndication",
            message: `Disease indication '${approval.diseaseIndication}' not found`,
          });
        }

        // Check regulatory body exists
        if (!bodyToRegion.has(approval.regulatoryBody)) {
          validationErrors.push({
            row: rowNum,
            field: "regulatoryBody",
            message: `Regulatory body '${approval.regulatoryBody}' not found`,
          });
        } else {
          // Check region matches regulatory body
          const expectedRegion = bodyToRegion.get(approval.regulatoryBody);
          if (expectedRegion && expectedRegion !== approval.region) {
            validationErrors.push({
              row: rowNum,
              field: "region",
              message: `Region '${approval.region}' doesn't match regulatory body ${approval.regulatoryBody}'s region '${expectedRegion}'`,
            });
          }
        }

        // Prepare the processed approval with actual IDs
        if (!validationErrors.some((e) => e.row === rowNum)) {
          // Find the actual therapy ID (case-insensitive match by name)
          const actualTherapy = existingTherapies.find(
            (t) => t.name.toLowerCase() === approval.therapyName.toLowerCase()
          );

          if (actualTherapy && diseaseId) {
            processedApprovals.push({
              therapyId: actualTherapy.id,
              diseaseId: diseaseId,
              therapyName: approval.therapyName,
              diseaseIndication: approval.diseaseIndication,
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

      // 7. Check for duplicates
      if (processedApprovals.length > 0) {
        const duplicateCheck = await db
          .select({
            therapyName: therapyApproval.therapyName,
            diseaseIndication: therapyApproval.diseaseIndication,
            region: therapyApproval.region,
          })
          .from(therapyApproval)
          .where(
            sql`(${therapyApproval.therapyName}, ${therapyApproval.diseaseIndication}, ${
              therapyApproval.region
            }) IN (
              ${sql.join(
                processedApprovals.map(
                  (a) => sql`(${a.therapyName}, ${a.diseaseIndication}, ${a.region})`
                ),
                sql`, `
              )}
            )`
          );

        if (duplicateCheck.length > 0) {
          duplicateCheck.forEach((dup) => {
            const matchingInput = input.approvals.findIndex((a) => 
              a.therapyName === dup.therapyName &&
              a.diseaseIndication === dup.diseaseIndication &&
              a.region === dup.region
            );

            if (matchingInput !== -1) {
              validationErrors.push({
                row: matchingInput + 1,
                field: "duplicate",
                message: `Approval already exists for ${dup.therapyName} + ${dup.diseaseIndication} in ${dup.region}`,
              });
            }
          });
        }
      }

      // If there are validation errors, throw with detailed message
      if (validationErrors.length > 0) {
        const errorMessage = validationErrors
          .map((e) => `Row ${e.row}: ${e.message}`)
          .join("\n");

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Validation failed:\n${errorMessage}`,
        });
      }

      // Insert valid approvals
      const createdApprovals = await db
        .insert(therapyApproval)
        .values(processedApprovals)
        .returning();

      return {
        success: true,
        created: createdApprovals.length,
        approvals: createdApprovals,
      };
    }),
});
