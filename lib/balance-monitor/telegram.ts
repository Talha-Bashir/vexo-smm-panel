/**
 * Isolated Telegram notification client for VEXARO Balance Monitor.
 * Sends notifications to the configured Telegram bot and chat.
 */

const DEFAULT_API_BASE = "https://api.telegram.org";

export async function sendTelegramNotification(text: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  const apiBase = process.env.TELEGRAM_API_BASE_URL?.trim() || DEFAULT_API_BASE;

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
