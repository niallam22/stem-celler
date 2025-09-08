import { Button } from "@/components/ui/button";
import { ArrowRight, Dna, Globe, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 py-20 sm:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[40rem] w-[40rem] rounded-full bg-gradient-to-br from-cellTeal-200/20 to-cellPurple-200/20 blur-3xl dark:from-cellTeal-900/20 dark:to-cellPurple-900/20" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-[30rem] w-[30rem] rounded-full bg-gradient-to-bl from-cellEmerald-200/20 to-cellTeal-200/20 blur-3xl dark:from-cellEmerald-900/20 dark:to-cellTeal-900/20" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center rounded-full bg-cellTeal-50 px-4 py-1.5 text-sm font-medium text-cellTeal-700 dark:bg-cellTeal-900/30 dark:text-cellTeal-300">
            <Dna className="mr-1.5 h-4 w-4" />
            Cell Genie
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
            <span className="block">Cell Therapy Intelligence</span>
            <span className="mt-2 block bg-gradient-to-r from-cellTeal to-cellPurple bg-clip-text text-transparent">
              at Your Fingertips
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mb-10 text-lg leading-8 text-gray-600 dark:text-gray-300 sm:text-xl">
            Track approvals, revenue, and market trends for cell therapies
            worldwide.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/auth/signin">
              <Button
                size="lg"
                className="group bg-gradient-to-r from-cellTeal to-cellTeal-600 hover:from-cellTeal-600 hover:to-cellTeal-700 text-white shadow-lg shadow-cellTeal-500/25"
              >
                Get started, it&apos;s free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex flex-col items-center justify-center gap-8 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <TrendingUp className="h-5 w-5 text-cellEmerald" />
              <span>Revenue tracking</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Globe className="h-5 w-5 text-cellPurple" />
              <span>Global regulatory coverage</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
