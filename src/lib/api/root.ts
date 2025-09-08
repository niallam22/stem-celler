import { createCallerFactory, createTRPCRouter } from "./trpc";
import { therapyRouter } from "./routers/therapy";
import { therapyAdminRouter } from "./routers/admin/therapy.admin";
import { approvalAdminRouter } from "./routers/admin/approval.admin";
import { revenueAdminRouter } from "./routers/admin/revenue.admin";
import { diseaseAdminRouter } from "./routers/admin/disease.admin";
import { regulatoryBodyAdminRouter } from "./routers/admin/regulatoryBody.admin";
import { treatmentCenterAdminRouter } from "./routers/admin/treatmentCenter.admin";
import { documentAdminRouter } from "./routers/admin/document.admin";
import { extractionAdminRouter } from "./routers/admin/extraction.admin";
import { queueAdminRouter } from "./routers/admin/queue.admin";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  therapy: therapyRouter,
  admin: createTRPCRouter({
    therapy: therapyAdminRouter,
    approval: approvalAdminRouter,
    revenue: revenueAdminRouter,
    disease: diseaseAdminRouter,
    regulatoryBody: regulatoryBodyAdminRouter,
    treatmentCenter: treatmentCenterAdminRouter,
    document: documentAdminRouter,
    extraction: extractionAdminRouter,
    queue: queueAdminRouter,
  }),
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
