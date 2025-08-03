import { createCallerFactory, createTRPCRouter } from "./trpc";
import { therapyRouter } from "./routers/therapy";
import { therapyAdminRouter } from "./routers/admin/therapy.admin";
import { approvalAdminRouter } from "./routers/admin/approval.admin";
import { revenueAdminRouter } from "./routers/admin/revenue.admin";
import { diseaseAdminRouter } from "./routers/admin/disease.admin";

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
