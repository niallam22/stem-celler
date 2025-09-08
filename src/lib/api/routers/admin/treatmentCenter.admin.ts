import { z } from "zod";
import { adminProcedure, createTRPCRouter, publicProcedure } from "@/lib/api/trpc";
import { db } from "@/lib/db";
import { treatmentCenter } from "@/lib/db/schema";
import { eq, like, desc, sql, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Geocoding function using OpenStreetMap Nominatim API
async function geocodeAddress(address: string): Promise<{ lat: string; lng: string }> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'StemCellerApp/1.0' // Required by Nominatim
        }
      }
    );
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: data[0].lat,
        lng: data[0].lon,
      };
    }
    
    throw new Error("Address not found");
  } catch (error) {
    console.error("Geocoding error:", error);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Failed to geocode address. Please verify the address is correct.",
    });
  }
}

const treatmentCenterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  availableTherapies: z.array(z.string()).min(1, "At least one therapy is required"),
  website: z.string().optional(),
  phone: z.string().optional(),
  about: z.string().optional(),
});

export const treatmentCenterAdminRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        sortBy: z.enum(["name", "address", "lastUpdated"]).default("name"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, search, sortBy, sortOrder } = input;
      const offset = (page - 1) * pageSize;

      const whereClause = search
        ? or(
            like(treatmentCenter.name, `%${search}%`),
            like(treatmentCenter.address, `%${search}%`)
          )
        : undefined;

      const [centers, totalCount] = await Promise.all([
        db
          .select()
          .from(treatmentCenter)
          .where(whereClause)
          .orderBy(
            sortOrder === "desc" 
              ? desc(treatmentCenter[sortBy])
              : treatmentCenter[sortBy]
          )
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(treatmentCenter)
          .where(whereClause),
      ]);

      return {
        centers,
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
        .from(treatmentCenter)
        .where(eq(treatmentCenter.id, input.id))
        .limit(1);

      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Treatment center not found",
        });
      }

      return result[0];
    }),

  create: adminProcedure
    .input(treatmentCenterSchema)
    .mutation(async ({ input }) => {
      // Geocode the address to get coordinates
      const coordinates = await geocodeAddress(input.address);

      const [newCenter] = await db
        .insert(treatmentCenter)
        .values({
          ...input,
          lat: coordinates.lat,
          lng: coordinates.lng,
          lastUpdated: new Date(),
        })
        .returning();

      return newCenter;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: treatmentCenterSchema,
      })
    )
    .mutation(async ({ input }) => {
      // Check if address changed to re-geocode
      const existing = await db
        .select({ address: treatmentCenter.address })
        .from(treatmentCenter)
        .where(eq(treatmentCenter.id, input.id))
        .limit(1);

      let coordinates: { lat: string; lng: string } | undefined;
      
      if (existing[0] && existing[0].address !== input.data.address) {
        // Address changed, re-geocode
        coordinates = await geocodeAddress(input.data.address);
      }

      const updateData = coordinates 
        ? {
            ...input.data,
            lat: coordinates.lat,
            lng: coordinates.lng,
            lastUpdated: new Date(),
          }
        : {
            ...input.data,
            lastUpdated: new Date(),
          };

      const [updatedCenter] = await db
        .update(treatmentCenter)
        .set(updateData)
        .where(eq(treatmentCenter.id, input.id))
        .returning();

      if (!updatedCenter) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Treatment center not found",
        });
      }

      return updatedCenter;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const [deletedCenter] = await db
        .delete(treatmentCenter)
        .where(eq(treatmentCenter.id, input.id))
        .returning();

      if (!deletedCenter) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Treatment center not found",
        });
      }

      return deletedCenter;
    }),

  bulkCreate: adminProcedure
    .input(
      z.object({
        centers: z.array(treatmentCenterSchema),
      })
    )
    .mutation(async ({ input }) => {
      // Geocode all addresses in parallel
      const geocodedCenters = await Promise.all(
        input.centers.map(async (center) => {
          const coordinates = await geocodeAddress(center.address);
          return {
            ...center,
            lat: coordinates.lat,
            lng: coordinates.lng,
            lastUpdated: new Date(),
          };
        })
      );

      const insertedCenters = await db
        .insert(treatmentCenter)
        .values(geocodedCenters)
        .returning();

      return insertedCenters;
    }),

  // Public endpoint for map
  getAllForMap: publicProcedure.query(async () => {
    const centers = await db
      .select({
        id: treatmentCenter.id,
        name: treatmentCenter.name,
        lat: treatmentCenter.lat,
        lng: treatmentCenter.lng,
        address: treatmentCenter.address,
        website: treatmentCenter.website,
        phone: treatmentCenter.phone,
        about: treatmentCenter.about,
        availableTherapies: treatmentCenter.availableTherapies,
      })
      .from(treatmentCenter);

    return centers;
  }),
});