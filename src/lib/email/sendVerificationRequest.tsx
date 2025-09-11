import { render } from "@react-email/render";
import type { SendVerificationRequestParams } from "next-auth/providers/email";
import nodemailer from "nodemailer";
import React from "react";
import { MagicLinkEmail, MagicLinkEmailText } from "./templates/MagicLinkEmail";

export async function sendVerificationRequest({
  identifier,
  url,
  provider,
}: SendVerificationRequestParams) {
  const { host } = new URL(url);

  // Handle both string and object server configurations
  const serverConfig =
    typeof provider.server === "string" ? provider.server : provider.server;

  const transport = nodemailer.createTransport(serverConfig);

  // Use NEXTAUTH_URL for the image host to ensure it's publicly accessible
  // Falls back to the host from the magic link URL if not set
  const appUrl = process.env.NEXTAUTH_URL || `https://${host}`;
  
  // Generate HTML and text versions using @react-email/render
  const htmlBody = await render(
    <MagicLinkEmail
      url={url}
      host={appUrl}
      email={identifier}
    />
  );

  const textBody = MagicLinkEmailText({
    url,
    host: appUrl,
    email: identifier,
  });

  // Send the email with proper headers for deliverability
  const result = await transport.sendMail({
    to: identifier,
    from: provider.from,
    subject: "Sign in to Cell Genie",
    text: textBody,
    html: htmlBody,
    headers: {
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
      Importance: "high",
      "X-Mailer": "Cell Genie Authentication",
      "List-Unsubscribe": `<mailto:${provider.from}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    // DKIM and SPF should be configured at the domain/DNS level
    priority: "high",
    // Message-ID: unique identifier for email threading and duplicate prevention
    // Format: <timestamp.random@domain> - uses actual domain from EMAIL_DOMAIN env var
    messageId: `<${Date.now()}.${Math.random().toString(36).substring(2, 11)}@${process.env.EMAIL_DOMAIN || "stem-celler.versa-mind.com"}>`,
  });

  if (process.env.NODE_ENV === "development") {
    console.log("Email sent:", result.messageId);
  }
}
