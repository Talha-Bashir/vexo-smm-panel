import crypto from "crypto";
import { getPlatformSetting } from "@/lib/admin";

const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || process.env.SESSION_SECRET || "vexaro_captcha_super_secret_key_2026";

// Characters excluding ambiguous ones (0/O, 1/I/L)
const CAPTCHA_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export interface GeneratedCaptcha {
  svgDataUri: string;
  token: string;
}

export interface CaptchaVerifyResult {
  success: boolean;
  error?: string;
}

/**
 * Generate a random non-consecutive alphanumeric string for real visual CAPTCHA
 */
function generateCaptchaCode(length: number = 5): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    const idx = crypto.randomInt(0, CAPTCHA_CHARS.length);
    result += CAPTCHA_CHARS[idx];
  }
  return result;
}

/**
 * Generate a secure server-rendered SVG CAPTCHA with noise, curves, and distortion
 */
export function generateVisualCaptcha(): GeneratedCaptcha {
  const code = generateCaptchaCode(5);
  const timestamp = Date.now();

  const width = 160;
  const height = 48;

  // Generate random noise lines
  let noiseLines = "";
  for (let i = 0; i < 4; i++) {
    const x1 = crypto.randomInt(0, width / 2);
    const y1 = crypto.randomInt(0, height);
    const x2 = crypto.randomInt(width / 2, width);
    const y2 = crypto.randomInt(0, height);
    const cx = crypto.randomInt(20, width - 20);
    const cy = crypto.randomInt(5, height - 5);
    const stroke = i % 2 === 0 ? "rgba(186,255,0,0.4)" : "rgba(0,240,255,0.35)";
    noiseLines += `<path d="M${x1},${y1} Q${cx},${cy} ${x2},${y2}" stroke="${stroke}" stroke-width="${crypto.randomInt(1, 3)}" fill="none" />`;
  }

  // Generate random noise dots
  let noiseDots = "";
  for (let i = 0; i < 30; i++) {
    const cx = crypto.randomInt(5, width - 5);
    const cy = crypto.randomInt(5, height - 5);
    const r = (crypto.randomInt(5, 18) / 10).toFixed(1);
    const fill = i % 3 === 0 ? "rgba(186,255,0,0.5)" : "rgba(255,255,255,0.3)";
    noiseDots += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" />`;
  }

  // Colors for characters
  const colors = ["#baff00", "#38bdf8", "#facc15", "#4ade80", "#a78bfa", "#f43f5e"];

  // Render distorted characters
  let charElements = "";
  const charSpacing = (width - 30) / code.length;
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const x = 15 + i * charSpacing + crypto.randomInt(-2, 3);
    const y = 32 + crypto.randomInt(-3, 3);
    const rotate = crypto.randomInt(-22, 23);
    const color = colors[crypto.randomInt(0, colors.length)];
    const fontSize = crypto.randomInt(24, 28);
    const fontWeight = crypto.randomInt(700, 900);

    charElements += `<text x="${x}" y="${y}" fill="${color}" font-family="monospace, Courier, sans-serif" font-size="${fontSize}px" font-weight="${fontWeight}" transform="rotate(${rotate} ${x} ${y})">${char}</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background:#091214;border-radius:10px;user-select:none;">
    <rect width="${width}" height="${height}" fill="#091214" rx="10" />
    ${noiseDots}
    ${noiseLines}
    ${charElements}
  </svg>`;

  const base64Svg = Buffer.from(svg).toString("base64");
  const svgDataUri = `data:image/svg+xml;base64,${base64Svg}`;

  // Sign token
  const signature = crypto
    .createHmac("sha256", CAPTCHA_SECRET)
    .update(`${code.toUpperCase()}:${timestamp}`)
    .digest("hex")
    .slice(0, 32);

  const token = `vc_${timestamp}_${signature}`;

  return {
    svgDataUri,
    token,
  };
}

/**
 * Verify visual captcha challenge
 */
export function verifyVisualCaptcha(userAnswer: string, token: string): CaptchaVerifyResult {
  if (!userAnswer || !token) {
    return { success: false, error: "Please enter the security verification code shown in the image." };
  }

  const cleanAnswer = String(userAnswer).trim().toUpperCase();
  const parts = String(token).split("_");
  if (parts.length !== 3 || parts[0] !== "vc") {
    return { success: false, error: "Invalid security code token. Please reload the code." };
  }

  const timestamp = parseInt(parts[1], 10);
  const providedSignature = parts[2];

  if (isNaN(timestamp)) {
    return { success: false, error: "Malformed verification token." };
  }

  // Valid for 10 minutes
  const now = Date.now();
  if (now - timestamp > 10 * 60 * 1000) {
    return { success: false, error: "Security code expired. Please click refresh for a new code." };
  }

  const expectedSignature = crypto
    .createHmac("sha256", CAPTCHA_SECRET)
    .update(`${cleanAnswer}:${timestamp}`)
    .digest("hex")
    .slice(0, 32);

  if (crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))) {
    return { success: true };
  }

  return { success: false, error: "Incorrect security code. Please try again." };
}

/**
 * Master server-side CAPTCHA verifier:
 * Supports:
 * 1. Honeypot trap check
 * 2. Real Visual Security Code (token starts with 'vc_')
 * 3. Cloudflare Turnstile token (when cloudflare secret is configured)
 */
export async function verifyAnyCaptcha(params: {
  captchaResponse?: string;
  captchaToken?: string;
  turnstileToken?: string;
  honeypot?: string;
  clientIp?: string;
}): Promise<CaptchaVerifyResult> {
  // 1. Honeypot check
  if (params.honeypot && String(params.honeypot).trim().length > 0) {
    return { success: false, error: "Automated bot activity blocked." };
  }

  // 2. Visual CAPTCHA Code verification
  if (params.captchaToken && params.captchaToken.startsWith("vc_")) {
    return verifyVisualCaptcha(params.captchaResponse || "", params.captchaToken);
  }

  // 3. Cloudflare Turnstile verification
  const cfSecret =
    (await getPlatformSetting("cloudflare_turnstile_secret_key", "").catch(() => "")) ||
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY ||
    "";

  const turnstileToken = params.turnstileToken || params.captchaToken || params.captchaResponse;

  if (cfSecret && cfSecret.trim().length > 5) {
    if (!turnstileToken) {
      return { success: false, error: "Please complete the Cloudflare Turnstile security check." };
    }

    try {
      const form = new URLSearchParams();
      form.append("secret", cfSecret.trim());
      form.append("response", turnstileToken.trim());
      if (params.clientIp) form.append("remoteip", params.clientIp);

      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: form,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const data = await res.json().catch(() => null);
      if (data && data.success) {
        return { success: true };
      }

      return {
        success: false,
        error: "Cloudflare Turnstile verification failed. Please try again.",
      };
    } catch (err) {
      console.error("Cloudflare Turnstile siteverify error:", err);
      return { success: false, error: "Unable to reach Cloudflare verification servers." };
    }
  }

  // If user provided a visual captcha response without token
  if (params.captchaResponse && !params.captchaToken) {
    return { success: false, error: "Security code session expired. Please refresh the captcha." };
  }

  // If visual captcha token is missing and turnstile is not active, require visual captcha
  if (!params.captchaToken && !turnstileToken) {
    return { success: false, error: "Please complete the security code verification." };
  }

  return { success: true };
}
