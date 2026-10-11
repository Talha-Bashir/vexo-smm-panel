import { db } from "@/lib/db";

export interface BrevoConfig {
  apiKey: string;
  whatsappTemplateId?: number;
  senderNumber?: string;
  enabled: boolean;
}

/**
 * Standardize phone numbers to international E.164 format with leading '+'
 * Handles Pakistani formats (03001234567, 923001234567, etc.) and global numbers
 */
export function formatToInternationalPhone(raw: string): string {
  if (!raw) return "";
  const cleaned = raw.trim().replace(/[\s\-\(\)]/g, "");

  // Pakistani standard normalization
  if (cleaned.startsWith("03") && cleaned.length === 11) {
    return `+92${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith("92") && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith("00")) {
    return `+${cleaned.slice(2)}`;
  }
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  // If only digits provided, ensure '+' prefix
  const digits = cleaned.replace(/\D/g, "");
  return digits ? `+${digits}` : cleaned;
}

/**
 * Retrieve Brevo integration settings from vexo_platform_settings or process.env
 */
export async function getBrevoConfig(): Promise<BrevoConfig> {
  let apiKey = (process.env.BREVO_API_KEY || "").trim();
  let whatsappTemplateId: number | undefined = undefined;
  let senderNumber = (process.env.BREVO_SENDER_NUMBER || "").trim();
  let enabled = true;

  try {
    const res = await db.query(
      `SELECT key, value FROM vexo_platform_settings 
       WHERE key IN ('brevo_api_key', 'brevo_whatsapp_template_id', 'brevo_sender_number', 'brevo_enabled')`
    );
    for (const row of res.rows) {
      if (row.key === "brevo_api_key" && row.value?.trim()) {
        apiKey = row.value.trim();
      } else if (row.key === "brevo_whatsapp_template_id" && row.value?.trim()) {
        const parsed = parseInt(row.value.trim(), 10);
        if (!isNaN(parsed) && parsed > 0) whatsappTemplateId = parsed;
      } else if (row.key === "brevo_sender_number" && row.value?.trim()) {
        senderNumber = row.value.trim();
      } else if (row.key === "brevo_enabled") {
        enabled = row.value !== "false";
      }
    }
  } catch {
    // Platform settings table may not be ready or empty
  }

  return {
    apiKey,
    whatsappTemplateId,
    senderNumber: senderNumber || undefined,
    enabled: Boolean(apiKey && enabled),
  };
}

/**
 * Sync or update a contact in Brevo with the WHATSAPP attribute
 */
export async function syncBrevoContact(params: {
  email: string;
  name?: string;
  whatsappPhone: string;
  apiKey?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = params.apiKey || (await getBrevoConfig()).apiKey;
  if (!apiKey) {
    return { ok: false, error: "Brevo API key not configured." };
  }

  const formattedPhone = formatToInternationalPhone(params.whatsappPhone);
  if (!formattedPhone) {
    return { ok: false, error: "Invalid WhatsApp phone number." };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        email: params.email.trim().toLowerCase(),
        attributes: {
          WHATSAPP: formattedPhone,
          SMS: formattedPhone,
          FIRSTNAME: params.name || "Customer",
        },
        updateEnabled: true,
      }),
    });

    if (res.ok || res.status === 201 || res.status === 204) {
      return { ok: true };
    }

    const data = await res.json().catch(() => null);
    // Duplicate contact is fine since updateEnabled handles it
    if (data?.code === "duplicate_parameter") {
      return { ok: true };
    }

    return { ok: false, error: data?.message || `HTTP ${res.status} from Brevo` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error contacting Brevo",
    };
  }
}

/**
 * Track an 'order_completed' event in Brevo to trigger automation workflows
 */
export async function trackBrevoOrderCompleted(params: {
  email: string;
  whatsappPhone: string;
  orderId: string | number;
  serviceName: string;
  quantity: number;
  amountPkr: number;
  platform?: string;
  link?: string;
  apiKey?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = params.apiKey || (await getBrevoConfig()).apiKey;
  if (!apiKey) {
    return { ok: false, error: "Brevo API key not configured." };
  }

  const formattedPhone = formatToInternationalPhone(params.whatsappPhone);

  try {
    const res = await fetch("https://api.brevo.com/v3/events", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        event_name: "order_completed",
        identifiers: {
          email_id: params.email.trim().toLowerCase(),
        },
        event_date: new Date().toISOString(),
        contact_properties: {
          WHATSAPP: formattedPhone,
        },
        event_properties: {
          order_id: String(params.orderId),
          service_name: params.serviceName,
          quantity: Number(params.quantity),
          amount_pkr: Number(params.amountPkr),
          platform: params.platform || "SMM",
          target_link: params.link || "",
        },
      }),
    });

    if (res.ok || res.status === 200 || res.status === 204) {
      return { ok: true };
    }

    const data = await res.json().catch(() => null);
    return { ok: false, error: data?.message || `HTTP ${res.status} from Brevo` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error sending Brevo event",
    };
  }
}

/**
 * Send direct transactional WhatsApp message via Brevo if an approved Template ID is configured
 */
export async function sendDirectBrevoWhatsApp(params: {
  phone: string;
  templateId: number;
  senderNumber?: string;
  apiKey?: string;
}): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const config = await getBrevoConfig();
  const apiKey = params.apiKey || config.apiKey;
  const senderNumber = params.senderNumber || config.senderNumber;

  if (!apiKey) return { ok: false, error: "Brevo API key not configured." };
  if (!senderNumber) return { ok: false, error: "Brevo WhatsApp sender number not configured." };

  const formattedPhone = formatToInternationalPhone(params.phone).replace(/^\+/, "");

  try {
    const res = await fetch("https://api.brevo.com/v3/whatsapp/sendMessage", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        senderNumber: senderNumber.replace(/^\+/, ""),
        contactNumbers: [formattedPhone],
        templateId: params.templateId,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: data?.message || `HTTP ${res.status} from Brevo WhatsApp API` };
    }

    return { ok: true, messageId: data?.id || data?.messageId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error sending Brevo WhatsApp message",
    };
  }
}

/**
 * Master dispatcher: Syncs contact WHATSAPP attribute & fires order_completed event
 * Safe & resilient: will never throw or interrupt checkout
 */
export async function triggerOrderWhatsAppBrevo(params: {
  email: string;
  name?: string;
  whatsappPhone: string;
  orderId: string | number;
  serviceName: string;
  quantity: number;
  amountPkr: number;
  platform?: string;
  link?: string;
}): Promise<{ ok: boolean; contactSynced: boolean; eventTracked: boolean; directSent?: boolean; error?: string }> {
  try {
    const config = await getBrevoConfig();
    if (!config.enabled || !config.apiKey) {
      return { ok: false, contactSynced: false, eventTracked: false, error: "Brevo not configured" };
    }

    if (!params.whatsappPhone?.trim()) {
      return { ok: false, contactSynced: false, eventTracked: false, error: "No WhatsApp phone provided" };
    }

    // 1. Sync contact attribute WHATSAPP
    const contactRes = await syncBrevoContact({
      email: params.email,
      name: params.name,
      whatsappPhone: params.whatsappPhone,
      apiKey: config.apiKey,
    });

    // 2. Track order_completed event
    const eventRes = await trackBrevoOrderCompleted({
      email: params.email,
      whatsappPhone: params.whatsappPhone,
      orderId: params.orderId,
      serviceName: params.serviceName,
      quantity: params.quantity,
      amountPkr: params.amountPkr,
      platform: params.platform,
      link: params.link,
      apiKey: config.apiKey,
    });

    // 3. Optional direct template send if configured
    let directSent = false;
    if (config.whatsappTemplateId && config.senderNumber) {
      const directRes = await sendDirectBrevoWhatsApp({
        phone: params.whatsappPhone,
        templateId: config.whatsappTemplateId,
        senderNumber: config.senderNumber,
        apiKey: config.apiKey,
      });
      directSent = directRes.ok;
    }

    return {
      ok: contactRes.ok || eventRes.ok,
      contactSynced: contactRes.ok,
      eventTracked: eventRes.ok,
      directSent,
    };
  } catch (err) {
    console.warn("[Brevo] Non-fatal notification error:", err);
    return {
      ok: false,
      contactSynced: false,
      eventTracked: false,
      error: err instanceof Error ? err.message : "Unknown Brevo error",
    };
  }
}
