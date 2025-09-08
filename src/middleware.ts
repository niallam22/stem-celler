import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { applySecurityHeaders } from "@/lib/security-headers";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Allow access to the unauthorized page without checks
    if (path === "/admin/unauthorized") {
      const response = NextResponse.next();
      return applySecurityHeaders(response);
    }

    const isAdminRoute = path.startsWith("/admin");

    if (isAdminRoute) {
      // If logged in but not admin, redirect to unauthorized page
      if (token && !token.isAdmin) {
        const response = NextResponse.redirect(new URL("/admin/unauthorized", req.url));
        return applySecurityHeaders(response);
      }
    }

    const response = NextResponse.next();
    return applySecurityHeaders(response);
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        
        // Allow unauthorized page access
        if (path === "/admin/unauthorized") {
          return true;
        }
        
        // For admin routes, require authentication
        if (path.startsWith("/admin")) {
          return !!token;
        }
        
        // Allow all other routes
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/admin/:path*"],
};
