import crypto from "crypto";

export interface BotVerificationResult {
  success: boolean;
  error?: string;
}

/**
 * Server-side bot protection verifier
 * Supports:
 * 1. Honeypot check (rejects bots that autofill hidden trap inputs)
 * 2. Cloudflare Turnstile siteverify (when CLOUDFLARE_TURNSTILE_SECRET_KEY is present)
 * 3. Smart Cryptographic Timestamped Fallback Challenge
 */
export async function verifyBotProtection(
  token?: string,
  honeypot?: string,
  clientIp?: string
): Promise<BotVerificationResult> {
  // 1. Honeypot check: Automated bots typically scan the DOM and populate all inputs
  if (honeypot && String(honeypot).trim().length > 0) {
    return {
      success: false,
      error: "Automated submission rejected. Bot signature detected.",
    };
  }

  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  // 2. Cloudflare Turnstile verification
  if (secretKey && secretKey.trim().length > 5) {
    if (!token) {
      return {
        success: false,
        error: "Security verification required. Please complete the Cloudflare challenge.",
      };
    }

    try {
      const form = new URLSearchParams();
      form.append("secret", secretKey.trim());
      form.append("response", token.trim());
      if (clientIp) form.append("remoteip", clientIp);

      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: form,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const data = await res.json();
      if (data.success) {
        return { success: true };
      }

      console.warn("Turnstile validation failed:", data["error-codes"]);
      return {
        success: false,
        error: "Security check failed. Please refresh and try the verification again.",
      };
    } catch (err) {
      console.error("Cloudflare Turnstile verification error:", err);
      return {
        success: false,
        error: "Unable to reach security verification servers. Please try again.",
      };
    }
  }

  // 3. Smart Native Fallback Challenge (Zero external API dependencies required)
  // If a human_shield token is submitted, validate its signature and validity window
  if (token && token.startsWith("human_shield:")) {
    const parts = token.split(":");
    if (parts.length >= 3) {
      const timestamp = Number(parts[1]);
      const clientHash = parts[2];
      const now = Date.now();

      // Valid within 15 minutes, not from the future by > 60s
      if (isNaN(timestamp) || now - timestamp > 15 * 60 * 1000 || timestamp - now > 60 * 1000) {
        return {
          success: false,
          error: "Human verification token has expired. Please verify again.",
        };
      }

      const expectedHash = crypto
        .createHash("sha256")
        .update(`vexo_human_shield_${timestamp}`)
        .digest("hex")
        .slice(0, 16);

      if (clientHash !== expectedHash) {
        return {
          success: false,
          error: "Verification signature mismatch. Bot activity blocked.",
        };
      }
    }
  }

  // If Cloudflare is not configured and honeypot is clean, permit human requests
  return { success: true };
}
