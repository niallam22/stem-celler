import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface MagicLinkEmailProps {
  url: string;
  host: string;
  email: string;
}

export const MagicLinkEmail: React.FC<Readonly<MagicLinkEmailProps>> = ({
  url,
  host,
  email,
}) => {
  const domain = host.replace(/^https?:\/\//, "");
  const previewText = `Sign in to Cell Genie with this magic link. No password needed.`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Main content */}
          <Text style={heading}>Sign in to Cell Genie</Text>

          <Text style={paragraph}>
            Click the button below to sign in to your account at{" "}
            <strong>{domain}</strong>. This link will expire in 24 hours.
          </Text>

          <Section style={emailBox}>
            <Text style={emailText}>
              Signing in as: <strong>{email}</strong>
            </Text>
          </Section>

          {/* CTA Button */}
          <Section style={buttonContainer}>
            <Button style={button} href={url}>
              Sign in to Cell Genie
            </Button>
          </Section>

          <Hr style={hr} />

          {/* Alternative link */}
          <Text style={altLinkText}>
            Or copy and paste this URL into your browser:
          </Text>
          <Link href={url} style={link}>
            {url}
          </Link>

          <Hr style={hr} />

          {/* Security notice */}
          <Section style={securityNotice}>
            <Text style={securityText}>
              <strong>Security Notice:</strong> If you didn&apos;t request this
              email, you can safely ignore it. Only someone with access to your
              email account can use this link to sign in.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This is an automated message from Cell Genie.
              <br />
              Please do not reply to this email.
            </Text>

            <Text style={footerText}>
              © {new Date().getFullYear()} Cell Genie. All rights reserved.
              <br />
              <Link href={host} style={footerLink}>
                {domain}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: "#f7f7f7",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  margin: "40px auto",
  padding: "20px",
  maxWidth: "600px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "600",
  color: "#333333",
  textAlign: "center" as const,
  margin: "20px 0",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#666666",
  textAlign: "center" as const,
  margin: "0 0 20px 0",
};

const emailBox = {
  backgroundColor: "#f0f0f0",
  borderRadius: "4px",
  padding: "10px",
  margin: "0 0 30px 0",
};

const emailText = {
  fontSize: "14px",
  color: "#666666",
  textAlign: "center" as const,
  margin: "0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "30px 0",
};

const button = {
  backgroundColor: "#0066cc",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block" as const,
  padding: "14px 30px",
  minWidth: "200px",
};

const hr = {
  borderColor: "#eeeeee",
  margin: "20px 0",
};

const altLinkText = {
  fontSize: "12px",
  color: "#999999",
  textAlign: "center" as const,
  margin: "0 0 10px 0",
};

const link = {
  color: "#0066cc",
  fontSize: "12px",
  textDecoration: "none",
  wordBreak: "break-all" as const,
  display: "block" as const,
  textAlign: "center" as const,
  margin: "0 0 20px 0",
};

const securityNotice = {
  backgroundColor: "#fff9e6",
  border: "1px solid #ffd666",
  borderRadius: "4px",
  padding: "15px",
  marginTop: "20px",
};

const securityText = {
  margin: "0",
  color: "#8b6914",
  fontSize: "14px",
  lineHeight: "20px",
};

const footer = {
  marginTop: "30px",
  paddingTop: "30px",
  borderTop: "1px solid #eeeeee",
};

const footerText = {
  margin: "0 0 10px 0",
  color: "#999999",
  fontSize: "12px",
  textAlign: "center" as const,
  lineHeight: "18px",
};

const footerLink = {
  color: "#0066cc",
  textDecoration: "none",
};

// Plain text version for better deliverability
export const MagicLinkEmailText = ({
  url,
  host,
  email,
}: MagicLinkEmailProps): string => {
  const domain = host.replace(/^https?:\/\//, "");

  return `Sign in to Cell Genie

Hello,

Click the link below to sign in to your account at ${domain}:

${url}

This link will expire in 24 hours.

Signing in as: ${email}

If you didn't request this email, you can safely ignore it. Only someone with access to your email account can use this link to sign in.

---

This is an automated message from Cell Genie. Please do not reply to this email.

© ${new Date().getFullYear()} Cell Genie. All rights reserved.
${host}`;
};

// Default export for React Email
export default MagicLinkEmail;
