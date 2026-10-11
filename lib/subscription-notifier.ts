import { db } from "@/lib/db";
import { sendTelegramNotification } from "@/lib/balance-monitor/telegram";

export interface ContactInfo {
  type: "email" | "whatsapp" | "unknown";
  raw: string;
  normalized: string;
}

/**
 * Detects whether contact is an Email address or a WhatsApp / Phone number
 */
export function detectContactType(contact: string): ContactInfo {
  const trimmed = (contact || "").trim();

  // 1. Email check
  if (trimmed.includes("@") && trimmed.includes(".")) {
    return {
      type: "email",
      raw: trimmed,
      normalized: trimmed.toLowerCase(),
    };
  }

  // 2. Phone / WhatsApp number check
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length >= 7) {
    let standardized = digitsOnly;
    // Standardize local Pakistani numbers: e.g. 03176437013 -> 923176437013
    if (standardized.startsWith("03") && standardized.length === 11) {
      standardized = "92" + standardized.slice(1);
    } else if (standardized.startsWith("00")) {
      standardized = standardized.slice(2);
    }
    return {
      type: "whatsapp",
      raw: trimmed,
      normalized: standardized,
    };
  }

  return {
    type: "unknown",
    raw: trimmed,
    normalized: trimmed,
  };
}

/**
 * Formats a clean, high-conversion WhatsApp message with credentials
 */
export function generateWhatsAppMessage(params: {
  toolName: string;
  planDuration: string;
  pricePkr: number;
  deliveryType?: string;
  licenseOrAccess: string;
  instructions?: string;
}): string {
  const typeLabel =
    params.deliveryType === "LINK"
      ? "Activation Link"
      : params.deliveryType === "COUPON"
      ? "Coupon / Voucher Code"
      : params.deliveryType === "READY_ACCOUNT"
      ? "Account Credentials"
      : "License Key";

  return `🎉 *YOUR VEXARO SUBSCRIPTION IS READY!*

📦 *Tool:* ${params.toolName}
⏳ *Plan Duration:* ${params.planDuration}
💰 *Amount Paid:* ₨${Number(params.pricePkr).toLocaleString()}

🔑 *${typeLabel}:*
${params.licenseOrAccess}

${params.instructions ? `📋 *Instructions:*\n${params.instructions}\n\n` : ""}🌐 *Dashboard Access:*
You can always view, re-copy, or manage your active subscriptions anytime in your Vexaro Dashboard under "My Subscriptions".

💬 Need help? Contact Vexaro Support: https://vexarosmm.com`;
}

/**
 * Generates direct click-to-chat WhatsApp link
 */
export function getWhatsAppDirectLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

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
  const resendApiKey = await getNotificationSetting("resend_api_key", "RESEND_API_KEY");
  const senderEmail = (await getNotificationSetting("sender_email", "SENDER_EMAIL")) || "Vexaro Subscriptions <onboarding@resend.dev>";

  if (!resendApiKey) {
    return {
      ok: false,
      error: "Resend API key not configured yet. (Configure in Admin Settings or RESEND_API_KEY in .env)",
    };
  }

  const isLink = params.deliveryType === "LINK" || params.licenseOrAccess.startsWith("http");
  const isCoupon = params.deliveryType === "COUPON";
  const isAccount = params.deliveryType === "READY_ACCOUNT";

  const credentialsHtml = isLink
    ? `<div style="background:#071418;border:1px solid rgba(0,212,255,0.3);border-radius:12px;padding:16px;margin:20px 0;text-align:center;">
        <p style="color:#64748b;font-size:12px;margin:0 0 8px 0;text-transform:uppercase;font-weight:700;">🔗 Direct Activation URL</p>
        <a href="${params.licenseOrAccess}" style="display:inline-block;background:#00d4ff;color:#061224;font-weight:800;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;margin-bottom:10px;">Open Activation Link ↗</a>
        <p style="color:#94a3b8;font-size:11px;font-family:monospace;word-break:break-all;margin:8px 0 0 0;">${params.licenseOrAccess}</p>
      </div>`
    : isCoupon
    ? `<div style="background:#171304;border:1px solid rgba(251,191,36,0.3);border-radius:12px;padding:16px;margin:20px 0;text-align:center;">
        <p style="color:#fbbf24;font-size:12px;margin:0 0 6px 0;text-transform:uppercase;font-weight:700;">🎟️ Voucher Code</p>
        <div style="font-family:monospace;font-size:20px;font-weight:900;color:#fbbf24;letter-spacing:2px;">${params.licenseOrAccess}</div>
      </div>`
    : isAccount
    ? `<div style="background:#140d29;border:1px solid rgba(192,132,252,0.3);border-radius:12px;padding:16px;margin:20px 0;">
        <p style="color:#c084fc;font-size:12px;margin:0 0 8px 0;text-transform:uppercase;font-weight:700;">👤 Account Credentials</p>
        <pre style="color:#faf5ff;font-family:monospace;font-size:13px;white-space:pre-wrap;word-break:break-all;margin:0;">${params.licenseOrAccess}</pre>
      </div>`
    : `<div style="background:#091215;border:1px solid rgba(186,255,0,0.3);border-radius:12px;padding:16px;margin:20px 0;text-align:center;">
        <p style="color:#94a3b8;font-size:12px;margin:0 0 6px 0;text-transform:uppercase;font-weight:700;">License Key</p>
        <div style="font-family:monospace;font-size:16px;font-weight:800;color:#baff00;">${params.licenseOrAccess}</div>
      </div>`;

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
                  <td style="padding:6px 0;color:#94a3b8;">Plan Duration:</td>
                  <td style="padding:6px 0;text-align:right;font-weight:700;color:#ffffff;">${params.planDuration}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#94a3b8;">Amount Paid:</td>
                  <td style="padding:6px 0;text-align:right;font-weight:900;color:#baff00;">₨${Number(params.pricePkr).toLocaleString()}</td>
                </tr>
              </table>
            </div>

            ${credentialsHtml}

            ${params.instructions ? `
            <div style="background:#070f12;border-left:3px solid #00d4ff;padding:12px 16px;border-radius:8px;margin-bottom:24px;">
              <strong style="color:#00d4ff;font-size:12px;text-transform:uppercase;display:block;margin-bottom:4px;">Instructions:</strong>
              <p style="color:#cbd5e1;font-size:12px;margin:0;line-height:1.5;">${params.instructions}</p>
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
 * Dispatches an automated WhatsApp message via a configured WhatsApp Gateway API
 * (Supports UltraMsg, GreenAPI, WhatsApp Cloud API, or custom webhook)
 */
export async function sendSubscriptionWhatsAppViaGateway(params: {
  phone: string;
  message: string;
}): Promise<{ ok: boolean; response?: unknown; error?: string }> {
  const gatewayUrl = await getNotificationSetting("whatsapp_gateway_url", "WHATSAPP_GATEWAY_URL");
  const gatewayToken = await getNotificationSetting("whatsapp_gateway_token", "WHATSAPP_GATEWAY_TOKEN");

  if (!gatewayUrl) {
    return {
      ok: false,
      error: "WhatsApp Gateway URL not configured yet.",
    };
  }

  try {
    const body: Record<string, string> = {
      to: params.phone,
      phone: params.phone,
      message: params.message,
      text: params.message,
    };
    if (gatewayToken) {
      body.token = gatewayToken;
      body.apiKey = gatewayToken;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (gatewayToken) {
      headers["Authorization"] = `Bearer ${gatewayToken}`;
      headers["X-API-Key"] = gatewayToken;
    }

    const res = await fetch(gatewayUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: `WhatsApp Gateway returned HTTP ${res.status}` };
    }

    return { ok: true, response: data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error reaching WhatsApp Gateway",
    };
  }
}

/**
 * Master dispatcher: dispatches to customer (Gmail / WhatsApp) + Admin Telegram alert
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
  contactType: "email" | "whatsapp" | "unknown";
  emailSent: boolean;
  whatsAppSent: boolean;
  directWhatsAppLink: string | null;
  adminAlertSent: boolean;
}> {
  const contact = detectContactType(params.deliveryContact);
  let emailSent = false;
  let whatsAppSent = false;
  let directWhatsAppLink: string | null = null;

  // 1. If Contact is an Email address
  if (contact.type === "email") {
    const emailRes = await sendSubscriptionEmail({
      toEmail: contact.normalized,
      toolName: params.toolName,
      planDuration: params.planDuration,
      pricePkr: params.pricePkr,
      deliveryType: params.deliveryType,
      licenseOrAccess: params.licenseOrAccess,
      instructions: params.instructions,
    });
    emailSent = emailRes.ok;
  }

  // 2. If Contact is a WhatsApp phone number
  if (contact.type === "whatsapp") {
    const waText = generateWhatsAppMessage({
      toolName: params.toolName,
      planDuration: params.planDuration,
      pricePkr: params.pricePkr,
      deliveryType: params.deliveryType,
      licenseOrAccess: params.licenseOrAccess,
      instructions: params.instructions,
    });

    directWhatsAppLink = getWhatsAppDirectLink(contact.normalized, waText);

    const waRes = await sendSubscriptionWhatsAppViaGateway({
      phone: contact.normalized,
      message: waText,
    });
    whatsAppSent = waRes.ok;
  }

  // 3. Always alert the Admin on Telegram in real time!
  const adminMsg =
    `🎉 <b>NEW SUBSCRIPTION ORDER DISPATCHED!</b>\n\n` +
    `📦 <b>Tool:</b> ${params.toolName} (${params.planDuration})\n` +
    `💰 <b>Amount:</b> ₨${Number(params.pricePkr).toLocaleString()} PKR\n` +
    `👤 <b>Customer:</b> ${params.userEmail}\n` +
    `📱 <b>Delivery Contact:</b> <code>${params.deliveryContact}</code> (${contact.type.toUpperCase()})\n` +
    `🏷️ <b>Format:</b> ${params.deliveryType || "STANDARD"}\n\n` +
    `🔑 <b>Delivered Credentials / Access:</b>\n` +
    `<code>${params.licenseOrAccess}</code>\n\n` +
    (params.instructions ? `📋 <i>${params.instructions}</i>\n\n` : "") +
    `✅ <i>Customer received immediate on-screen delivery & permanent dashboard access.</i>`;

  const adminAlertSent = await sendTelegramNotification(adminMsg).catch(() => false);

  // 4. Update status in database
  try {
    const statusText =
      emailSent
        ? "Email Dispatched"
        : whatsAppSent
        ? "WhatsApp Dispatched"
        : "Delivered On-Screen";

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
    contactType: contact.type,
    emailSent,
    whatsAppSent,
    directWhatsAppLink,
    adminAlertSent,
  };
}
