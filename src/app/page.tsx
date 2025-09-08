import ClientProvider from "@/components/ClientProvider";
import CellTherapyDashboard from "@/components/graphs/CellTherapyDashboard";
import FeatureGrid from "@/components/layout/FeatureGrid";
import HeroSection from "@/components/layout/HeroSection";
import NavigationBar from "@/components/layout/NavigationBar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { getDashboardData } from "@/lib/server/dashboard-data";
import { ArrowRight, Lock } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getSession() {
  try {
    const session = await getServerSession(authOptions);
    return session;
  } catch (error) {
    console.error("Failed to get session:", error);
    return null;
  }
}

export default async function Page() {
  const session = await getSession();
  
  // Fetch dashboard data server-side for everyone
  const dashboardData = await getDashboardData();

  return (
    <div className="min-h-screen flex flex-col">
      <ClientProvider>
        <NavigationBar />

        {session ? (
          // Authenticated View
          <main className="flex-1">
            <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 py-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Welcome back, {session?.user?.name || "User"}
                  </h1>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Here&apos;s your comprehensive view of the stem cell therapy
                    market
                  </p>
                </div>
                <CellTherapyDashboard data={dashboardData} />
              </div>
            </div>
          </main>
        ) : (
          // Marketing View
          <main className="flex-1">
            <HeroSection />
            <FeatureGrid />

            {/* Public Chart Preview Section */}
            <section className="py-16 bg-gray-50 dark:bg-gray-900">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Preview Market Data
                  </h2>
                  <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
                    Get a glimpse of our comprehensive analytics platform
                  </p>
                </div>

                {/* Chart Preview with Overlay */}
                <Card className="relative overflow-hidden">
                  <CardHeader>
                    <CardTitle>Market Analytics Dashboard</CardTitle>
                    <CardDescription>
                      Interactive charts showing revenue trends, regulatory
                      approvals, and market insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="relative">
                      <CellTherapyDashboard data={dashboardData} />

                      {/* Overlay for non-authenticated users */}
                      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-white/60 dark:from-gray-900 dark:via-gray-900/95 dark:to-gray-900/60 flex items-end justify-center pb-12">
                        <div className="text-center space-y-4">
                          <div className="inline-flex items-center justify-center p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                            <Lock className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Sign in to unlock full data access
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 max-w-md">
                            Get access to complete historical data, advanced
                            filters, and the latest industry analysis.
                          </p>
                          <Link href="/auth/signin">
                            <Button className="bg-gradient-to-r from-cellTeal to-cellTeal-600 hover:from-cellTeal-600 hover:to-cellTeal-700 text-white">
                              Sign In to View More
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </main>
        )}

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Cell Genie
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your cell therapy market intelligence platform.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  Company
                </h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>
                    <Link href="/about" className="hover:text-cellTeal">
                      About
                    </Link>
                  </li>
                  <li>
                    <Link href="/blog" className="hover:text-cellTeal">
                      Blog
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="hover:text-cellTeal">
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  Legal
                </h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>
                    <Link href="/privacy" className="hover:text-cellTeal">
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="hover:text-cellTeal">
                      Terms
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                © {new Date().getFullYear()} Cell Genie. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </ClientProvider>
    </div>
  );
}
