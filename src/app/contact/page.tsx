import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";

export default function ContactPage() {
  const contactEmail = process.env.CONTACT_EMAIL;

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
      <main className="flex-1 flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-6">
            <Mail className="h-12 w-12 text-cellTeal" />
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Contact Us
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">
            We&apos;d love to hear from you. Reach out for support, inquiries, or
            partnership opportunities.
          </p>

          {/* Contact Email */}
          <div className="space-y-4 mb-8">
            <p className="text-gray-600 dark:text-gray-400">Contact us at:</p>
            <a
              href={`mailto:${contactEmail}`}
              className="text-2xl font-semibold text-cellTeal hover:underline inline-flex items-center gap-2"
            >
              <Mail className="w-6 h-6" />
              {contactEmail}
            </a>
          </div>

          {/* Response time */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>We typically respond within 24-48 business hours.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
