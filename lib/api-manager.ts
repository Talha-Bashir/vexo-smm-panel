import { db } from "@/lib/db";

export type ApiServiceName =
  | "resend_email"
  | "elevatex_bot"
  | "telegram_alerts"
  | "exchange_rates"
  | "smm_dispatch";

export interface ApiServiceMeta {
  key: ApiServiceName;
  name: string;
  category: "Email" | "Fulfillment" | "Alerts" | "Rates" | "Orders";
  description: string;
  defaultEnabled: boolean;
}

export const API_SERVICES_CATALOG: ApiServiceMeta[] = [
  {
    key: "resend_email",
    name: "Customer Email Delivery API (Resend)",
    category: "Email",
    description: "Sends automated order access credentials, activation links, and invoices to customer email inboxes.",
    defaultEnabled: true,
  },
  {
    key: "elevatex_bot",
    name: "ElevateX / Partner Bot API",
    category: "Fulfillment",
    description: "Automated fulfillment gateway connecting upstream bot inventory for instant tools and subscriptions.",
    defaultEnabled: true,
  },
  {
    key: "telegram_alerts",
    name: "Telegram Admin Bot Alerts",
    category: "Alerts",
    description: "Real-time admin channel alerts for new orders, customer payments, stock depletion, and low balance warnings.",
    defaultEnabled: true,
  },
  {
    key: "exchange_rates",
    name: "Live USD / PKR Currency Sync API",
    category: "Rates",
    description: "Fetches live market exchange rates. When disabled, uses fixed base USD/PKR pricing with zero external calls.",
    defaultEnabled: true,
  },
  {
    key: "smm_dispatch",
    name: "Upstream SMM Provider Dispatch API",
    category: "Orders",
    description: "Automatically dispatches social media orders (TikTok, IG, YouTube) to upstream provider servers.",
    defaultEnabled: true,
  },
];

/**
 * Checks if a specific API service is currently enabled
 */
export async function isApiEnabled(serviceKey: ApiServiceName): Promise<boolean> {
  const dbKey = `api_toggle_${serviceKey}`;
  try {
    const res = await db.query(
      `SELECT value FROM vexo_platform_settings WHERE key = $1 LIMIT 1`,
      [dbKey]
    );
    if (res.rows.length === 0 || res.rows[0].value == null) {
      const meta = API_SERVICES_CATALOG.find((s) => s.key === serviceKey);
      return meta ? meta.defaultEnabled : true;
    }
    return res.rows[0].value === "true";
  } catch {
    // If table doesn't exist yet, return default
    const meta = API_SERVICES_CATALOG.find((s) => s.key === serviceKey);
    return meta ? meta.defaultEnabled : true;
  }
}

/**
 * Get all API statuses as a key-value record
 */
export async function getAllApiToggles(): Promise<Record<ApiServiceName, boolean>> {
  const result: Record<string, boolean> = {};
  for (const item of API_SERVICES_CATALOG) {
    result[item.key] = item.defaultEnabled;
  }

  try {
    const res = await db.query(
      `SELECT key, value FROM vexo_platform_settings WHERE key LIKE 'api_toggle_%'`
    );
    for (const row of res.rows) {
      const shortKey = row.key.replace("api_toggle_", "") as ApiServiceName;
      if (shortKey in result) {
        result[shortKey] = row.value === "true";
      }
    }
  } catch {
    // Non-fatal
  }

  return result as Record<ApiServiceName, boolean>;
}

/**
 * Update an API service toggle state
 */
export async function setApiToggle(
  serviceKey: ApiServiceName,
  enabled: boolean,
  updatedBy?: number
): Promise<void> {
  const dbKey = `api_toggle_${serviceKey}`;
  await db.query(
    `INSERT INTO vexo_platform_settings (key, value, updated_at, updated_by)
     VALUES ($1, $2, NOW(), $3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
    [dbKey, enabled ? "true" : "false", updatedBy || null]
  );
}
