import { db } from "@/lib/db";
import { sendTelegramNotification } from "@/lib/balance-monitor/telegram";
import { isApiEnabled } from "@/lib/api-manager";
import { parseAccessDetails } from "@/lib/account-credentials-parser";

/**
 * Helper to fetch a platform setting from vexo_platform_settings or process.env
 */
async function getNotificationSetting(key: string, envFallbackKey?: string): Promise<string> {
  try {
    const res = await db.query(
      `SELECT value FROM vexo_platform_settings WHERE key = $1 LIMIT 1`,
      [key]
    );
    if (res.rows.length > 0 && res.rows[0].value?.trim()) {
      return res.rows[0].value.trim();
    }
  } catch {
    // Database might be warming up
  }
  if (envFallbackKey && process.env[envFallbackKey]?.trim()) {
    return process.env[envFallbackKey]!.trim();
  }
  return "";
}

/**
 * Dispatches an automated branded email to the customer's Gmail / Email
 */
export async function sendSubscriptionEmail(params: {
  toEmail: string;
  toolName: string;
  planDuration: string;
  pricePkr: number;
  deliveryType?: string;
  licenseOrAccess: string;
  instructions?: string;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  // Check if Email API is enabled
  if (!(await isApiEnabled("resend_email"))) {
    return {
      ok: false,
      error: "Email delivery API is currently disabled in Admin API Services Manager.",
    };
  }

  const resendApiKey = await getNotificationSetting("resend_api_key", "RESEND_API_KEY");
  let senderEmail =
    (await getNotificationSetting("resend_from_email", "RESEND_FROM_EMAIL")) ||
    (await getNotificationSetting("sender_email", "SENDER_EMAIL")) ||
    "VEXARO SMM <noreply@vexarosmm.com>";
  if (!senderEmail || senderEmail.includes("onboarding@resend.dev")) {
    senderEmail = "VEXARO SMM <noreply@vexarosmm.com>";
  }

  if (!resendApiKey) {
    return {
      ok: false,
      error: "Resend API key not configured yet. (Configure in Admin Settings or RESEND_API_KEY in .env)",
    };
  }

  const parsed = parseAccessDetails(params.licenseOrAccess, params.deliveryType, params.toolName);
  const isLink = parsed.isLink;
  const isCoupon = parsed.isCoupon;
  const isAccount = parsed.isReadyAccount;

  let credentialsHtml = "";
  if (isLink) {
    credentialsHtml = `
      <div style="background:#071418;border:1px solid rgba(0,212,255,0.3);border-radius:12px;padding:16px;margin:20px 0;text-align:center;">
        <p style="color:#64748b;font-size:12px;margin:0 0 8px 0;text-transform:uppercase;font-weight:700;">🔗 Direct Activation URL</p>
        <a href="${params.licenseOrAccess}" style="display:inline-block;background:#00d4ff;color:#061224;font-weight:800;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;margin-bottom:10px;">Open Activation Link ↗</a>
        <p style="color:#94a3b8;font-size:11px;font-family:monospace;word-break:break-all;margin:8px 0 0 0;">${params.licenseOrAccess}</p>
      </div>`;
  } else if (isCoupon) {
    credentialsHtml = `
      <div style="background:#171304;border:1px solid rgba(251,191,36,0.3);border-radius:12px;padding:16px;margin:20px 0;text-align:center;">
        <p style="color:#fbbf24;font-size:12px;margin:0 0 6px 0;text-transform:uppercase;font-weight:700;">🎟️ Voucher Code</p>
        <div style="font-family:monospace;font-size:20px;font-weight:900;color:#fbbf24;letter-spacing:2px;">${params.licenseOrAccess}</div>
      </div>`;
  } else if (isAccount) {
    const accountsHtml = parsed.accounts.map((acc, idx) => {
      const portalUrl = acc.portalUrl || parsed.defaultPortalUrl;
      const providerName = acc.providerName || parsed.defaultProviderName;
      return `
        <div style="background:#0d181c;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:16px;margin-bottom:12px;">
          ${parsed.accounts.length > 1 ? `<div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Account #${idx + 1}</div>` : ""}
          <div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;">
            ${portalUrl ? `<a href="${portalUrl}" style="display:inline-block;background:#22d3ee;color:#07100f;font-weight:800;font-size:12px;padding:8px 16px;border-radius:8px;text-decoration:none;">🌐 Sign In at ${providerName} ↗</a>` : ""}
            ${acc.codeUrl ? `<a href="${acc.codeUrl}" style="display:inline-block;background:#10b981;color:#07100f;font-weight:800;font-size:12px;padding:8px 16px;border-radius:8px;text-decoration:none;">📩 Get Verification Code ↗</a>` : ""}
          </div>
          ${acc.email ? `
            <div style="margin-bottom:8px;">
              <span style="font-size:10px;text-transform:uppercase;font-weight:700;color:#94a3b8;display:block;">Account Email:</span>
              <div style="background:#04090b;border:1px solid rgba(255,255,255,0.08);padding:8px 12px;border-radius:8px;font-family:monospace;font-size:13px;color:#ffffff;font-weight:bold;">${acc.email}</div>
            </div>` : ""}
          ${acc.password ? `
            <div style="margin-bottom:8px;">
              <span style="font-size:10px;text-transform:uppercase;font-weight:700;color:#94a3b8;display:block;">Password:</span>
              <div style="background:#04090b;border:1px solid rgba(255,255,255,0.08);padding:8px 12px;border-radius:8px;font-family:monospace;font-size:13px;color:#baff00;font-weight:bold;">${acc.password}</div>
            </div>` : ""}
          ${acc.backupEmail || acc.backupPortal ? `
            <div style="background:rgba(255,255,255,0.03);padding:8px 12px;border-radius:8px;font-size:11px;color:#94a3b8;margin-top:8px;">
              ${acc.backupEmail ? `<div>Backup 2FA Email: <strong style="color:#ffffff;">${acc.backupEmail}</strong></div>` : ""}
              ${acc.backupPortal ? `<div style="margin-top:4px;"><a href="${acc.backupPortal}" style="color:#22d3ee;text-decoration:none;">Open Backup Portal ↗</a></div>` : ""}
            </div>` : ""}
        </div>
      `;
    }).join("");

    credentialsHtml = `
      <div style="margin:20px 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span style="color:#10b981;font-size:11px;font-weight:800;text-transform:uppercase;">⚡ Ready Account Credentials</span>
        </div>
        ${accountsHtml}
        <div style="background:#071317;border:1px solid rgba(34,211,238,0.25);border-radius:12px;padding:14px;margin-top:12px;">
          <div style="color:#22d3ee;font-size:11px;font-weight:800;text-transform:uppercase;margin-bottom:8px;">📖 4 Easy Steps to Login</div>
          <table width="100%" style="font-size:11px;color:#cbd5e1;line-height:1.5;">
            <tr><td style="padding:3px 0;width:24px;vertical-align:top;font-weight:bold;color:#22d3ee;">1.</td><td style="padding:3px 0;">Click <strong>&ldquo;Sign In&rdquo;</strong> above (use a Private/Incognito browser tab for best results).</td></tr>
            <tr><td style="padding:3px 0;width:24px;vertical-align:top;font-weight:bold;color:#22d3ee;">2.</td><td style="padding:3px 0;">Copy and enter your <strong>Email</strong> and <strong>Password</strong> into the login page.</td></tr>
            <tr><td style="padding:3px 0;width:24px;vertical-align:top;font-weight:bold;color:#10b981;">3.</td><td style="padding:3px 0;">If prompted for a security or verification code, click <strong>&ldquo;Get Verification Code&rdquo;</strong> to view it.</td></tr>
            <tr><td style="padding:3px 0;width:24px;vertical-align:top;font-weight:bold;color:#baff00;">4.</td><td style="padding:3px 0;">Paste the code to finish logging in. You now have full access to your account!</td></tr>
          </table>
        </div>
      </div>
    `;
  } else {
    credentialsHtml = `
      <div style="background:#091215;border:1px solid rgba(186,255,0,0.3);border-radius:12px;padding:16px;margin:20px 0;text-align:center;">
        <p style="color:#94a3b8;font-size:12px;margin:0 0 6px 0;text-transform:uppercase;font-weight:700;">License Key</p>
        <div style="font-family:monospace;font-size:16px;font-weight:800;color:#baff00;">${params.licenseOrAccess}</div>
      </div>`;
  }

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:24px;background:#060d10;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#ffffff;">
      <table align="center" width="100%" style="max-width:580px;background:#0d181b;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:32px;">
        <tr>
          <td>
            <div style="text-align:center;margin-bottom:24px;">
              <span style="background:rgba(186,255,0,0.12);color:#baff00;border:1px solid rgba(186,255,0,0.3);font-size:11px;font-weight:800;padding:4px 12px;border-radius:99px;text-transform:uppercase;">
                ⚡ VEXARO SUBSCRIPTIONS
              </span>
              <h1 style="color:#ffffff;font-size:24px;font-weight:900;margin:12px 0 4px 0;">Your Subscription is Live!</h1>
              <p style="color:#94a3b8;font-size:13px;margin:0;">Instant automated delivery for your digital software order.</p>
            </div>

            <div style="background:#081114;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:18px;margin-bottom:20px;">
              <table width="100%" style="font-size:13px;color:#cbd5e1;">
                <tr>
                  <td style="padding:6px 0;color:#94a3b8;">Tool / Service:</td>
                  <td style="padding:6px 0;text-align:right;font-weight:800;color:#ffffff;">${params.toolName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#94a3b8;">Duration:</td>
                  <td style="padding:6px 0;text-align:right;font-weight:800;color:#baff00;">${params.planDuration}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#94a3b8;">Price Paid:</td>
                  <td style="padding:6px 0;text-align:right;font-weight:800;color:#ffffff;">₨${Number(params.pricePkr).toLocaleString()} PKR</td>
                </tr>
              </table>
            </div>

            ${credentialsHtml}

            ${params.instructions ? `
              <div style="background:#091417;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;margin:16px 0;">
                <p style="color:#baff00;font-size:11px;font-weight:800;text-transform:uppercase;margin:0 0 6px 0;">📋 Setup &amp; Activation Instructions</p>
                <p style="color:#e2e8f0;font-size:12px;line-height:1.6;margin:0;white-space:pre-wrap;">${params.instructions}</p>
              </div>
            ` : ""}

            <div style="text-align:center;margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);">
              <a href="https://vexarosmm.com/dashboard" style="display:inline-block;background:rgba(255,255,255,0.06);color:#ffffff;font-size:12px;font-weight:700;padding:10px 22px;border-radius:10px;text-decoration:none;border:1px solid rgba(255,255,255,0.1);">
                View in My Subscriptions Dashboard →
              </a>
              <p style="color:#64748b;font-size:11px;margin:16px 0 0 0;">
                Need assistance? Reply directly or visit <a href="https://vexarosmm.com" style="color:#00d4ff;">Vexaro SMM Support</a>.
              </p>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: senderEmail,
        to: [params.toEmail],
        subject: `🎉 Your ${params.toolName} Subscription Access Credentials`,
        html: htmlBody,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: data?.message || `HTTP ${res.status} from Resend API` };
    }

    return { ok: true, messageId: data?.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error contacting Resend API",
    };
  }
}

/**
 * Master dispatcher: dispatches to customer Email + Admin Telegram alert
 */
export async function dispatchSubscriptionNotifications(params: {
  subscriptionId: string;
  userEmail: string;
  toolName: string;
  planDuration: string;
  pricePkr: number;
  deliveryContact: string;
  deliveryType?: string;
  licenseOrAccess: string;
  instructions?: string;
}): Promise<{
  emailSent: boolean;
  adminAlertSent: boolean;
}> {
  let emailSent = false;

  // 1. Send setup email if deliveryContact is an email address
  if (params.deliveryContact && params.deliveryContact.includes("@")) {
    const emailRes = await sendSubscriptionEmail({
      toEmail: params.deliveryContact.trim().toLowerCase(),
      toolName: params.toolName,
      planDuration: params.planDuration,
      pricePkr: params.pricePkr,
      deliveryType: params.deliveryType,
      licenseOrAccess: params.licenseOrAccess,
      instructions: params.instructions,
    });
    emailSent = emailRes.ok;
  }

  // 2. Alert Admin on Telegram (respects api_toggle_telegram_alerts)
  const adminMsg =
    `🎉 <b>NEW SUBSCRIPTION ORDER DISPATCHED!</b>\n\n` +
    `📦 <b>Tool:</b> ${params.toolName} (${params.planDuration})\n` +
    `💰 <b>Amount:</b> ₨${Number(params.pricePkr).toLocaleString()} PKR\n` +
    `👤 <b>Customer:</b> ${params.userEmail}\n` +
    `✉️ <b>Delivery Email:</b> <code>${params.deliveryContact}</code>\n` +
    `🏷️ <b>Format:</b> ${params.deliveryType || "STANDARD"}\n\n` +
    `🔑 <b>Delivered Credentials / Access:</b>\n` +
    `<code>${params.licenseOrAccess}</code>\n\n` +
    (params.instructions ? `📋 <i>${params.instructions}</i>\n\n` : "") +
    `✅ <i>Customer received immediate on-screen delivery & permanent dashboard access.</i>`;

  const adminAlertSent = await sendTelegramNotification(adminMsg).catch(() => false);

  // 3. Update status in database
  try {
    await db.query(
      `UPDATE vexo_tool_subscriptions 
       SET instructions = COALESCE(instructions, '') 
       WHERE id = $1`,
      [params.subscriptionId]
    );
  } catch {
    // Non-fatal
  }

  return {
    emailSent,
    adminAlertSent,
  };
}
