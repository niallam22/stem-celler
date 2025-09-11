import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
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
      <main className="flex-1 bg-white dark:bg-gray-950">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <Shield className="mx-auto h-12 w-12 text-cellTeal mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Privacy Policy
            </h1>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                How We Use User Data
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Data We Access
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    When you authorize our application, we may access:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-gray-600 dark:text-gray-300 space-y-1">
                    <li>
                      Your basic profile information (name, email address,
                      profile picture)
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    How We Use Your Data
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    We use Google user data solely to:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-gray-600 dark:text-gray-300 space-y-1">
                    <li>Provide the core functionality of Cell Genie</li>
                    <li>Share newsletter and event information</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Data Storage and Security
                  </h3>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                    <li>
                      We only store the minimum data necessary to provide our
                      services
                    </li>
                    <li>
                      Your Google user data is encrypted and stored securely
                    </li>
                    <li>We do not store your Google account passwords</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Data Sharing
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    We do NOT:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                    <li>Sell your Google user data to third parties</li>
                    <li>
                      Share your data with third parties except as necessary to
                      provide our service functionality
                    </li>
                    <li>Use your data for advertising purposes</li>
                    <li>
                      Transfer your data to others unless required by law or
                      with your explicit consent
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Google's Limited Use Requirements
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Our use of Google user data complies with Google API
                    Services User Data Policy, including the Limited Use
                    requirements. We only use data for the purposes explicitly
                    disclosed in this policy.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Data Retention and Deletion
                  </h3>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                    <li>
                      You can revoke access at any time through your Google
                      Account settings
                    </li>
                    <li>
                      You may request deletion of your data by{" "}
                      <Link
                        href="/contact"
                        className="text-cellTeal hover:underline"
                      >
                        contacting us
                      </Link>
                    </li>
                    <li>
                      We retain data only as long as necessary to provide our
                      services
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Contact
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    For privacy concerns or questions:{" "}
                    <Link
                      href="/contact"
                      className="text-cellTeal hover:underline"
                    >
                      Contact us
                    </Link>
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
