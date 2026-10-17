import { getPlatformSetting } from "@/lib/admin";

export interface SendVerificationEmailParams {
  to: string;
  recipientName?: string;
  code: string;
  type: "signup" | "password_reset";
}

export interface EmailSendResult {
  ok: boolean;
  provider?: string;
  error?: string;
  isSandboxRestricted?: boolean;
}

/**
 * Generate VEXARO-branded HTML Email Template
 */
export function buildVerificationHtml(params: {
  code: string;
  recipientName?: string;
  type: "signup" | "password_reset";
}): string {
  const isSignup = params.type === "signup";
  const title = isSignup ? "Verify Your VEXARO Account" : "Reset Your VEXARO Password";
  const greeting = params.recipientName ? `Hello <strong>${params.recipientName}</strong>,` : "Hello,";
  const lead = isSignup
    ? "Thank you for creating an account with <strong>VEXARO SMM</strong>. To complete your registration and secure your account, please enter the 6-digit verification code below:"
    : "We received a request to reset the password for your <strong>VEXARO SMM</strong> account. Enter the 6-digit verification code below to set a new password:";

  const digits = params.code.split("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #050a0b;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
    }
    .wrapper {
      width: 100%;
      background-color: #050a0b;
      padding: 30px 10px;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background: #0d1618;
      border: 1px solid rgba(186, 255, 0, 0.2);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
    }
    .header {
      background: linear-gradient(180deg, #132225 0%, #0d1618 100%);
      padding: 28px 24px 20px;
      text-align: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(186, 255, 0, 0.1);
      border: 1px solid rgba(186, 255, 0, 0.3);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 800;
      color: #baff00;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .content {
      padding: 32px 28px;
      text-align: center;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 16px;
      letter-spacing: -0.5px;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 24px;
    }
    .code-box {
      background: #070e10;
      border: 1.5px dashed rgba(186, 255, 0, 0.4);
      border-radius: 14px;
      padding: 18px 20px;
      margin: 28px 0;
      display: inline-block;
    }
    .code-digits {
      display: flex;
      justify-content: center;
      gap: 10px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 32px;
      font-weight: 900;
      color: #baff00;
      letter-spacing: 6px;
    }
    .expiry-note {
      font-size: 12px;
      color: #f59e0b;
      margin-top: 10px;
      font-weight: 600;
    }
    .security-callout {
      background: rgba(255, 255, 255, 0.03);
      border-left: 3px solid #38bdf8;
      border-radius: 8px;
      padding: 12px 16px;
      text-align: left;
      font-size: 12px;
      color: #64748b;
      margin: 24px 0 0;
      line-height: 1.5;
    }
    .footer {
      padding: 20px 24px;
      background: #091012;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      text-align: center;
      font-size: 11px;
      color: #475569;
    }
    .footer a {
      color: #baff00;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-badge">⚡ VEXARO SMM PANEL</div>
      </div>
      <div class="content">
        <h1>${title}</h1>
        <p>${greeting}</p>
        <p>${lead}</p>
        
        <div class="code-box">
          <div class="code-digits">${params.code}</div>
          <div class="expiry-note">⏱ Code expires in 15 minutes</div>
        </div>

        <p style="font-size: 12px; color: #64748b;">
          Please enter this code on the website to continue. Do not share this code with anyone. VEXARO support will never ask for your verification code.
        </p>

        <div class="security-callout">
          <strong>Security Notice:</strong> If you did not request this verification, someone may have entered your email by mistake. You can safely ignore this message.
        </div>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} VEXARO SMM Panel. All rights reserved.<br>
        Cheapest & Fastest Automated SMM Services in Pakistan & Worldwide.
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Dispatch verification email using Resend, Brevo, or SMTP
 */
export async function sendVerificationEmail(params: SendVerificationEmailParams): Promise<EmailSendResult> {
  const isSignup = params.type === "signup";
  const subject = isSignup
    ? `[VEXARO] ${params.code} is your signup verification code`
    : `[VEXARO] ${params.code} is your password reset verification code`;

  const html = buildVerificationHtml({
    code: params.code,
    recipientName: params.recipientName,
    type: params.type,
  });

  // 1. Try Resend API
  const resendApiKey =
    (await getPlatformSetting("resend_api_key", "").catch(() => "")) ||
    process.env.RESEND_API_KEY ||
    "";

  let senderEmail =
    (await getPlatformSetting("resend_from_email", "").catch(() => "")) ||
    (await getPlatformSetting("sender_email", "").catch(() => "")) ||
    process.env.RESEND_FROM_EMAIL ||
    "VEXARO SMM <noreply@vexarosmm.com>";

  // Ensure we NEVER use sandbox onboarding@resend.dev since vexarosmm.com is verified
  if (!senderEmail || senderEmail.includes("onboarding@resend.dev")) {
    senderEmail = "VEXARO SMM <noreply@vexarosmm.com>";
  }

  if (resendApiKey && resendApiKey.trim().length > 5) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: senderEmail,
          to: [params.to.trim()],
          subject,
          html,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.id) {
        console.log(`[Email] Successfully delivered via Resend to ${params.to} (id: ${data.id})`);
        return { ok: true, provider: "resend" };
      }

      console.warn("[Email] Resend dispatch warning:", data);

      // Check if Resend rejected due to free tier recipient restriction
      const isSandboxRestricted =
        data?.statusCode === 403 &&
        (String(data?.message || "").includes("testing email address") ||
          String(data?.message || "").includes("verify a domain"));

      if (isSandboxRestricted) {
        console.warn(
          `[Email Verification Note]: Resend API key is in sandbox mode. To send to any email address, verify your domain at resend.com/domains or configure your verified sender email in Admin Settings.`
        );
      }

      // If Brevo is available, try Brevo as secondary fallback
      const brevoKey =
        (await getPlatformSetting("brevo_api_key", "").catch(() => "")) ||
        process.env.BREVO_API_KEY ||
        "";

      if (brevoKey && brevoKey.trim().length > 10) {
        const brevoResult = await sendViaBrevo(brevoKey.trim(), params.to, subject, html);
        if (brevoResult.ok) {
          return { ok: true, provider: "brevo" };
        }
      }

      return {
        ok: false,
        provider: "resend",
        error: data?.message || "Failed to deliver verification email.",
        isSandboxRestricted,
      };
    } catch (err: any) {
      console.error("[Email] Resend fetch error:", err);
    }
  }

  // 2. Try Brevo directly if Resend was not configured
  const brevoKey =
    (await getPlatformSetting("brevo_api_key", "").catch(() => "")) ||
    process.env.BREVO_API_KEY ||
    "";

  if (brevoKey && brevoKey.trim().length > 10) {
    const brevoResult = await sendViaBrevo(brevoKey.trim(), params.to, subject, html);
    if (brevoResult.ok) return { ok: true, provider: "brevo" };
    return { ok: false, provider: "brevo", error: brevoResult.error };
  }

  // Fallback for local testing / unconfigured mail
  console.log(`[Email Verification Code (Simulated)] Email: ${params.to} | Code: ${params.code}`);
  return {
    ok: false,
    error: "No email service configured. Please check platform settings or configure Resend / Brevo.",
    isSandboxRestricted: true,
  };
}

async function sendViaBrevo(
  apiKey: string,
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "VEXARO SMM", email: "vexaro.support@gmail.com" },
        to: [{ email: to.trim() }],
        subject,
        htmlContent: html,
      }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.messageId) {
      return { ok: true };
    }
    return { ok: false, error: data?.message || "Brevo dispatch failed." };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Brevo network error" };
  }
}
