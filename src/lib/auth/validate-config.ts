/**
 * Validates NextAuth configuration at startup
 * Ensures security requirements are met
 */

export function validateAuthConfig() {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check NEXTAUTH_SECRET
  const secret = process.env.NEXTAUTH_SECRET;
  
  if (!secret) {
    errors.push("NEXTAUTH_SECRET is not set. This is required for production.");
  } else {
    // Check secret length
    if (secret.length < 32) {
      errors.push("NEXTAUTH_SECRET must be at least 32 characters long for security.");
    }
    
    // Check for common/default values
    const commonDefaults = [
      "your-secret-key-at-least-32-chars",
      "secret",
      "changeme",
      "password",
      "12345678901234567890123456789012",
      "00000000000000000000000000000000",
    ];
    
    if (commonDefaults.some(defaultVal => secret.toLowerCase().includes(defaultVal))) {
      errors.push("NEXTAUTH_SECRET appears to be a default or weak value. Please generate a strong, unique secret.");
    }
    
    // Check for sequential or repeated characters
    if (/^(.)\1{31,}$/.test(secret) || /^(012345678901234567890123456789)+$/.test(secret)) {
      errors.push("NEXTAUTH_SECRET contains repeated or sequential characters. Please use a cryptographically secure random value.");
    }
  }

  // Check NEXTAUTH_URL
  const url = process.env.NEXTAUTH_URL;
  
  if (!url) {
    warnings.push("NEXTAUTH_URL is not set. This may cause issues with callbacks.");
  } else if (process.env.NODE_ENV === "production") {
    // In production, ensure HTTPS
    if (!url.startsWith("https://")) {
      errors.push("NEXTAUTH_URL must use HTTPS in production.");
    }
    
    // Warn about localhost in production
    if (url.includes("localhost") || url.includes("127.0.0.1")) {
      errors.push("NEXTAUTH_URL should not use localhost in production.");
    }
  }

  // Check for required OAuth providers configuration
  if (process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_SECRET) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      errors.push("GOOGLE_CLIENT_SECRET is set but GOOGLE_CLIENT_ID is missing.");
    }
    if (!process.env.GOOGLE_CLIENT_SECRET) {
      errors.push("GOOGLE_CLIENT_ID is set but GOOGLE_CLIENT_SECRET is missing.");
    }
  }

  // Check email provider configuration
  if (process.env.EMAIL_FROM || process.env.EMAIL_SERVER_PASSWORD) {
    if (!process.env.EMAIL_FROM) {
      warnings.push("Email provider is configured but EMAIL_FROM is not set.");
    }
    if (!process.env.EMAIL_SERVER_PASSWORD) {
      errors.push("Email provider is configured but EMAIL_SERVER_PASSWORD is not set.");
    }
  }

  // Log results
  if (errors.length > 0) {
    console.error("\n🚨 Authentication Configuration Errors:");
    errors.forEach(error => console.error(`   ❌ ${error}`));
    
    if (process.env.NODE_ENV === "production") {
      console.error("\n⛔ Stopping application due to security configuration errors in production.");
      process.exit(1);
    } else {
      console.warn("\n⚠️  Application is running in development mode with security issues. Fix these before deploying to production.");
    }
  }

  if (warnings.length > 0) {
    console.warn("\n⚠️  Authentication Configuration Warnings:");
    warnings.forEach(warning => console.warn(`   ⚠️  ${warning}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log("✅ Authentication configuration validated successfully.");
  }
}

/**
 * Generate a secure random secret for NEXTAUTH_SECRET
 * Run this with: node -e "require('./src/lib/auth/validate-config').generateSecret()"
 */
export function generateSecret() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto");
  const secret = crypto.randomBytes(32).toString("base64");
  console.log("\n🔐 Generated secure NEXTAUTH_SECRET:");
  console.log(`   ${secret}`);
  console.log("\n📋 Add this to your .env.local file:");
  console.log(`   NEXTAUTH_SECRET="${secret}"`);
  return secret;
}