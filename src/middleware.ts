import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Allow access to the unauthorized page without checks
    if (path === "/admin/unauthorized") {
      return NextResponse.next();
    }

    const isAdminRoute = path.startsWith("/admin");

    if (isAdminRoute) {
      // If not logged in, redirect to sign-in
      if (!token) {
        console.log("User not authenticated, redirecting to sign-in page");

        return NextResponse.redirect(new URL("/auth/signin", req.url));
      }
      console.log("User is authenticated:", JSON.stringify(token, null, 2));

      // If logged in but not admin, show unauthorized page
      if (!token.isAdmin) {
        console.log("User is not an admin, redirecting to unauthorized page");

        return NextResponse.redirect(new URL("/admin/unauthorized", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true, // Allow all requests to reach our middleware function
    },
  }
);

export const config = {
  matcher: ["/admin/:path*"],
};
