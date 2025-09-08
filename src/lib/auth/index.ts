import { db } from "@/lib/db";
import { 
  user as userTable,
  account,
  verificationToken 
} from "@/lib/db/schema";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { validateAuthConfig } from "./validate-config";

// Validate configuration on startup
if (typeof window === "undefined" && process.env.SKIP_AUTH_VALIDATION !== "true") {
  validateAuthConfig();
}

export enum UserRole {
  user = "user",
  admin = "admin",
}

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth/adapters" {
  interface AdapterUser {
    login?: string;
    role?: UserRole;
    dashboardEnabled?: boolean;
    isTeamAdmin?: boolean;
  }
}

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      login?: string;
      role?: UserRole;
      dashboardEnabled?: boolean;
      isAdmin?: boolean;
      expires?: string;
      isTeamAdmin?: boolean;
    };
    accessToken?: string;
  }

  export interface Profile {
    login: string;
  }

  interface User {
    role?: UserRole;
    login?: string;
    expires?: string;
    isTeamAdmin?: boolean;
    isAdmin?: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db, {
    usersTable: userTable,
    accountsTable: account,
    verificationTokensTable: verificationToken
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    EmailProvider({
      server: {
        host: "smtp.resend.com",
        port: 465,
        auth: {
          user: "resend",
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM || "onboarding@resend.dev",
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days for regular users (overridden for admins in jwt callback)
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      try {
        const email = user?.email;
        if (!email) return false;

        /*
        // Enable this to restrict sign-ins to certain domains or allowlist
        const domainCheck = ALLOWED_DOMAINS.some((d) => email.endsWith(d));
        if (!domainCheck) {
          const inAllowlist = await db.query.allowlist.findFirst({
            where: (allowlist, { eq }) => eq(allowlist.email, email),
          });

          if (!inAllowlist) {
            return false;
          }
        }
        */

        return true;
      } catch (error) {
        console.error("SignIn callback error:", error);
        return false;
      }
    },
    async jwt({ token, user }) {
      // Add user properties to JWT token for middleware access
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.login = user.login;
        token.isAdmin = user.isAdmin;

        // Set custom expiry based on admin status
        const now = Math.floor(Date.now() / 1000);
        if (user.isAdmin) {
          token.exp = now + 4 * 60 * 60; // 4 hours for admins
        } else {
          token.exp = now + 7 * 24 * 60 * 60; // 7 days for regular users
        }
      } else if (token.id && !token.hasOwnProperty("isAdmin")) {
        // If token exists but missing admin properties, fetch from database
        try {
          const dbUsers = await db
            .select()
            .from(userTable)
            .where(eq(userTable.id, token.id as string))
            .limit(1);

          if (dbUsers.length > 0) {
            const dbUser = dbUsers[0];
            token.role = dbUser.role;
            token.login = dbUser.login;
            token.isAdmin = dbUser.isAdmin;

            // Update expiry based on admin status
            const now = Math.floor(Date.now() / 1000);
            if (dbUser.isAdmin) {
              token.exp = now + 4 * 60 * 60; // 4 hours for admins
            } else {
              token.exp = now + 7 * 24 * 60 * 60; // 7 days for regular users
            }
          }
        } catch (error) {
          console.error("Error fetching user data for JWT:", error);
        }
      }
      return token;
    },
    async session({ session, token, user }) {
      try {
        // When using database sessions, user object is available
        // When using JWT sessions, token object is available
        const userData = user || token;

        return {
          ...session,
          user: {
            ...session.user,
            id: userData.id,
            role: userData.role,
            login: userData.login,
            isAdmin: userData.isAdmin,
          },
        };
      } catch (error) {
        console.error("Session callback error:", error);
        return session;
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
  },
};

export const getServerAuthSession = () => getServerSession(authOptions);
