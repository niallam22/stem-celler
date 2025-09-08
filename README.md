# 🧬 Stem Cell Therapy Data Platform

A comprehensive platform for tracking and analyzing stem cell therapy data, including therapy approvals, revenue metrics, disease treatments, and treatment center locations. Built with security-first architecture and server-side rendering for optimal performance.

## 🎯 Overview

This platform provides tools for extracting, managing, and visualizing data from quarterly and annual reports of public medical companies specializing in stem cell therapies. Features include automated PDF extraction with AI agents, human-in-the-loop approval workflows, and interactive data visualizations.

## ✨ Features

### 🏗️ Core Architecture

- [**Next.js 14**](https://nextjs.org/) - React framework with App Router
- [**TypeScript**](https://www.typescriptlang.org/) - Type safety throughout
- [**tRPC**](https://trpc.io/) - End-to-end type-safe APIs
- [**Drizzle ORM**](https://orm.drizzle.team/) - Type-safe ORM with SQL-like queries
- [**NextAuth.js**](https://next-auth.js.org/) - Authentication with Drizzle adapter
- [**Supabase**](https://supabase.com) - Postgres database with realtime and auth

### 🎨 UI & Styling

- [**Tailwind CSS**](https://tailwindcss.com/) - Utility-first CSS framework
- [**Framer Motion**](https://www.framer.com/motion/) - Animation library
- [**Lucide Icons**](https://lucide.dev/) - Icon set
- Dark mode with Tailwind CSS

### 🛠️ Development Tools

- [**Storybook**](https://storybook.js.org/) - Component development environment
- [**Geist Font**](https://vercel.com/font) - Typography by Vercel

### 🔒 Security Features

- **Server-Side Rendering (SSR)** - All sensitive data fetched server-side, no API exposure
- **Comprehensive Security Headers**:
  - X-Frame-Options: DENY (prevent clickjacking)
  - X-Content-Type-Options: nosniff (prevent MIME sniffing)
  - Strict-Transport-Security (HSTS in production)
  - Content Security Policy (CSP)
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy (restrict browser features)
- **Authentication Security**:
  - NEXTAUTH_SECRET validation (min 32 chars)
  - Weak/default secret detection
  - HTTPS enforcement in production
  - Critical error handling for production
- **Rate Limiting** (via Upstash Redis):
  - Auth endpoints: 5 requests per 15 minutes
  - API endpoints: 100 requests per minute
  - Graceful degradation if not configured

### 🏗️ Data Architecture

#### Server-Side Data Fetching
All dashboard data is fetched server-side to prevent API scraping:

```typescript
// src/lib/server/dashboard-data.ts
export async function getDashboardData() {
  const [therapies, diseases, approvals, revenue, centers] = await Promise.all([
    db.select().from(therapy),
    db.select().from(disease),
    db.select().from(therapyApproval),
    db.select().from(therapyRevenue),
    db.select().from(treatmentCenter),
  ]);
  
  return { therapies, diseases, therapyApprovals, therapyRevenue, treatmentCenters };
}
```

Components receive data via props, no client-side API calls for sensitive data.

### 🤖 AI & Background Jobs

- **LangGraph-based Extraction Agents**:
  - Document Classifier Agent
  - Therapy Extraction Agent
  - Disease Extraction Agent
  - Approval Extraction Agent
  - Revenue Extraction Agent
- [**Anthropic Claude**](https://anthropic.com) - Primary AI model
- PostgreSQL-based job queue system

### 🔧 Infrastructure & Services

- [**Supabase**](https://supabase.com) - PostgreSQL database
- [**AWS S3**](https://aws.amazon.com/s3/) - PDF document storage
- [**Upstash Redis**](https://upstash.com) - Rate limiting (optional)
- [**Resend**](https://resend.com) - Email delivery

### 🔔 Additional Features

- Interactive data visualizations with Recharts
- Treatment center map with Leaflet
- Document processing queue with priority system
- Human-in-the-loop approval workflow
- TypeScript with Drizzle ORM type inference

## 🚀 Getting Started

1. Fork this repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

   - Copy `.env.example` to `.env.local` for Next.js environment variables
   - Copy `.env.example` to `.env` for database tools (Drizzle Kit requires this)
   - Configure your environment variables in both files

4. Start local Supabase (if using local development):

```bash
supabase start
```

5. Set up your database:

```bash
# Push schema to database (for development)
npm run db:push

# Or, if you have existing migrations to apply
npm run db:reset  # Warning: This resets the entire database!
```

6. **(Optional) Set up Rate Limiting with Upstash Redis**:

   Rate limiting is optional but recommended for production. The app works without it.

   **Free Tier includes:**
   - 10,000 commands per day
   - 256MB max database size
   - No credit card required

   **Setup:**
   1. Sign up at [upstash.com](https://upstash.com) (free, no credit card)
   2. Create a Redis database (select region close to your app)
   3. Copy REST URL and token from dashboard
   4. Add to `.env.local`:
   ```bash
   UPSTASH_REDIS_REST_URL="your-rest-url"
   UPSTASH_REDIS_REST_TOKEN="your-rest-token"
   ```

   **Rate Limits Configured:**
   - Auth endpoints: 5 requests per 15 minutes
   - API endpoints: 100 requests per minute

   If not configured, the app logs a warning and allows all requests through.

7. Start the development server:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app.

## 🗄️ Database Management

This project uses [Drizzle ORM](https://orm.drizzle.team/) with PostgreSQL (via Supabase). The database schema is defined in `src/lib/db/schema.ts` and migrations are managed through Drizzle Kit.

### Database Architecture

- **Schema**: `src/lib/db/schema.ts` - The single source of truth for your database structure
- **Migrations**: `supabase/migrations/` - SQL migration files for version control
- **Client**: `src/lib/db.ts` - Database connection and typed Drizzle instance
- **Config**: `drizzle.config.ts` - Drizzle Kit configuration

### Prerequisites

⚠️ **Important**: Drizzle Kit commands (`db:push`, `db:migrate`, `db:studio`) require a `.env` file with your `DATABASE_URL`. Make sure to create this file from `.env.example` or copy the DATABASE_URL from `.env.local`.

### Available Commands

```bash
# Start local Supabase instance (required for local development)
supabase start

# Push schema changes directly to database (development only)
# Syncs your schema.ts with the database without creating migration files
npm run db:push

# Generate SQL migration files from schema changes
# Creates versioned migration files in supabase/migrations/
npm run db:migrate "descriptive_name"

# Reset entire database and reapply all migrations (DESTRUCTIVE!)
# Warning: This will delete all data and recreate the database
npm run db:reset

# Open Drizzle Studio for visual database management
# Browse and edit your database through a web interface
npm run db:studio
```

### Development Workflow

For quick development iterations:

1. Edit `src/lib/db/schema.ts`
2. Run `npm run db:push` to sync changes immediately to your database
3. Use `npm run db:studio` to visually inspect changes
4. Test your changes in the application

### Production Workflow

For versioned, production-ready changes:

1. Edit `src/lib/db/schema.ts`
2. Run `npm run db:migrate "add_user_preferences"` to generate migration files
3. Review the generated SQL in `supabase/migrations/`
4. Test migrations locally with `npm run db:reset` (warning: destructive)
5. Commit migration files to version control
6. Deploy migration files with your application

### Working with Existing Migrations

If you pull changes that include new migrations:

1. Run `npm run db:reset` to reset and apply all migrations (loses all data)
2. Or manually apply specific migrations if you need to preserve data

### Schema Example

```typescript
// src/lib/db/schema.ts
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  email: text("email").unique().notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// TypeScript types are automatically inferred
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

## 📁 Project Structure

- `app/` - Next.js app router pages and API routes
- `src/`
  - `components/` - UI components
  - `lib/` - Utilities and configurations
    - `api/` - tRPC routers
    - `utils/` - Shared utilities
  - `stories/` - Storybook files
- `src/lib/db/` - Database schema and configuration
- `supabase/migrations/` - Database migrations

## 🚀 Deployment

This template is optimized for deployment on [Vercel](https://vercel.com).

### Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Get your database connection strings from Supabase:
   - Project Settings → Database
   - Copy both the URI (for `DATABASE_URL`) and Direct Connection (for `DIRECT_URL`)

### Vercel Setup

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Configure the following environment variables:

   **Required:**
   - `DATABASE_URL` - Your Supabase database URL
   - `DIRECT_URL` - Your Supabase direct connection URL
   - `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32` (MUST be 32+ chars)
   - `NEXTAUTH_URL` - Your production URL (e.g., https://your-app.vercel.app)
   
   **Optional (but recommended for production):**
   - `UPSTASH_REDIS_REST_URL` - For rate limiting
   - `UPSTASH_REDIS_REST_TOKEN` - For rate limiting
   
   **AI/Processing (if using document extraction):**
   - `ANTHROPIC_API_KEY` - For AI document extraction
   - Add any other variables from `.env.example` that you're using

5. Deploy!

### Security Configuration

The application includes comprehensive security features that are automatically enabled:

1. **Security Headers** - Applied via middleware (`src/lib/security-headers.ts`)
2. **Authentication Validation** - Validates NEXTAUTH_SECRET on startup
3. **Rate Limiting** - If Upstash Redis is configured
4. **SSR Data Protection** - All sensitive data fetched server-side

For local testing without auth validation:
```bash
npm run build:test
```

### Post-Deployment

1. Apply database migrations in production:

   **Option A: Using Supabase Dashboard (Recommended)**

   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run your migration files from `supabase/migrations/`

   **Option B: Using Supabase CLI**

   ```bash
   # Link to your production project
   supabase link --project-ref your-project-ref

   # Push migrations to production
   supabase db push
   ```

   **Option C: Direct schema push (use with caution)**

   ```bash
   # Set DATABASE_URL to your production database
   # Then push schema directly
   npm run db:push
   ```

1. Set up your custom domain in Vercel (optional):
   - Go to your project settings
   - Navigate to Domains
   - Add your domain and follow the DNS configuration instructions

## 📝 License

MIT License
