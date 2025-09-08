import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// Create Redis client for rate limiting
// In production, you'll need UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
let redis: Redis | null = null;
let rateLimiter: Ratelimit | null = null;

// Initialize rate limiter if Redis credentials are available
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  // Create rate limiter: 5 requests per 15 minutes for auth endpoints
  rateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    analytics: true,
    prefix: "stem-celler-auth",
  });
}

// Create a general API rate limiter: 100 requests per minute
export const apiRateLimiter = rateLimiter
  ? new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(100, "1 m"),
      analytics: true,
      prefix: "stem-celler-api",
    })
  : null;

// Rate limiting helper for auth endpoints
export async function authRateLimit(identifier: string) {
  if (!rateLimiter) {
    // If rate limiting is not configured, allow the request
    console.warn("Rate limiting not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN");
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  const result = await rateLimiter.limit(identifier);
  return result;
}

// Get client identifier from request
export async function getClientIdentifier() {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  
  if (realIp) {
    return realIp.trim();
  }
  
  // Fallback to a generic identifier
  return "anonymous";
}

// Middleware helper for rate limiting
export async function withRateLimit(
  request: Request,
  handler: () => Promise<Response>,
  options?: {
    identifier?: string;
    limiter?: Ratelimit;
  }
) {
  const limiter = options?.limiter || rateLimiter;
  
  if (!limiter) {
    // If rate limiting is not configured, proceed with the request
    return handler();
  }

  const identifier = options?.identifier || await getClientIdentifier();
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    return NextResponse.json(
      { 
        error: "Too many requests. Please try again later.",
        limit,
        remaining,
        reset: new Date(reset).toISOString()
      },
      { 
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": new Date(reset).toISOString(),
          "Retry-After": Math.floor((reset - Date.now()) / 1000).toString(),
        }
      }
    );
  }

  // Add rate limit headers to successful responses
  const response = await handler();
  const newHeaders = new Headers(response.headers);
  newHeaders.set("X-RateLimit-Limit", limit.toString());
  newHeaders.set("X-RateLimit-Remaining", remaining.toString());
  newHeaders.set("X-RateLimit-Reset", new Date(reset).toISOString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}