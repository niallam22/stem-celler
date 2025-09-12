import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
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
            <FileText className="mx-auto h-12 w-12 text-cellTeal mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Terms of Service
            </h1>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Introduction
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Welcome to Cell Genie. These Terms of Service (&ldquo;Terms&rdquo;) govern your use of our platform 
                for commercial and scientific information and analytics services. By accessing or using 
                Cell Genie, you agree to be bound by these Terms.
              </p>
            </section>

            {/* Service Description */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Service Description
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                Cell Genie provides commercial and scientific information and analytics services, including:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 ml-4">
                <li>Analysis and insights on stem cell therapy developments</li>
                <li>Commercial intelligence and market analytics</li>
                <li>Scientific data aggregation and reporting</li>
                <li>Information extraction from public company reports and documents</li>
              </ul>
            </section>

            {/* User Responsibilities */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                3. User Responsibilities
              </h2>
              <div className="space-y-3">
                <p className="text-gray-600 dark:text-gray-300">
                  By using our services, you agree to:
                </p>
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 ml-4">
                  <li>Comply with all applicable laws and regulations</li>
                  <li>Provide accurate and complete information when creating an account</li>
                  <li>Maintain the confidentiality of your account credentials</li>
                  <li>Use the service only for lawful purposes and in accordance with these Terms</li>
                  <li>Not attempt to access unauthorised areas of our systems</li>
                  <li>Not interfere with or disrupt the service or servers</li>
                  <li>Respect intellectual property rights</li>
                </ul>
              </div>
            </section>

            {/* Account Terms */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Account Terms
              </h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Registration
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    You must provide accurate, current, and complete information during registration. 
                    You are responsible for maintaining the security of your account and for all activities 
                    that occur under your account.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Termination
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    We reserve the right to suspend or terminate your account if you violate these Terms 
                    or engage in conduct that we determine is harmful to our service or other users.
                  </p>
                </div>
              </div>
            </section>

            {/* Google OAuth Compliance */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Google Authentication Services
              </h2>
              <div className="space-y-3">
                <p className="text-gray-600 dark:text-gray-300">
                  When you sign in with Google, we access only the minimum necessary information 
                  as detailed in our <Link href="/privacy" className="text-cellTeal hover:underline">Privacy Policy</Link>.
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  Our use of information received from Google APIs adheres to the Google API Services 
                  User Data Policy, including the Limited Use requirements. We only use Google user data 
                  for the purposes explicitly disclosed and consented to by you.
                </p>
              </div>
            </section>

            {/* Data and Privacy */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Data Protection and Privacy
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Your privacy is important to us. Our collection, use, and protection of your personal 
                data is governed by our <Link href="/privacy" className="text-cellTeal hover:underline">Privacy Policy</Link>, 
                which forms part of these Terms. We implement appropriate technical and organisational 
                measures to protect your data against unauthorised access, alteration, disclosure, or destruction.
              </p>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Intellectual Property
              </h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Our Content
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    All content on Cell Genie, including text, graphics, logos, and software, is our 
                    property or that of our licensors and is protected by intellectual property laws.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Your Content
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    You retain ownership of any content you submit. By submitting content, you grant us 
                    a licence to use, modify, and display that content as necessary to provide our services.
                  </p>
                </div>
              </div>
            </section>

            {/* Security */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Security
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                We implement industry-standard security measures, including HTTPS encryption for all 
                data transmissions. While we strive to protect your information, no method of electronic 
                storage or transmission is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            {/* Disclaimers and Limitations */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Disclaimers and Limitations of Liability
              </h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Service Disclaimer
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Cell Genie is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, 
                    either express or implied. We do not warrant that the service will be uninterrupted, 
                    error-free, or completely secure.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Information Disclaimer
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    The information provided through our platform is for informational purposes only and 
                    should not be construed as professional, medical, or investment advice. Users should 
                    verify information independently before making decisions based on our analytics.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Limitation of Liability
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    To the maximum extent permitted by law, Cell Genie shall not be liable for any indirect, 
                    incidental, special, consequential, or punitive damages resulting from your use or 
                    inability to use the service.
                  </p>
                </div>
              </div>
            </section>

            {/* Modifications */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                10. Modifications to Terms
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                We may modify these Terms at any time. We will notify you of material changes by posting 
                the updated Terms on our platform. Your continued use of Cell Genie after changes 
                constitutes acceptance of the modified Terms.
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                11. Governing Law and Jurisdiction
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                These Terms are governed by and construed in accordance with the laws of England and Wales. 
                Any disputes arising from these Terms or your use of Cell Genie shall be subject to the 
                exclusive jurisdiction of the courts of England and Wales.
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                12. Contact Information
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                If you have any questions about these Terms or our services, please{" "}
                <Link href="/contact" className="text-cellTeal hover:underline">
                  contact us
                </Link>.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}