/**
 * Isolated Telegram notification client for VEXARO Balance Monitor.
 * Sends notifications to the configured Telegram bot and chat.
 */

import { isApiEnabled } from "@/lib/api-manager";
import { db } from "@/lib/db";

const DEFAULT_API_BASE = "https://api.telegram.org";

export async function sendTelegramNotification(
  text: string,
  options?: { force?: boolean }
): Promise<boolean> {
  if (!options?.force && !(await isApiEnabled("telegram_alerts"))) {
    return false;
  }

  let botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  let chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  const apiBase = process.env.TELEGRAM_API_BASE_URL?.trim() || DEFAULT_API_BASE;

  if (!botToken || !chatId) {
    try {
      const res = await db.query(
        `SELECT key, value FROM vexo_platform_settings WHERE key IN ('telegram_bot_token', 'telegram_chat_id', 'admin_telegram_bot_token', 'admin_telegram_chat_id')`
      );
      for (const row of res.rows) {
        if ((row.key === "telegram_bot_token" || row.key === "admin_telegram_bot_token") && row.value?.trim()) {
          botToken = botToken || row.value.trim();
        }
        if ((row.key === "telegram_chat_id" || row.key === "admin_telegram_chat_id") && row.value?.trim()) {
          chatId = chatId || row.value.trim();
        }
      }
    } catch {}
  }

  if (!botToken || !chatId) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[BalanceMonitor] Telegram bot token or chat ID is missing. Notification skipped.");
    }
    return false;
  }

  const endpoint = `${apiBase}/bot${botToken}/sendMessage`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[BalanceMonitor] Telegram API responded with HTTP ${res.status}: ${errText.slice(0, 100)}`);
      return false;
    }

    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[BalanceMonitor] Failed to deliver Telegram alert: ${msg}`);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function formatLowBalanceAlert(providerName: string, balance: number, threshold: number, currency = "USD"): string {
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return (
    `🟡 <b>VEXARO LOW BALANCE ALERT</b>\n\n` +
    `<b>Provider:</b> ${providerName}\n` +
    `<b>Current Balance:</b> ${symbol}${balance.toFixed(2)}\n` +
    `<b>Low Threshold:</b> ${symbol}${threshold.toFixed(2)}\n\n` +
    `⚠️ <i>Please recharge your provider account.</i>`
  );
}

export function formatCriticalBalanceAlert(providerName: string, balance: number, threshold: number, currency = "USD"): string {
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return (
    `🔴 <b>VEXARO CRITICAL BALANCE ALERT</b>\n\n` +
    `<b>Provider:</b> ${providerName}\n` +
    `<b>Current Balance:</b> ${symbol}${balance.toFixed(2)}\n` +
    `<b>Critical Threshold:</b> ${symbol}${threshold.toFixed(2)}\n\n` +
    `🚨 <b>Recharge required immediately.</b>`
  );
}

export function formatRecoveryAlert(providerName: string, balance: number, currency = "USD"): string {
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return (
    `🟢 <b>VEXARO BALANCE RECOVERED</b>\n\n` +
    `<b>Provider:</b> ${providerName}\n` +
    `<b>Current Balance:</b> ${symbol}${balance.toFixed(2)}\n\n` +
    `✅ <i>Provider balance is back above the alert threshold.</i>`
  );
}

export function formatProviderErrorAlert(providerName: string, detail?: string): string {
  return (
    `⚠️ <b>VEXARO BALANCE CHECK ERROR</b>\n\n` +
    `<b>Provider:</b> ${providerName}\n` +
    `<b>Status:</b> Unable to retrieve balance\n` +
    (detail ? `<b>Detail:</b> ${detail.slice(0, 100)}\n\n` : `\n`) +
    `<i>The provider balance could not be checked.\nNo orders or provider settings were changed.</i>`
  );
}

export async function sendSubscriptionTelegramAlert(params: {
  orderId: string | number;
  userName?: string;
  userEmail?: string;
  serviceName: string;
  category?: string;
  link: string;
  quantity: number;
  chargePkr: number;
  balancePkr?: number | null;
  createdAt?: string;
}): Promise<boolean> {
  const timestamp = params.createdAt
    ? new Date(params.createdAt).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })
    : new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" });

  const text =
    `🔔 <b>NEW SUBSCRIPTION ORDER RECEIVED!</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📦 <b>Service:</b> ${params.serviceName}\n` +
    `🏷️ <b>Category:</b> ${params.category || "Subscriptions"}\n` +
    `🆔 <b>Order ID:</b> #${params.orderId}\n` +
    `👤 <b>Customer:</b> ${params.userName || "Buyer"} (${params.userEmail || "No Email"})\n` +
    `🔗 <b>Target / Account:</b> <code>${params.link}</code>\n` +
    `🔢 <b>Quantity:</b> ${params.quantity.toLocaleString()}\n` +
    `💰 <b>Amount Charged:</b> ₨${Number(params.chargePkr || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PKR\n` +
    (params.balancePkr != null ? `💳 <b>Buyer Wallet Left:</b> ₨${Number(params.balancePkr).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PKR\n` : "") +
    `⏰ <b>Order Time:</b> ${timestamp}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ <b>MANUAL FULFILLMENT NOTICE:</b>\n` +
    `<i>This order was NOT dispatched to any upstream API. Please deliver / activate the subscription credentials to the buyer manually!</i>`;

  return sendTelegramNotification(text, { force: true });
}

