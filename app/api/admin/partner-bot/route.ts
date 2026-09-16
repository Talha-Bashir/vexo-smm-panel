import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin-guard";
import { logAdminActivity } from "@/lib/admin";
import {
  checkGGSomaHealth,
  getGGSomaBalance,
  getGGSomaConfig,
  getGGSomaProducts,
  getGGSomaProviders,
  getGGSomaUsage,
  setGGSomaConfig,
  type GGSomaUsage,
} from "@/lib/ggsoma-api";

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

    const config = await getGGSomaConfig();
    const health = await checkGGSomaHealth();

    let balance: Record<string, unknown> | null = null;
    let usage: GGSomaUsage | null = null;
    let providersCount = 0;
    let productsCount = 0;
    let productsList: Array<Record<string, unknown>> = [];

    if (config.apiKey) {
      const balRes = await getGGSomaBalance();
      if (balRes.ok) balance = balRes;

      const usageRes = await getGGSomaUsage();
      if (usageRes.ok) usage = usageRes.usage || null;

      const provRes = await getGGSomaProviders();
      if (provRes.ok && Array.isArray(provRes.providers)) {
        providersCount = provRes.providers.length;
      }

      const prodRes = await getGGSomaProducts();
      let inStockCount = 0;
      let outOfStockCount = 0;
      if (prodRes.ok && Array.isArray(prodRes.products)) {
        productsCount = prodRes.products.length;
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
      },
      health,
      balance,
      usage,
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
      const health = await checkGGSomaHealth();
      const bal = await getGGSomaBalance(testKey);

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

      await setGGSomaConfig({ apiKey, apiUrl, markupPercent }, g.user?.id);

      await logAdminActivity(
        g.user?.id || 1,
        "UPDATE_PARTNER_BOT_CONFIG",
        "Settings",
        "ggsoma_bot",
        {
          hasApiKey: Boolean(apiKey),
          apiUrl,
          markupPercent,
        }
      );

      return NextResponse.json({
        success: true,
        message: "Telegram Bot Partner API configuration saved successfully!",
      });
    }

    if (action === "sync_stock") {
      const prodRes = await getGGSomaProducts();
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

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Partner bot operation failed" },
      { status: 500 }
    );
  }
}
