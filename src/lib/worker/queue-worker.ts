import { db } from "@/lib/db";
import { jobQueue, document, extraction } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { DocumentProcessor } from "./document-processor";

export class QueueWorker {
  private isRunning = false;
  private processor: DocumentProcessor;
  private pollInterval: number;
  private checkStuckInterval: number;
  private stuckJobTimeoutMinutes: number;
  private extractionTimeoutMinutes: number;
  private reprocessingTimeoutMinutes: number;
  private lastStuckCheck = Date.now();

  constructor() {
    this.processor = new DocumentProcessor();
    
    // Read configuration from environment variables
    this.pollInterval = parseInt(process.env.QUEUE_POLL_INTERVAL_MS || '5000');
    this.checkStuckInterval = parseInt(process.env.QUEUE_CHECK_STUCK_INTERVAL_MS || '60000');
    this.stuckJobTimeoutMinutes = parseInt(process.env.QUEUE_STUCK_JOB_TIMEOUT_MINUTES || '60');
    this.extractionTimeoutMinutes = parseInt(process.env.QUEUE_EXTRACTION_TIMEOUT_MINUTES || '30');
    this.reprocessingTimeoutMinutes = parseInt(process.env.QUEUE_REPROCESSING_TIMEOUT_MINUTES || '45');
    
    console.log('Queue Worker Configuration:');
    console.log(`  Poll Interval: ${this.pollInterval}ms`);
    console.log(`  Check Stuck Interval: ${this.checkStuckInterval}ms`);
    console.log(`  Stuck Job Timeout: ${this.stuckJobTimeoutMinutes} minutes`);
    console.log(`  Extraction Timeout: ${this.extractionTimeoutMinutes} minutes`);
    console.log(`  Reprocessing Timeout: ${this.reprocessingTimeoutMinutes} minutes`);
  }

  async start() {
    if (this.isRunning) {
      console.log("Queue worker is already running");
      return;
    }

    this.isRunning = true;
    console.log("Starting queue worker...");
    
    // Recover any stuck jobs from previous runs
    await this.recoverStuckJobs();
    
    // Start polling
    this.poll();
  }

  async stop() {
    this.isRunning = false;
    console.log("Stopping queue worker...");
  }

  private async poll() {
    if (!this.isRunning) return;

    try {
      // Check for stuck jobs periodically
      const now = Date.now();
      if (now - this.lastStuckCheck > this.checkStuckInterval) {
        await this.checkAndRecoverStuckJobs();
        this.lastStuckCheck = now;
      }
      
      const job = await this.getNextJob();
      
      if (job) {
        await this.processJob(job);
      }
    } catch (error) {
      console.error("Queue worker error:", error);
    }

    // Schedule next poll
    setTimeout(() => this.poll(), this.pollInterval);
  }

  private async getNextJob() {
    // Use PostgreSQL's UPDATE ... RETURNING to atomically claim a job
    const [job] = await db.execute(
      sql`
        UPDATE ${jobQueue}
        SET status = 'processing', "startedAt" = NOW()
        WHERE id = (
          SELECT ${jobQueue.id}
          FROM ${jobQueue}
          WHERE ${jobQueue.status} = 'pending'
          ORDER BY ${jobQueue.priority} ASC, ${jobQueue.createdAt} ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *
      `
    );

    return job as (typeof jobQueue.$inferSelect) | undefined;
  }

  private async processJob(job: typeof jobQueue.$inferSelect) {
    console.log(`Processing job ${job.id} for document ${job.documentId}`);

    try {
      // Get document details
      const [doc] = await db
        .select()
        .from(document)
        .where(eq(document.id, job.documentId))
        .limit(1);

      if (!doc) {
        throw new Error(`Document ${job.documentId} not found`);
      }

      // Process based on job type
      let result;
      switch (job.jobType) {
        case "extraction":
          result = await this.processor.extractFromDocument(doc);
          break;
        case "reprocessing":
          result = await this.processor.reprocessDocument(doc);
          break;
        default:
          throw new Error(`Unknown job type: ${job.jobType}`);
      }

      // Store extraction result
      await this.storeExtractionResult(job.documentId, result);

      // Mark job as completed
      await this.completeJob(job.id);

      console.log(`Completed job ${job.id}`);
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      await this.failJob(job.id, error instanceof Error ? error.message : "Unknown error");
    }
  }

  private async storeExtractionResult(documentId: string, extractedData: any) {
    // Check if extraction already exists
    const existing = await db
      .select()
      .from(extraction)
      .where(eq(extraction.documentId, documentId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing extraction
      await db
        .update(extraction)
        .set({
          extractedData,
          requiresReview: true,
          updatedAt: new Date(),
        })
        .where(eq(extraction.documentId, documentId));
    } else {
      // Create new extraction
      await db.insert(extraction).values({
        documentId,
        extractedData,
        requiresReview: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  private async completeJob(jobId: string) {
    await db
      .update(jobQueue)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(jobQueue.id, jobId));
  }

  private async failJob(jobId: string, error: string) {
    // Get current job to check attempts
    const [job] = await db
      .select()
      .from(jobQueue)
      .where(eq(jobQueue.id, jobId))
      .limit(1);

    if (!job) return;

    const newAttempts = (job.attempts || 0) + 1;
    
    if (job.maxAttempts !== null && newAttempts >= job.maxAttempts) {
      // Max attempts reached, mark as failed
      await db
        .update(jobQueue)
        .set({
          status: "failed",
          error,
          attempts: newAttempts,
        })
        .where(eq(jobQueue.id, jobId));
    } else {
      // Retry later
      await db
        .update(jobQueue)
        .set({
          status: "pending",
          error,
          attempts: newAttempts,
          startedAt: null,
        })
        .where(eq(jobQueue.id, jobId));
    }
  }

  // Recover stuck jobs on startup
  private async recoverStuckJobs() {
    console.log("Checking for stuck jobs from previous runs...");
    
    const stuckJobs = await db
      .select()
      .from(jobQueue)
      .where(
        sql`${jobQueue.status} = 'processing' AND 
            ${jobQueue.startedAt} < NOW() - ${sql.raw(`INTERVAL '${this.stuckJobTimeoutMinutes} minutes'`)}`
      );
    
    if (stuckJobs.length > 0) {
      console.log(`Found ${stuckJobs.length} stuck jobs, recovering...`);
      
      for (const job of stuckJobs) {
        const newAttempts = (job.attempts || 0) + 1;
        const errorMsg = `Job was stuck (processing for more than ${this.stuckJobTimeoutMinutes} minutes). Recovered at ${new Date().toISOString()}`;
        
        if (job.maxAttempts !== null && newAttempts >= job.maxAttempts) {
          // Max attempts reached, mark as failed
          await db
            .update(jobQueue)
            .set({
              status: "failed",
              error: errorMsg,
              attempts: newAttempts,
            })
            .where(eq(jobQueue.id, job.id));
          
          console.log(`Job ${job.id} marked as failed (max attempts reached)`);
        } else {
          // Reset to pending for retry
          await db
            .update(jobQueue)
            .set({
              status: "pending",
              error: errorMsg,
              attempts: newAttempts,
              startedAt: null,
            })
            .where(eq(jobQueue.id, job.id));
          
          console.log(`Job ${job.id} reset to pending (attempt ${newAttempts}/${job.maxAttempts})`);
        }
      }
    } else {
      console.log("No stuck jobs found");
    }
  }
  
  // Check and recover stuck jobs periodically
  private async checkAndRecoverStuckJobs() {
    const stuckJobs = await db
      .select()
      .from(jobQueue)
      .where(
        sql`${jobQueue.status} = 'processing' AND 
            ${jobQueue.startedAt} < NOW() - ${sql.raw(`INTERVAL '${this.getTimeoutForJobType()} minutes'`)}`
      );
    
    if (stuckJobs.length > 0) {
      console.log(`Found ${stuckJobs.length} stuck jobs during periodic check`);
      
      for (const job of stuckJobs) {
        const timeout = job.jobType === 'reprocessing' 
          ? this.reprocessingTimeoutMinutes 
          : this.extractionTimeoutMinutes;
        
        const newAttempts = (job.attempts || 0) + 1;
        const errorMsg = `Job exceeded timeout (${timeout} minutes). Recovered at ${new Date().toISOString()}`;
        
        if (job.maxAttempts !== null && newAttempts >= job.maxAttempts) {
          await db
            .update(jobQueue)
            .set({
              status: "failed",
              error: errorMsg,
              attempts: newAttempts,
            })
            .where(eq(jobQueue.id, job.id));
          
          console.log(`Job ${job.id} marked as failed (timeout exceeded, max attempts reached)`);
        } else {
          await db
            .update(jobQueue)
            .set({
              status: "pending",
              error: errorMsg,
              attempts: newAttempts,
              startedAt: null,
            })
            .where(eq(jobQueue.id, job.id));
          
          console.log(`Job ${job.id} reset to pending (timeout exceeded, attempt ${newAttempts}/${job.maxAttempts})`);
        }
      }
    }
  }
  
  private getTimeoutForJobType(): number {
    // This returns the minimum timeout for the SQL query
    return Math.min(this.extractionTimeoutMinutes, this.reprocessingTimeoutMinutes);
  }

  // Cleanup old completed jobs (can be called periodically)
  async cleanup(olderThanDays = 30) {
    const result = await db
      .delete(jobQueue)
      .where(
        sql`${jobQueue.status} = 'completed' AND ${jobQueue.completedAt} < NOW() - ${sql.raw(`INTERVAL '${olderThanDays} days'`)}`
      )
      .returning();

    console.log(`Cleaned up ${result.length} old jobs`);
    return result.length;
  }
}

// Singleton instance
let workerInstance: QueueWorker | null = null;

export function getWorkerInstance(): QueueWorker {
  if (!workerInstance) {
    workerInstance = new QueueWorker();
  }
  return workerInstance;
}