import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "@/lib/api/trpc";
import { db } from "@/lib/db";
import { jobQueue, document } from "@/lib/db/schema";
import { eq, desc, sql, and, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const queueAdminRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        status: z.enum(["pending", "processing", "completed", "failed", "all"]).default("all"),
        sortBy: z.enum(["priority", "createdAt", "startedAt"]).default("priority"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, status, sortBy, sortOrder } = input;
      const offset = (page - 1) * pageSize;

      // Build where conditions
      const whereClause = status !== "all" 
        ? eq(jobQueue.status, status)
        : undefined;

      // Build order by clause
      let orderByClause;
      switch (sortBy) {
        case "createdAt":
          orderByClause = sortOrder === "desc" ? desc(jobQueue.createdAt) : jobQueue.createdAt;
          break;
        case "startedAt":
          orderByClause = sortOrder === "desc" ? desc(jobQueue.startedAt) : jobQueue.startedAt;
          break;
        default: // priority
          // For priority, ascending means high priority first (1, 2, 3)
          orderByClause = sortOrder === "asc" 
            ? sql`${jobQueue.priority} ASC, ${jobQueue.createdAt} ASC`
            : sql`${jobQueue.priority} DESC, ${jobQueue.createdAt} DESC`;
      }

      // Fetch jobs with document info
      const jobs = await db
        .select({
          job: jobQueue,
          document: document,
        })
        .from(jobQueue)
        .innerJoin(document, eq(jobQueue.documentId, document.id))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(pageSize + 1)
        .offset(offset);

      const hasNextPage = jobs.length > pageSize;
      const actualJobs = hasNextPage ? jobs.slice(0, pageSize) : jobs;

      return {
        jobs: actualJobs.map(j => ({
          ...j.job,
          document: j.document,
          priorityLabel: j.job.priority === 1 ? "high" : j.job.priority === 2 ? "medium" : "low",
        })),
        hasNextPage,
        hasPreviousPage: page > 1,
        currentPage: page,
      };
    }),

  getStats: adminProcedure.query(async () => {
    const stats = await db
      .select({
        status: jobQueue.status,
        count: sql<number>`count(*)`,
      })
      .from(jobQueue)
      .groupBy(jobQueue.status);

    const statMap = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    stats.forEach(s => {
      statMap[s.status as keyof typeof statMap] = Number(s.count);
    });

    // Get average processing time for completed jobs
    const [avgTime] = await db
      .select({
        avgMinutes: sql<number>`
          AVG(EXTRACT(EPOCH FROM (${jobQueue.completedAt} - ${jobQueue.startedAt})) / 60)
        `,
      })
      .from(jobQueue)
      .where(
        and(
          eq(jobQueue.status, "completed"),
          sql`${jobQueue.completedAt} IS NOT NULL`,
          sql`${jobQueue.startedAt} IS NOT NULL`
        )
      );

    // Check for stuck jobs
    const stuckTimeoutMinutes = parseInt(process.env.QUEUE_STUCK_JOB_TIMEOUT_MINUTES || '60');
    const [stuckCount] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(jobQueue)
      .where(
        and(
          eq(jobQueue.status, "processing"),
          sql`${jobQueue.startedAt} < NOW() - ${sql.raw(`INTERVAL '${stuckTimeoutMinutes} minutes'`)}`
        )
      );

    return {
      ...statMap,
      stuck: Number(stuckCount?.count || 0),
      total: statMap.pending + statMap.processing + statMap.completed + statMap.failed,
      avgProcessingTimeMinutes: avgTime?.avgMinutes ? Math.round(avgTime.avgMinutes) : null,
    };
  }),

  retry: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const [job] = await db
        .select()
        .from(jobQueue)
        .where(eq(jobQueue.id, input.id))
        .limit(1);

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      if (job.status !== "failed") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Can only retry failed jobs",
        });
      }

      if (job.attempts !== null && job.maxAttempts !== null && job.attempts >= job.maxAttempts) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Maximum retry attempts reached",
        });
      }

      const [updated] = await db
        .update(jobQueue)
        .set({
          status: "pending",
          error: null,
          startedAt: null,
          completedAt: null,
        })
        .where(eq(jobQueue.id, input.id))
        .returning();

      return updated;
    }),

  cancel: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const [job] = await db
        .select()
        .from(jobQueue)
        .where(eq(jobQueue.id, input.id))
        .limit(1);

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      if (job.status === "completed") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot cancel completed jobs",
        });
      }

      // Mark as cancelled (which is a type of failed status)
      const [updated] = await db
        .update(jobQueue)
        .set({
          status: "failed",
          error: "Job cancelled by admin",
          completedAt: new Date(),
        })
        .where(eq(jobQueue.id, input.id))
        .returning();

      return { success: true, job: updated };
    }),

  reset: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const [job] = await db
        .select()
        .from(jobQueue)
        .where(eq(jobQueue.id, input.id))
        .limit(1);

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      if (job.status !== "processing" && job.status !== "failed") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Can only reset processing or failed jobs",
        });
      }

      const [updated] = await db
        .update(jobQueue)
        .set({
          status: "pending",
          error: `Job reset by admin at ${new Date().toISOString()}. Previous error: ${job.error || 'None'}`,
          startedAt: null,
          completedAt: null,
        })
        .where(eq(jobQueue.id, input.id))
        .returning();

      return updated;
    }),

  // Update job status (used by background worker)
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["processing", "completed", "failed"]),
        error: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const updateData: any = {
        status: input.status,
      };

      if (input.status === "processing") {
        updateData.startedAt = new Date();
      } else if (input.status === "completed") {
        updateData.completedAt = new Date();
      } else if (input.status === "failed") {
        updateData.error = input.error;
        updateData.attempts = sql`${jobQueue.attempts} + 1`;
      }

      const [updated] = await db
        .update(jobQueue)
        .set(updateData)
        .where(eq(jobQueue.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      return updated;
    }),

  // Get next job (used by background worker)
  getNext: adminProcedure
    .mutation(async () => {
      // Use PostgreSQL's UPDATE ... RETURNING to atomically claim a job
      const [job] = await db.execute<typeof jobQueue.$inferSelect & { document: typeof document.$inferSelect }>(
        sql`
          UPDATE ${jobQueue}
          SET status = 'processing', ${jobQueue.startedAt} = NOW()
          WHERE id = (
            SELECT ${jobQueue.id}
            FROM ${jobQueue}
            WHERE ${jobQueue.status} = 'pending'
            ORDER BY ${jobQueue.priority} ASC, ${jobQueue.createdAt} ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          )
          RETURNING ${jobQueue}.*, (
            SELECT row_to_json(d.*)
            FROM ${document} d
            WHERE d.id = ${jobQueue.documentId}
          ) as document
        `
      );

      return job || null;
    }),

  // Clean up old completed jobs
  cleanup: adminProcedure
    .input(
      z.object({
        olderThanDays: z.number().min(1).default(30),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db
        .delete(jobQueue)
        .where(
          and(
            eq(jobQueue.status, "completed"),
            sql`${jobQueue.completedAt} < NOW() - INTERVAL '${input.olderThanDays} days'`
          )
        )
        .returning();

      return {
        deletedCount: result.length,
      };
    }),
});