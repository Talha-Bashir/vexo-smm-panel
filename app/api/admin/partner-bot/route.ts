import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin-guard";
import { logAdminActivity } from "@/lib/admin";
import {
  checkElevateXHealth,
  getElevateXBalance,
  getElevateXConfig,
  getElevateXProducts,
  getElevateXProviders,
  getElevateXUsage,
  setElevateXConfig,
  getElevateBotMaintenanceStatus,
  setElevateBotMaintenance,
  type ElevateXUsage,
  type ElevateXBalanceResponse,
} from "@/lib/elevatex-api";

export const dynamic = "force-dynamic";

async function guard() {
  const auth = await requireAdminPermission("services");
  if (!auth.authorized) {
    return { error: auth.response! };
  }
  return { user: auth.user! };
}

export async function GET() {
  try {
    const g = await guard();
    if (g.error) return g.error;

    const config = await getElevateXConfig();

    // Run external API requests in parallel to eliminate sequential latency (slashes 9s down to ~1.2s!)
    const [health, balRes, prodRes] = await Promise.all([
      checkElevateXHealth(false),
      config.apiKey ? getElevateXBalance() : Promise.resolve({ ok: false } as ElevateXBalanceResponse),
      config.apiKey ? getElevateXProducts() : Promise.resolve({ ok: false, products: [] } as any),
    ]);

    const botMaint = await getElevateBotMaintenanceStatus(health);

    let balance: ElevateXBalanceResponse | null = null;
    let usage: ElevateXUsage | null = null;
    let providersCount = 1;
    let productsCount = 0;
    let productsList: Array<Record<string, unknown>> = [];

    if (balRes.ok) {
      balance = balRes;
      usage = {
        balance: balRes.balance_usdt || "0.00",
        currency: "USDT",
        apiOrdersTotal: balRes.total_orders || 0,
        apiSpendTotal: balRes.total_volume_usdt || "0.00",
        rateLimitPerMin: balRes.rate_limit_per_min || 120,
      };
    }

    if (prodRes.ok && Array.isArray(prodRes.products)) {
      productsCount = prodRes.products.length;
      productsList = prodRes.products.map((p: any) => {
        const inStock = Boolean(p.stock ? (p.stock.inStock && (p.stock.count == null || p.stock.count > 0)) : true);
        const stockCount = p.stock?.count != null ? Number(p.stock.count) : (inStock ? 1 : 0);
        return {
          ...p,
          inStock,
          stockCount,
        };
      });
    }

    let recentOrders: Array<Record<string, unknown>> = [];
    try {
      const recRes = await db.query(
        `SELECT s.id, s.tool_id, s.tool_name, s.category, s.plan_duration, s.price_pkr,
                s.delivery_contact, s.status, s.license_or_access, s.delivery_type,
                s.provider_order_code, s.expires_at, s.created_at, u.email as user_email
         FROM vexo_tool_subscriptions s
         LEFT JOIN vexo_users u ON u.id = s.user_id
         ORDER BY s.created_at DESC
         LIMIT 50`
      );
      recentOrders = recRes.rows;
    } catch {
      // Table may not exist yet or empty
    }

    let resendApiKey = "";
    let senderEmail = "";
    let whatsappGatewayUrl = "";
    let whatsappGatewayToken = "";
    let brevoApiKey = "";
    let brevoWhatsappTemplateId = "";
    let brevoSenderNumber = "";
    try {
      const notifRes = await db.query(
        `SELECT key, value FROM vexo_platform_settings WHERE key IN ('resend_api_key', 'sender_email', 'whatsapp_gateway_url', 'whatsapp_gateway_token', 'brevo_api_key', 'brevo_whatsapp_template_id', 'brevo_sender_number')`
      );
      for (const row of notifRes.rows) {
        if (row.key === "resend_api_key") resendApiKey = row.value || "";
        if (row.key === "sender_email") senderEmail = row.value || "";
        if (row.key === "whatsapp_gateway_url") whatsappGatewayUrl = row.value || "";
        if (row.key === "whatsapp_gateway_token") whatsappGatewayToken = row.value || "";
        if (row.key === "brevo_api_key") brevoApiKey = row.value || "";
        if (row.key === "brevo_whatsapp_template_id") brevoWhatsappTemplateId = row.value || "";
        if (row.key === "brevo_sender_number") brevoSenderNumber = row.value || "";
      }
    } catch {}

    return NextResponse.json({
      success: true,
      config: {
        apiUrl: config.apiUrl,
        hasApiKey: Boolean(config.apiKey),
        maskedKey: config.apiKey
          ? `${config.apiKey.slice(0, 10)}...${config.apiKey.slice(-4)}`
          : "",
        apiKey: config.apiKey,
        markupPercent: config.markupPercent,
        resendApiKey,
        senderEmail,
        whatsappGatewayUrl,
        whatsappGatewayToken,
        brevoApiKey,
        brevoWhatsappTemplateId,
        brevoSenderNumber,
      },
      health,
      balance,
      usage,
      maintenance: {
        isMaintenance: botMaint.isMaintenance,
        message: botMaint.message || "We are maintaining our services, please come back later.",
        mode: botMaint.mode || "auto",
        reason: botMaint.reason || "none",
        upstreamStatus: botMaint.upstreamStatus || (health.isMaintenance ? "maintenance" : health.status || "online"),
      },
      providersCount,
      productsCount,
      inStockCount: productsList.filter((p: any) => p.inStock).length,
      outOfStockCount: productsList.filter((p: any) => !p.inStock).length,
      sampleProducts: productsList,
      recentOrders,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
      }
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load partner bot details" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const g = await guard();
    if (g.error) return g.error;

    const body = await req.json();
    const action = String(body.action || "save_config").trim();

    if (action === "test_connection") {
      const testKey = body.apiKey !== undefined ? String(body.apiKey).trim() : undefined;
      const health = await checkElevateXHealth();
      const bal = await getElevateXBalance(testKey);

      return NextResponse.json({
        success: health.ok && bal.ok,
        health,
        balance: bal,
        message: bal.ok
          ? `Connected successfully! Live bot balance: $${bal.balance} USD`
          : `Failed: ${bal.error || "Could not authenticate"}`,
      });
    }

    if (action === "save_config") {
      const apiKey = body.apiKey !== undefined ? String(body.apiKey).trim() : undefined;
      const apiUrl = body.apiUrl !== undefined ? String(body.apiUrl).trim() : undefined;
      const markupPercent = body.markupPercent !== undefined ? Number(body.markupPercent) : undefined;

      await setElevateXConfig({ apiKey, apiUrl, markupPercent }, g.user?.id);

      // Save automated notification settings
      const client = await db.connect();
      try {
        if (body.resendApiKey !== undefined) {
          await client.query(
            `INSERT INTO vexo_platform_settings (key, value, updated_at, updated_by)
             VALUES ('resend_api_key', $1, NOW(), $2)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
            [String(body.resendApiKey).trim(), g.user?.id || null]
          );
        }
        if (body.senderEmail !== undefined) {
          await client.query(
            `INSERT INTO vexo_platform_settings (key, value, updated_at, updated_by)
             VALUES ('sender_email', $1, NOW(), $2)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
            [String(body.senderEmail).trim(), g.user?.id || null]
          );
        }
        if (body.whatsappGatewayUrl !== undefined) {
          await client.query(
            `INSERT INTO vexo_platform_settings (key, value, updated_at, updated_by)
             VALUES ('whatsapp_gateway_url', $1, NOW(), $2)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
            [String(body.whatsappGatewayUrl).trim(), g.user?.id || null]
          );
        }
        if (body.whatsappGatewayToken !== undefined) {
          await client.query(
            `INSERT INTO vexo_platform_settings (key, value, updated_at, updated_by)
             VALUES ('whatsapp_gateway_token', $1, NOW(), $2)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
            [String(body.whatsappGatewayToken).trim(), g.user?.id || null]
          );
        }
        if (body.brevoApiKey !== undefined) {
          await client.query(
            `INSERT INTO vexo_platform_settings (key, value, updated_at, updated_by)
             VALUES ('brevo_api_key', $1, NOW(), $2)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
            [String(body.brevoApiKey).trim(), g.user?.id || null]
          );
        }
        if (body.brevoWhatsappTemplateId !== undefined) {
          await client.query(
            `INSERT INTO vexo_platform_settings (key, value, updated_at, updated_by)
             VALUES ('brevo_whatsapp_template_id', $1, NOW(), $2)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
            [String(body.brevoWhatsappTemplateId).trim(), g.user?.id || null]
          );
        }
        if (body.brevoSenderNumber !== undefined) {
          await client.query(
            `INSERT INTO vexo_platform_settings (key, value, updated_at, updated_by)
             VALUES ('brevo_sender_number', $1, NOW(), $2)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
            [String(body.brevoSenderNumber).trim(), g.user?.id || null]
          );
        }
      } finally {
        client.release();
      }

      await logAdminActivity(
        g.user?.id || 1,
        "UPDATE_PARTNER_BOT_CONFIG",
        "Settings",
        "elevatex_bot",
        {
          hasApiKey: Boolean(apiKey),
          apiUrl,
          markupPercent,
          hasResendKey: Boolean(body.resendApiKey),
          hasWhatsAppGateway: Boolean(body.whatsappGatewayUrl),
        }
      );

      return NextResponse.json({
        success: true,
        message: "ElevateX Gateway & Automated Notification settings saved successfully!",
      });
    }

    if (action === "sync_stock") {
      const prodRes = await getElevateXProducts();
      let inStockCount = 0;
      let outOfStockCount = 0;
      let productsList: any[] = [];
      if (prodRes.ok && Array.isArray(prodRes.products)) {
        productsList = prodRes.products.map((p) => {
          const inStock = Boolean(p.stock ? (p.stock.inStock && (p.stock.count == null || p.stock.count > 0)) : true);
          const stockCount = p.stock?.count != null ? Number(p.stock.count) : (inStock ? 1 : 0);
          if (inStock) inStockCount++;
          else outOfStockCount++;
          return {
            ...p,
            inStock,
            stockCount,
          };
        });
      }

      return NextResponse.json({
        success: true,
        message: `Stock synced! ${inStockCount} products in stock, ${outOfStockCount} out of stock.`,
        productsCount: productsList.length,
        inStockCount,
        outOfStockCount,
        sampleProducts: productsList,
      });
    }

    if (action === "set_maintenance") {
      let mode: "auto" | "force_on" | "force_off" = "auto";
      if (body.mode) {
        mode = body.mode === "auto" ? "auto" : body.mode === "force_on" ? "force_on" : "force_off";
      } else if (body.enabled !== undefined) {
        mode = body.enabled ? "force_on" : "force_off";
      }

      const message = body.message !== undefined ? String(body.message).trim() : undefined;

      await setElevateBotMaintenance(mode, message, g.user?.id);

      await logAdminActivity(
        g.user?.id || 1,
        "UPDATE_PARTNER_BOT_MAINTENANCE",
        "Settings",
        "elevatex_bot",
        { mode, message }
      );

      const status = await getElevateBotMaintenanceStatus();

      return NextResponse.json({
        success: true,
        message: mode === "auto"
          ? "Switched to AUTOMATIC mode. The store will dynamically monitor upstream Telegram Bot status."
          : mode === "force_on"
            ? "Maintenance mode is now FORCED ON. Store displays maintenance notices."
            : "Maintenance mode is now FORCED OFF. Store returned to normal operations.",
        maintenance: status,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Partner bot operation failed" },
      { status: 500 }
    );
  }
}
