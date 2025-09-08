import React from "react";
import "@/app/globals.css";
import "react-toastify/dist/ReactToastify.css";
import { TRPCReactProvider } from "@/lib/trpc/react";
import { Metadata } from "next";
import ClientProvider from "@/components/ClientProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeAwareToast } from "@/components/theme/ThemeAwareToast";

export const metadata: Metadata = {
  title: "Cell Genie - Stem Cell Therapy Market Intelligence",
  description: "Track revenue, approvals, and market trends for stem cell therapies worldwide. Real-time data from 50+ companies, updated quarterly.",
  keywords: "stem cell therapy, cell therapy, market intelligence, revenue tracking, regulatory approvals, CAR-T, gene therapy",
  authors: [{ name: "Cell Genie" }],
  openGraph: {
    title: "Cell Genie - Stem Cell Therapy Market Intelligence",
    description: "Track revenue, approvals, and market trends for stem cell therapies worldwide.",
    url: "https://cellgenie.com",
    siteName: "Cell Genie",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Cell Genie - Market Intelligence Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cell Genie - Stem Cell Therapy Market Intelligence",
    description: "Track revenue, approvals, and market trends for stem cell therapies worldwide.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme="system" enableSystem>
          <ClientProvider>
            <TRPCReactProvider>
              {children}
              <ThemeAwareToast />
            </TRPCReactProvider>
          </ClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
