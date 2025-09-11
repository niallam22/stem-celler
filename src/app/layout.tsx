import "@/app/globals.css";
import ClientProvider from "@/components/ClientProvider";
import { ThemeAwareToast } from "@/components/theme/ThemeAwareToast";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { TRPCReactProvider } from "@/lib/trpc/react";
import { Metadata } from "next";
import React from "react";
import "react-toastify/dist/ReactToastify.css";

export const metadata: Metadata = {
  title: "Cell Genie - Stem Cell Therapy Market Intelligence",
  description:
    "Track revenue, approvals, and market trends for stem cell therapies worldwide. Real-time data from 50+ companies, updated quarterly.",
  keywords:
    "stem cell therapy, cell therapy, market intelligence, revenue tracking, regulatory approvals, CAR-T, gene therapy",
  authors: [{ name: "Cell Genie" }],
  openGraph: {
    title: "Cell Genie - Stem Cell Therapy Market Intelligence",
    description:
      "Track revenue, approvals, and market trends for stem cell therapies worldwide.",
    url: "https://cell-genie.com",
    siteName: "Cell Genie",
    type: "website",
    images: [
      {
        url: "/cell-genie-logo.png",
        width: 512,
        height: 512,
        alt: "Cell  Genie Logo - DNA helix emerging from a magic lamp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cell Genie - Stem Cell Therapy Market Intelligence",
    description:
      "Track revenue, approvals, and market trends for stem cell therapies worldwide.",
    images: ["/cell-genie-logo.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/cell-genie-logo.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: "/cell-genie-logo.png",
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
