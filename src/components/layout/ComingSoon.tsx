import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dna } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export default function ComingSoon({
  title,
  description,
  icon: Icon = Dna,
}: ComingSoonProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Simple header with back button */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/">
            <Button variant="ghost" className="group">
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[50rem] w-[50rem] rounded-full bg-gradient-to-br from-cellTeal-200/10 to-cellPurple-200/10 blur-3xl dark:from-cellTeal-900/10 dark:to-cellPurple-900/10" />
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-cellTeal-50 to-cellPurple-50 dark:from-cellTeal-900/20 dark:to-cellPurple-900/20 rounded-2xl mb-6">
            <Icon className="h-12 w-12 text-cellTeal" />
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            {title}
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">
            {description}
          </p>

          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cellTeal-50 to-cellPurple-50 dark:from-cellTeal-900/20 dark:to-cellPurple-900/20 rounded-full">
            <span className="text-base font-medium bg-gradient-to-r from-cellTeal to-cellPurple bg-clip-text text-transparent">
              Coming Soon
            </span>
          </div>

          {/* Progress indicator */}
          <div className="mt-12">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="h-2 w-2 rounded-full bg-cellTeal animate-pulse" />
              <span>Page under development</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}