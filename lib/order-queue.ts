import { db } from "@/lib/db";
import { dispatchOrderWithFailover } from "@/lib/order-dispatch";
import { queueWhatsAppNotification, getUserWhatsAppPhone } from "@/lib/whatsapp-queue";
import { refundFailedOrder, markOrderProviderSuccess } from "@/lib/wallet";

/**
 * Normalizes a target link or username so that slight variations
 * (http vs https, trailing slashes, www, tracking query parameters)
 * resolve to the exact same canonical target.
 */
export function normalizeTargetLink(rawLink: string): string {
  if (!rawLink) return "";
  let link = rawLink.trim().toLowerCase();

  // Strip protocol
  link = link.replace(/^https?:\/\//, "");

  // Strip www.
  link = link.replace(/^www\./, "");

  // Strip trailing slashes
  link = link.replace(/\/+$/, "");

  // For YouTube video links, preserve the video ID param
  if (link.includes("youtube.com/watch") || link.includes("youtu.be/")) {
    try {
      const url = new URL("https://" + link);
      const v = url.searchParams.get("v");
      if (v) return `youtube.com/watch?v=${v}`;
    } catch {
      // fallback
    }
  }

  // For general social media links, strip tracking query parameters (e.g. ?is_from_webapp=1, ?igsh=...)
  const qIndex = link.indexOf("?");
  if (qIndex !== -1) {
    link = link.substring(0, qIndex).replace(/\/+$/, "");
  }

  return link;
}

/**
 * Checks if a provider failure error message indicates insufficient balance or low funds.
 */
export function isProviderBalanceError(errorMsg?: string | null): boolean {
  if (!errorMsg) return false;
  const lower = String(errorMsg).toLowerCase();
  return (
    lower.includes("not enough funds") ||
    lower.includes("not enough balance") ||
    lower.includes("insufficient balance") ||
    lower.includes("insufficient funds") ||
    lower.includes("low balance") ||
    lower.includes("no funds") ||
    lower.includes("balance is too low") ||
    lower.includes("not enough money") ||
    /not\s+enough.*balance/i.test(lower) ||
    /not\s+enough.*funds/i.test(lower) ||
    /low\s+balance/i.test(lower)
  );
}

/**
 * Checks if the user already has an active order running or queued on the exact same link.
 * Matches even if the service package is different (e.g. Views followed by Likes on the same video).
 */
export async function checkExistingActiveOrderOnLink(
  userId: number,
  link: string,
  currentOrderId?: string
): Promise<{
  hasActiveOrder: boolean;
  activeOrderId?: string;
  activeStatus?: string;
  activeService?: string;
}> {
  const normalizedNewLink = normalizeTargetLink(link);
  if (!normalizedNewLink) {
    return { hasActiveOrder: false };
  }

  try {
    const params: unknown[] = [userId];
    let sql = `
      SELECT id, status, link, service_name, created_at
      FROM vexo_orders
      WHERE user_id = $1
        AND status IN ('Pending', 'Processing', 'In progress', 'inprogress', 'Scheduled')
    `;

    if (currentOrderId) {
      params.push(currentOrderId);
      sql += ` AND id::text != $2`;
    }

    sql += ` ORDER BY created_at ASC`;

    const result = await db.query(sql, params);

    for (const row of result.rows) {
      const normalizedExisting = normalizeTargetLink(row.link);
      if (normalizedExisting === normalizedNewLink) {
        return {
          hasActiveOrder: true,
          activeOrderId: String(row.id),
          activeStatus: String(row.status),
          activeService: String(row.service_name || "Active Order"),
        };
      }
    }

    return { hasActiveOrder: false };
  } catch (err) {
    console.error("[OrderQueue] checkExistingActiveOrderOnLink error:", err);
    return { hasActiveOrder: false };
  }
}

/**
 * Sends an urgent WhatsApp reminder to the admin when a provider has insufficient funds,
 * explaining that the order has been kept in Pending status waiting for provider top-up.
 */
export async function notifyAdminProviderLowFunds(params: {
  orderId: string;
  serviceName: string;
  quantity: number;
  chargePkr: number;
  link: string;
  error: string;
  providerName?: string;
}): Promise<void> {
  try {
    const targetPhones = [
      "923176437013",
      "923088180234",
      ...(process.env.ADMIN_WHATSAPP ? [process.env.ADMIN_WHATSAPP] : []),
      ...(process.env.SUPPORT_WHATSAPP ? [process.env.SUPPORT_WHATSAPP] : []),
    ]
      .map((p) => p.replace(/\D/g, "").replace(/^0/, "92"))
      .filter(Boolean);

    const uniqueAdminPhones = Array.from(new Set(targetPhones));
    const shortId = params.orderId.slice(0, 8);

    const message =
      `🚨 *VEXARO SMM ALERT: Provider Low Funds!* 💸\n\n` +
      `Ek naya customer order queue mein *PENDING* par save ho gaya hai kyunke upstream provider ke paas balance khatam hai!\n\n` +
      `📦 *Order ID:* #${shortId}\n` +
      `🚀 *Service:* ${params.serviceName}\n` +
      `👥 *Quantity:* ${Number(params.quantity).toLocaleString()}\n` +
      `💰 *Customer Paid:* ₨${Number(params.chargePkr).toLocaleString()} PKR\n` +
      `🔗 *Link:* ${params.link}\n` +
      (params.providerName ? `🏢 *Provider:* ${params.providerName}\n` : "") +
      `⚠️ *Provider Error:* ${params.error}\n\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `👉 *Action Required:* Barah-e-karam apne provider account me balance add karein. Customer ka balance wallet se deduct ho chuka hai aur order Pending status me live safe hai. Top up hone ke baad order automatically dispatch ho jayega!`;

    for (const phone of uniqueAdminPhones) {
      await queueWhatsAppNotification({
        phone,
        message,
        type: "provider_low_funds",
        referenceId: `low_funds_${params.orderId}_${phone}`,
        metadata: {
          orderId: params.orderId,
          serviceName: params.serviceName,
          chargePkr: params.chargePkr,
          error: params.error,
        },
      });
    }

    console.log(`[OrderQueue] Admin WhatsApp low funds notification queued for order #${shortId} to ${uniqueAdminPhones.length} admins`);
  } catch (err) {
    console.warn("[OrderQueue] Failed to queue admin low funds notification:", err);
  }
}

/**
 * Dispatches a previously Scheduled order to the upstream provider.
 */
export async function dispatchScheduledOrder(order: {
  id: string;
  user_id: number;
  service_id: string;
  service_name?: string;
  link: string;
  quantity: number;
  whatsapp?: string;
}): Promise<boolean> {
  const orderId = String(order.id);
  const shortId = orderId.slice(0, 8);

  console.log(`[OrderQueue] 🚀 Triggering Scheduled Order #${shortId} (Service: ${order.service_name || order.service_id}, Link: ${order.link})...`);

  try {
    const dispatchResult = await dispatchOrderWithFailover(
      String(order.service_id),
      order.link,
      Number(order.quantity)
    );

    if (dispatchResult.success && dispatchResult.orderId) {
      await db.query(
        `UPDATE vexo_orders
         SET status = 'Pending',
             provider_order_id = $1,
             provider_id = $2,
             failover_attempts = $3,
             failure_reason = NULL,
             updated_at = NOW()
         WHERE id = $4`,
        [
          dispatchResult.orderId,
          dispatchResult.providerId || null,
          JSON.stringify(dispatchResult.failoverAttempts || []),
          orderId,
        ]
      );

      console.log(`[OrderQueue] ✓ Scheduled Order #${shortId} successfully dispatched! Remote Order ID: ${dispatchResult.orderId}`);

      // Notify customer that their scheduled order has now started
      try {
        const userPhone = order.whatsapp || (await getUserWhatsAppPhone(order.user_id));
        if (userPhone) {
          const startMsg =
            `🚀 *VEXARO Order Update (#${shortId})*\n\n` +
            `Aapka queued / scheduled order ab live processing ke liye start ho chuka hai! ✅\n\n` +
            `📦 *Service:* ${order.service_name || "SMM Service"}\n` +
            `👥 *Quantity:* ${Number(order.quantity).toLocaleString()}\n` +
            `🔗 *Link:* ${order.link}\n` +
            `📊 *Status:* Processing / In Progress\n\n` +
            `👉 Live progress dashboard par check karein: https://vexarosmm.com/dashboard`;

          await queueWhatsAppNotification({
            phone: userPhone,
            message: startMsg,
            type: "order_scheduled_started",
            referenceId: `scheduled_started_${orderId}`,
            metadata: { orderId, userId: order.user_id },
          });
        }
      } catch {}

      return true;
    } else {
      const reason = dispatchResult.error || "Upstream provider rejected dispatch";

      if (isProviderBalanceError(reason)) {
        // Keep in Pending waiting for provider balance
        await db.query(
          `UPDATE vexo_orders
           SET status = 'Pending',
               failure_reason = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [`Awaiting provider balance top-up: ${reason}`, orderId]
        );

        await notifyAdminProviderLowFunds({
          orderId,
          serviceName: order.service_name || String(order.service_id),
          quantity: Number(order.quantity),
          chargePkr: 0,
          link: order.link,
          error: reason,
          providerName: dispatchResult.failoverAttempts?.[0]?.providerName,
        });

        return false;
      }

      // If permanent non-balance failure, refund to customer wallet
      await refundFailedOrder(orderId, reason);
      return false;
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[OrderQueue] Scheduled Order #${shortId} dispatch error:`, errorMsg);

    if (isProviderBalanceError(errorMsg)) {
      await db.query(
        `UPDATE vexo_orders
         SET status = 'Pending',
             failure_reason = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [`Awaiting provider balance top-up: ${errorMsg}`, orderId]
      );
    } else {
      await refundFailedOrder(orderId, errorMsg);
    }
    return false;
  }
}

/**
 * Called when an active order completes, cancels, or finishes.
 * Looks for the oldest Scheduled order on the same link for this user,
 * and if no other active order is still running on that link, starts it!
 */
export async function triggerNextScheduledOrderForLink(
  userId: number,
  completedLink: string
): Promise<boolean> {
  const normalizedCompletedLink = normalizeTargetLink(completedLink);
  if (!normalizedCompletedLink) return false;

  try {
    // 1. Fetch all scheduled orders for this user ordered chronologically (FIFO)
    const scheduledRes = await db.query(
      `SELECT id, user_id, service_id, service_name, platform, link, quantity, rate_pkr, charge_pkr, whatsapp
       FROM vexo_orders
       WHERE user_id = $1 AND status = 'Scheduled'
       ORDER BY created_at ASC`,
      [userId]
    );

    if (scheduledRes.rows.length === 0) {
      return false;
    }

    // 2. Find the earliest scheduled order matching this canonical link
    const candidate = scheduledRes.rows.find(
      (r) => normalizeTargetLink(r.link) === normalizedCompletedLink
    );

    if (!candidate) {
      return false;
    }

    // 3. Double-check that NO other order is actively running ('Pending', 'Processing', 'In progress') on this link
    const activeCheck = await db.query(
      `SELECT id, status, link FROM vexo_orders
       WHERE user_id = $1
         AND id::text != $2
         AND status IN ('Pending', 'Processing', 'In progress', 'inprogress')`,
      [userId, String(candidate.id)]
    );

    const hasOtherRunning = activeCheck.rows.some(
      (r) => normalizeTargetLink(r.link) === normalizedCompletedLink
    );

    if (hasOtherRunning) {
      console.log(
        `[OrderQueue] Another active order is still running for ${normalizedCompletedLink}. Order #${String(candidate.id).slice(0, 8)} remains Scheduled.`
      );
      return false;
    }

    // 4. Safe to dispatch the next order on this link!
    return await dispatchScheduledOrder(candidate);
  } catch (err) {
    console.error("[OrderQueue] triggerNextScheduledOrderForLink error:", err);
    return false;
  }
}

/**
 * Sweeps all Scheduled orders in the system.
 * Dispatches any Scheduled order whose link is now completely free of active running orders.
 */
export async function processAllScheduledOrders(): Promise<{ dispatched: number; remaining: number }> {
  let dispatched = 0;
  let remaining = 0;

  try {
    const scheduledOrders = await db.query(
      `SELECT id, user_id, service_id, service_name, platform, link, quantity, whatsapp
       FROM vexo_orders
       WHERE status = 'Scheduled'
       ORDER BY created_at ASC`
    );

    if (scheduledOrders.rows.length === 0) {
      return { dispatched: 0, remaining: 0 };
    }

    // Group candidates by user_id and normalized link to process in FIFO sequence
    const processedLinks = new Set<string>();

    for (const order of scheduledOrders.rows) {
      const linkKey = `${order.user_id}::${normalizeTargetLink(order.link)}`;
      if (processedLinks.has(linkKey)) {
        // An earlier order for this link was already handled in this tick
        remaining++;
        continue;
      }

      // Check if an active order is currently executing on this link
      const activeRes = await db.query(
        `SELECT id, status, link FROM vexo_orders
         WHERE user_id = $1
           AND id::text != $2
           AND status IN ('Pending', 'Processing', 'In progress', 'inprogress')`,
        [order.user_id, String(order.id)]
      );

      const isRunning = activeRes.rows.some(
        (r) => normalizeTargetLink(r.link) === normalizeTargetLink(order.link)
      );

      if (isRunning) {
        remaining++;
        continue;
      }

      // Clear to run!
      processedLinks.add(linkKey);
      const success = await dispatchScheduledOrder(order);
      if (success) {
        dispatched++;
      } else {
        remaining++;
      }
    }
  } catch (err) {
    console.error("[OrderQueue] processAllScheduledOrders error:", err);
  }

  return { dispatched, remaining };
}

/**
 * Retries orders that were put in Pending because upstream provider had no funds,
 * once balance has been topped up.
 */
export async function retryUndispatchedPendingOrders(): Promise<number> {
  let count = 0;
  try {
    const pendingOrders = await db.query(
      `SELECT id, user_id, service_id, service_name, link, quantity, whatsapp
       FROM vexo_orders
       WHERE status = 'Pending'
         AND (provider_order_id IS NULL OR provider_order_id = '')
         AND failure_reason ILIKE '%provider balance%'
       ORDER BY created_at ASC
       LIMIT 10`
    );

    for (const order of pendingOrders.rows) {
      const dispatchResult = await dispatchOrderWithFailover(
        String(order.service_id),
        order.link,
        Number(order.quantity)
      );

      if (dispatchResult.success && dispatchResult.orderId) {
        await db.query(
          `UPDATE vexo_orders
           SET provider_order_id = $1,
               provider_id = $2,
               failover_attempts = $3,
               failure_reason = NULL,
               updated_at = NOW()
           WHERE id = $4`,
          [
            dispatchResult.orderId,
            dispatchResult.providerId || null,
            JSON.stringify(dispatchResult.failoverAttempts || []),
            order.id,
          ]
        );
        count++;
        console.log(`[OrderQueue] ✓ Pending order #${String(order.id).slice(0, 8)} successfully auto-dispatched to provider (Remote ID: ${dispatchResult.orderId})`);
      }
    }
  } catch (err) {
    console.error("[OrderQueue] retryUndispatchedPendingOrders error:", err);
  }
  return count;
}
