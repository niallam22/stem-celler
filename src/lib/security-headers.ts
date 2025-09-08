import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Security headers configuration
export const securityHeaders = {
  // Prevent clickjacking attacks
  "X-Frame-Options": "DENY",
  
  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",
  
  // Enable XSS protection (though modern browsers have this by default)
  "X-XSS-Protection": "1; mode=block",
  
  // Control referrer information
  "Referrer-Policy": "strict-origin-when-cross-origin",
  
  // Permissions Policy (formerly Feature Policy)
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  
  // Strict Transport Security (HSTS) - only in production
  ...(process.env.NODE_ENV === "production" && {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  }),
};

// Content Security Policy configuration
export function getCSP() {
  const isDev = process.env.NODE_ENV === "development";
  
  // Base CSP directives
  const cspDirectives = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'", // Required for Next.js inline scripts
      "'unsafe-eval'", // Required for development (HMR)
      "https://va.vercel-scripts.com", // Vercel Analytics
      ...(isDev ? ["http://localhost:*"] : []),
    ],
    "style-src": [
      "'self'",
      "'unsafe-inline'", // Required for inline styles
      "https://fonts.googleapis.com",
    ],
    "font-src": [
      "'self'",
      "https://fonts.gstatic.com",
      "data:", // For base64 encoded fonts
    ],
    "img-src": [
      "'self'",
      "data:", // For base64 images
      "blob:", // For blob URLs
      "https:", // Allow all HTTPS images (adjust as needed)
      ...(isDev ? ["http://localhost:*"] : []),
    ],
    "connect-src": [
      "'self'",
      "https://api.openai.com", // If using OpenAI
      "https://api.anthropic.com", // If using Anthropic
      "wss:", // WebSocket connections
      "https:", // API calls
      ...(isDev ? ["http://localhost:*", "ws://localhost:*"] : []),
    ],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "upgrade-insecure-requests": [],
  };

  // Convert CSP object to string
  const cspString = Object.entries(cspDirectives)
    .map(([key, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        return `${key} ${values.join(" ")}`;
      }
      return key;
    })
    .join("; ");

  return cspString;
}

// Apply security headers to response
export function applySecurityHeaders(response: NextResponse) {
  // Apply all security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value);
    }
  });

  // Apply CSP header
  const csp = getCSP();
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

// Middleware helper to add security headers
export function withSecurityHeaders(request: NextRequest) {
  const response = NextResponse.next();
  return applySecurityHeaders(response);
}