import { db } from "@/lib/db";
import {
  ensureProvidersSchema,
  fetchProviderBalance,
  fetchProviderServices,
  getRegisteredProviders,
  ProviderConfig,
} from "@/lib/providers";
import { getLiveUsdToPkrRate } from "@/lib/exchange-rate";
import { generateServiceDescription, sanitizeServiceDescription } from "@/lib/service-descriptions";

const USD_TO_PKR = Number(process.env.USD_TO_PKR || "278.0");
const DEFAULT_MARKUP = Number(process.env.VEXO_MARKUP || "0.07"); // 7% profit margin

export interface ServiceQuote {
  providerId: string;
  providerName: string;
  remoteServiceId: string;
  name: string;
  category?: string;
  type: string;
  rateUsd: number;
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
  isGuaranteed: boolean;
  description?: string;
}

export function normalizeDashes(str: string): string {
  return (str || "").replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-");
}

export const NO_REFILL_PATTERN =
  /no[\s-]*refill|without[\s-]*refill|refill[\s:]*no|refill[\s:]*0|0%[\s-]*refill|drop[\s-]*100%|100%[\s-]*drop|drop[\s-]*able|dropable|high[\s-]*drop|drop[\s-]*high|no[\s-]*guarantee|non[\s-]*guaranteed|not[\s-]*guaranteed|can[\s-]*drop|drop[\s-]*possible/i;

export function isDropOrNoRefill(name: string, category: string = "", description: string = ""): boolean {
  const text = normalizeDashes(`${name} ${category} ${description}`);
  return NO_REFILL_PATTERN.test(text);
}

export function detectGuarantee(name: string, category: string, refillFlag?: boolean, description?: string): boolean {
  // CRITICAL: Any service marked drop-able, 100% drop, or no-refill is NEVER guaranteed.
  if (isDropOrNoRefill(name, category, description)) {
    return false;
  }

  const text = normalizeDashes(`${name} ${category}`);
  // Include guaranteed indicators
  const guaranteePattern = /refill|guarantee|guaranteed|non-drop|non drop|r30|r60|r90|r365|lifetime|permanent/i;
  return Boolean(refillFlag || guaranteePattern.test(text));
}

export function detectPlatform(name: string, category: string): string {
  const text = `${category} ${name}`.toLowerCase();
  if (text.includes("instagram") || text.includes("ig ")) return "Instagram";
  if (text.includes("tiktok") || text.includes("tik tok")) return "TikTok";
  if (text.includes("youtube") || text.includes("yt ")) return "YouTube";
  if (text.includes("facebook") || text.includes("fb ")) return "Facebook";
  if (text.includes("telegram") || text.includes("tg ")) return "Telegram";
  if (text.includes("twitter") || text.includes(" x ") || text.includes("x/twitter") || text.startsWith("x ")) return "X (Twitter)";
  if (text.includes("whatsapp")) return "WhatsApp";
  if (text.includes("spotify")) return "Spotify";
  if (text.includes("threads")) return "Threads";
  if (text.includes("snapchat")) return "Snapchat";
  if (text.includes("linkedin")) return "LinkedIn";
  if (text.includes("traffic") || text.includes("website")) return "Website Traffic";
  return "Other";
}

export function generateGroupKey(
  platform: string,
  name: string,
  category: string = "",
  type: string = "Default",
  min: number | string = 1,
  max: number | string = 100000,
  isGuaranteed: boolean = false
): string {
  const rawText = `${name} ${category}`.toLowerCase();
  const clean = name
    .toLowerCase()
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 1. Detect Voice Call Marketing packages by specific call quantity
  if (name.toLowerCase().includes("voice") && (name.toLowerCase().includes("call") || name.toLowerCase().includes("calling"))) {
    const callMatch = name.match(/(\d+)\s*(?:calls|call)/i);
    const callQty = callMatch ? `${callMatch[1]}_calls` : "custom_calls";
    return `whatsapp_voice_call_${callQty}`;
  }

  // 2. Detect WhatsApp specific actions
  if (platform === "WhatsApp") {
    if (rawText.includes("poll") || rawText.includes("vote")) {
      const optMatch = name.match(/option\s*([a-z0-9]+)|answer\s*([a-z0-9]+)/i);
      const opt = optMatch ? `_${(optMatch[1] || optMatch[2]).toLowerCase()}` : "";
      return `whatsapp_poll_votes${opt}_${isGuaranteed ? "guaranteed" : "regular"}`;
    }
    if (rawText.includes("react") || rawText.includes("emoji")) {
      return `whatsapp_reactions_${isGuaranteed ? "guaranteed" : "regular"}`;
    }
    if (rawText.includes("channel") && (rawText.includes("follower") || rawText.includes("member") || rawText.includes("subscriber"))) {
      return `whatsapp_channel_followers_${isGuaranteed ? "guaranteed" : "regular"}`;
    }
    if (rawText.includes("message") && rawText.includes("customer")) {
      return `whatsapp_customer_messaging`;
    }
    if (rawText.includes("number") || rawText.includes("otp")) {
      const country = rawText.includes("indian") ? "india" : rawText.includes("uk") ? "uk" : "global";
      return `whatsapp_virtual_number_${country}`;
    }
  }

  // 3. Detect specific subscription / account package services
  const isPackage = type?.toLowerCase()?.includes("package") || (Number(min) === 1 && Number(max) === 1);
  const durationMatch = name.match(/(1|3|6|12)\s*(?:month|year|day|months|years|days)|30\s*days|180\s*days|365\s*days|lifetime/i);
  const duration = durationMatch ? durationMatch[0].toLowerCase().replace(/\s+/g, "") : "";

  const knownBrands = ["canva", "adobe", "chatgpt", "capcut", "crunchyroll", "disney", "netflix", "elevenlabs", "prime", "chaupal"];
  for (const brand of knownBrands) {
    if (rawText.includes(brand)) {
      return `subscription_${brand}_${duration || "std"}_${isGuaranteed ? "guaranteed" : "regular"}`;
    }
  }

  // 4. Standard SMM Actions
  let action = "other";
  if (clean.includes("story")) action = "story_views";
  else if (clean.includes("reel")) action = "reels_views";
  else if (clean.includes("follower")) action = "followers";
  else if (clean.includes("like")) action = "likes";
  else if (clean.includes("view")) action = "views";
  else if (clean.includes("subscriber")) action = "subscribers";
  else if (clean.includes("comment")) action = "comments";
  else if (clean.includes("share") || clean.includes("repost")) action = "shares";
  else if (clean.includes("reaction")) action = "reactions";
  else if (clean.includes("save")) action = "saves";
  else if (clean.includes("watch time") || clean.includes("hours")) action = "watch_hours";
  else if (clean.includes("member")) action = "members";

  // If action is still "other" or it's a fixed package, create a unique slug based on clean title
  if (action === "other" || isPackage) {
    const slug = clean.split(" ").slice(0, 4).join("_");
    return `${platform.toLowerCase()}_pkg_${slug}_${duration || "std"}_${isGuaranteed ? "guaranteed" : "regular"}`;
  }

  let tier = "standard";
  if (clean.includes("vip") || clean.includes("real") || clean.includes("high quality") || clean.includes("hq")) {
    tier = "high_quality";
  }

  const guaranteeTag = isGuaranteed ? "guaranteed" : "regular";
  return `${platform.toLowerCase()}_${action}_${tier}_${guaranteeTag}`;
}

export interface SyncStats {
  providersSynced: number;
  totalRawServices: number;
  totalRoutedServices: number;
  providerCounts: Record<string, number>;
  providerBalances: Record<string, number>;
  errors: string[];
}

export async function syncAllProvidersAndRoute(): Promise<SyncStats> {
  await ensureProvidersSchema();
  const providers = await getRegisteredProviders();

  const stats: SyncStats = {
    providersSynced: 0,
    totalRawServices: 0,
    totalRoutedServices: 0,
    providerCounts: {},
    providerBalances: {},
    errors: [],
  };

  // 1. Fetch live balances and services in parallel from all 4 providers
  const providerServicesMap = new Map<string, Array<Record<string, unknown>>>();

  await Promise.all(
    providers.map(async (p) => {
      if (!p.enabled) return;
      try {
        // Balance
        try {
          const bal = await fetchProviderBalance(p);
          stats.providerBalances[p.name] = bal.balance;
        } catch (balErr) {
          console.warn(`Balance check failed for ${p.name}:`, balErr);
        }

        // Services
        const rawServices = await fetchProviderServices(p);
        providerServicesMap.set(p.id, rawServices);
        stats.providerCounts[p.name] = rawServices.length;
        stats.totalRawServices += rawServices.length;
        stats.providersSynced++;
      } catch (err) {
        const msg = `Failed to sync services from ${p.name}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(msg);
        stats.errors.push(msg);
      }
    })
  );

  // 2. Clear & Upsert raw provider services into vexo_provider_services in high-speed batches
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const providerIds = Array.from(providerServicesMap.keys());
    if (providerIds.length > 0) {
      await client.query(`DELETE FROM vexo_provider_services WHERE provider_id = ANY($1)`, [providerIds]);
    }

    const allRawRows: Array<{
      providerId: string;
      remoteServiceId: string;
      name: string;
      type: string;
      category: string;
      rateUsd: number;
      min: number;
      max: number;
      refill: boolean;
      cancel: boolean;
      isGuaranteed: boolean;
      groupKey: string;
      description?: string;
    }> = [];

    for (const [providerId, rawServices] of providerServicesMap.entries()) {
      for (const item of rawServices) {
        const remoteServiceId = String(item.service ?? "").trim();
        if (!remoteServiceId) continue;

        const name = String(item.name || "").trim();
        const type = String(item.type || "Default").trim();
        const category = String(item.category || "General").trim();
        const rawRate = Number(item.rate || 0);
        if (!Number.isFinite(rawRate) || rawRate <= 0 || rawRate > 10000) {
          continue;
        }
        const rateUsd = Math.round(rawRate * 1000000) / 1000000;
        const min = Math.max(1, Math.min(Number(item.min || 1), 2000000000));
        const max = Math.max(min, Math.min(Number(item.max || 100000), 2147483647));
        const description = sanitizeServiceDescription(String(item.desc || item.description || "").trim());
        const rawRefill = Boolean(item.refill);
        const isDrop = isDropOrNoRefill(name, category, description);
        const refill = isDrop ? false : rawRefill;
        const cancel = Boolean(item.cancel);

        const platform = detectPlatform(name, category);
        const isGuaranteed = isDrop ? false : detectGuarantee(name, category, refill, description);
        const groupKey = generateGroupKey(platform, name, category, type, min, max, isGuaranteed);

        allRawRows.push({
          providerId,
          remoteServiceId,
          name,
          type,
          category,
          rateUsd,
          min,
          max,
          refill,
          cancel,
          isGuaranteed,
          groupKey,
          description,
        });
      }
    }

    const RAW_BATCH_SIZE = 100;
    for (let i = 0; i < allRawRows.length; i += RAW_BATCH_SIZE) {
      const batch = allRawRows.slice(i, i + RAW_BATCH_SIZE);
      const valClauses: string[] = [];
      const params: unknown[] = [];
      let pIdx = 1;
      for (const r of batch) {
        valClauses.push(`($${pIdx}, $${pIdx+1}, $${pIdx+2}, $${pIdx+3}, $${pIdx+4}, $${pIdx+5}, $${pIdx+6}, $${pIdx+7}, $${pIdx+8}, $${pIdx+9}, $${pIdx+10}, $${pIdx+11}, $${pIdx+12})`);
        params.push(r.providerId, r.remoteServiceId, r.name, r.type, r.category, r.rateUsd, r.min, r.max, r.refill, r.cancel, r.isGuaranteed, r.groupKey, r.description);
        pIdx += 13;
      }
      await client.query(
        `INSERT INTO vexo_provider_services
         (provider_id, remote_service_id, name, type, category, rate_usd, min, max, refill, cancel, is_guaranteed, service_group_key, description)
         VALUES ${valClauses.join(", ")}
         ON CONFLICT (provider_id, remote_service_id) DO UPDATE SET
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           category = EXCLUDED.category,
           rate_usd = EXCLUDED.rate_usd,
           min = EXCLUDED.min,
           max = EXCLUDED.max,
           refill = EXCLUDED.refill,
           cancel = EXCLUDED.cancel,
           is_guaranteed = EXCLUDED.is_guaranteed,
           service_group_key = EXCLUDED.service_group_key,
           description = EXCLUDED.description,
           updated_at = NOW()`,
        params
      );
    }

    await client.query("COMMIT");
  } catch (dbErr) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw dbErr;
  } finally {
    client.release();
  }

  // 3. Run the Least-Cost Routing Engine
  const routedCount = await runLeastCostRouting();
  stats.totalRoutedServices = routedCount;

  return stats;
}

export async function runLeastCostRouting(): Promise<number> {
  await ensureProvidersSchema();

  // 1. Fetch existing manual overrides and auto_route preferences from vexo_routed_services
  const existingRouted = await db.query(
    `SELECT id, service_group_key, auto_route, active_provider_id, active_remote_service_id, rate_multiplier, popular, enabled
     FROM vexo_routed_services`
  );

  const existingMap = new Map<string, Record<string, unknown>>();
  for (const row of existingRouted.rows) {
    existingMap.set(String(row.service_group_key), row);
  }

  // 2. Fetch all raw services grouped by service_group_key
  const allServicesRes = await db.query(
    `SELECT ps.id, ps.provider_id, p.name as provider_name, ps.remote_service_id, ps.name, ps.type, ps.category,
            ps.rate_usd, ps.min, ps.max, ps.refill, ps.cancel, ps.is_guaranteed, ps.service_group_key, ps.description
     FROM vexo_provider_services ps
     JOIN vexo_providers p ON p.id = ps.provider_id
     WHERE p.enabled = true AND ps.rate_usd > 0
     ORDER BY ps.service_group_key, ps.rate_usd ASC`
  );

  // Group by service_group_key
  const groups = new Map<string, ServiceQuote[]>();
  for (const row of allServicesRes.rows) {
    const key = String(row.service_group_key);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({
      providerId: row.provider_id,
      providerName: row.provider_name,
      remoteServiceId: String(row.remote_service_id),
      name: row.name,
      category: row.category || "",
      type: row.type,
      rateUsd: Number(row.rate_usd),
      min: Number(row.min),
      max: Number(row.max),
      refill: Boolean(row.refill),
      cancel: Boolean(row.cancel),
      isGuaranteed: Boolean(row.is_guaranteed),
      description: String(row.description || "").trim(),
    });
  }

  const liveUsdToPkr = await getLiveUsdToPkrRate();
  const routedItems: Array<Record<string, unknown>> = [];

  for (const [groupKey, quotes] of groups.entries()) {
    if (quotes.length === 0) continue;

    // Determine platform
    const platform = detectPlatform(quotes[0].name, quotes[0].category || "");
    const isGuaranteed = quotes.some((q) => q.isGuaranteed);

    // Filter for guaranteed providers if group is guaranteed, otherwise use all available
    const eligibleQuotes = isGuaranteed
      ? quotes.filter((q) => q.isGuaranteed).length > 0
        ? quotes.filter((q) => q.isGuaranteed)
        : quotes
      : quotes;

    // Sort by rate USD ascending (Lowest Cost First)
    eligibleQuotes.sort((a, b) => a.rateUsd - b.rateUsd);

    const cheapest = eligibleQuotes[0];

    // Build provider rates map for side-by-side matrix view
    // CRITICAL FIX: Pick the cheapest eligible quote per provider, prioritizing guaranteed quotes if service is guaranteed
    const providerRatesObj: Record<string, { rateUsd: number; remoteId: string; name: string; guaranteed: boolean }> = {};
    const sortedQuotesForMatrix = [...quotes].sort((a, b) => a.rateUsd - b.rateUsd);
    for (const q of sortedQuotesForMatrix) {
      const prev = providerRatesObj[q.providerId];
      if (!prev) {
        providerRatesObj[q.providerId] = {
          rateUsd: q.rateUsd,
          remoteId: q.remoteServiceId,
          name: q.name,
          guaranteed: q.isGuaranteed,
        };
      } else if (isGuaranteed && !prev.guaranteed && q.isGuaranteed) {
        providerRatesObj[q.providerId] = {
          rateUsd: q.rateUsd,
          remoteId: q.remoteServiceId,
          name: q.name,
          guaranteed: q.isGuaranteed,
        };
      } else if (q.rateUsd < prev.rateUsd && (!isGuaranteed || q.isGuaranteed === prev.guaranteed)) {
        providerRatesObj[q.providerId] = {
          rateUsd: q.rateUsd,
          remoteId: q.remoteServiceId,
          name: q.name,
          guaranteed: q.isGuaranteed,
        };
      }
    }

    // Build ordered fallback queue with distinct providers (Rank 1 = Primary, Rank 2 = Failover 1, etc.)
    const seenProviders = new Set<string>();
    const distinctProviderFallback: ServiceQuote[] = [];
    for (const eq of eligibleQuotes) {
      if (!seenProviders.has(eq.providerId)) {
        seenProviders.add(eq.providerId);
        distinctProviderFallback.push(eq);
      }
    }

    const fallbackQueue = distinctProviderFallback.map((q, idx) => ({
      rank: idx + 1,
      providerId: q.providerId,
      providerName: q.providerName,
      remoteServiceId: q.remoteServiceId,
      rateUsd: q.rateUsd,
      isGuaranteed: q.isGuaranteed,
    }));

    // Check existing record
    const existing = existingMap.get(groupKey);
    const autoRoute = existing ? existing.auto_route !== false : true;
    const rateMultiplier = existing ? Number(existing.rate_multiplier || (1 + DEFAULT_MARKUP)) : (1 + DEFAULT_MARKUP);
    // Filter: "Compare panels services and list ONLY those which are cheaper"
    // 1. Multiple providers competed across panels OR ultra-cheap baseline (<= $0.50)
    // 2. Base rate is affordable (<= $5.00)
    const providerSet = new Set(quotes.map((q) => q.providerId));
    const isMultiProvider = providerSet.size >= 2;
    const isPackageService = cheapest.type?.toLowerCase()?.includes("package") || (Number(cheapest.min) === 1 && Number(cheapest.max) === 1);
    const isAffordable = cheapest.rateUsd <= 5.0 || (isPackageService && cheapest.rateUsd <= 15.0);
    const isCheaperService = (isMultiProvider || cheapest.rateUsd <= 5.0) && isAffordable;

    const enabled = isCheaperService;
    const popular = existing ? Boolean(existing.popular) : false;

    // If auto_route is true, pick the cheapest. If false, retain admin's manual provider choice.
    const activeProviderId = autoRoute ? cheapest.providerId : String(existing?.active_provider_id || cheapest.providerId);
    const activeRemoteServiceId = autoRoute ? cheapest.remoteServiceId : String(existing?.active_remote_service_id || cheapest.remoteServiceId);

    // Selected base rate USD
    const selectedQuote = quotes.find((q) => q.providerId === activeProviderId && q.remoteServiceId === activeRemoteServiceId) || cheapest;
    const baseRateUsd = selectedQuote.rateUsd;

    // Calculate retail PKR price with multiplier and markup
    const ratePkr = Math.round(baseRateUsd * liveUsdToPkr * rateMultiplier * 10000) / 10000;

    // Check if the selected service is drop-able or no-refill
    const isServiceDrop = isDropOrNoRefill(selectedQuote.name, selectedQuote.category, selectedQuote.description);
    const finalGuaranteed = isServiceDrop ? false : isGuaranteed;
    const finalRefill = isServiceDrop ? false : selectedQuote.refill;

    // Generate user-facing clean title
    const cleanTitle = generateDisplayTitle(platform, groupKey, finalGuaranteed, selectedQuote.name);

    routedItems.push({
      cleanTitle,
      platform,
      category: String(selectedQuote.category || platform || "General").trim(),
      groupKey,
      isGuaranteed: finalGuaranteed,
      autoRoute,
      activeProviderId,
      activeRemoteServiceId,
      baseRateUsd,
      rateMultiplier,
      ratePkr,
      min: selectedQuote.min,
      max: selectedQuote.max,
      refill: finalRefill,
      cancel: selectedQuote.cancel,
      enabled,
      popular,
      fallbackQueue,
      providerRatesObj,
      description:
        sanitizeServiceDescription(String(selectedQuote.description || "").trim()) ||
        generateServiceDescription({
          name: cleanTitle,
          platform,
          category: String(selectedQuote.category || platform || "General").trim(),
          min: Number(selectedQuote.min || 10),
          max: Number(selectedQuote.max || 100000),
          isGuaranteed: finalGuaranteed,
          refill: finalRefill,
        }),
    });
  }

  // Batch upsert routed services in chunks of 25
  const ROUTED_BATCH = 25;
  for (let i = 0; i < routedItems.length; i += ROUTED_BATCH) {
    const chunk = routedItems.slice(i, i + ROUTED_BATCH);
    const valClauses: string[] = [];
    const params: unknown[] = [];
    let pIdx = 1;
    for (const r of chunk) {
      valClauses.push(`($${pIdx}, $${pIdx+1}, $${pIdx+2}, $${pIdx+3}, $${pIdx+4}, $${pIdx+5}, $${pIdx+6}, $${pIdx+7}, $${pIdx+8}, $${pIdx+9}, $${pIdx+10}, $${pIdx+11}, $${pIdx+12}, $${pIdx+13}, $${pIdx+14}, $${pIdx+15}, $${pIdx+16}, $${pIdx+17}, $${pIdx+18}, $${pIdx+19})`);
      params.push(
        r.cleanTitle,
        r.platform,
        r.category,
        r.groupKey,
        r.isGuaranteed,
        r.autoRoute,
        r.activeProviderId,
        r.activeRemoteServiceId,
        r.baseRateUsd,
        r.rateMultiplier,
        r.ratePkr,
        r.min,
        r.max,
        r.refill,
        r.cancel,
        r.enabled,
        r.popular,
        JSON.stringify(r.fallbackQueue),
        JSON.stringify(r.providerRatesObj),
        r.description
      );
      pIdx += 20;
    }

    await db.query(
      `INSERT INTO vexo_routed_services
       (name, platform, category, service_group_key, is_guaranteed, auto_route, active_provider_id, active_remote_service_id, base_rate_usd, rate_multiplier, rate_pkr, min, max, refill, cancel, enabled, popular, fallback_queue, provider_rates, description)
       VALUES ${valClauses.join(", ")}
       ON CONFLICT (service_group_key) DO UPDATE SET
         name = EXCLUDED.name,
         platform = EXCLUDED.platform,
         category = EXCLUDED.category,
         is_guaranteed = EXCLUDED.is_guaranteed,
         active_provider_id = CASE WHEN vexo_routed_services.auto_route THEN EXCLUDED.active_provider_id ELSE vexo_routed_services.active_provider_id END,
         active_remote_service_id = CASE WHEN vexo_routed_services.auto_route THEN EXCLUDED.active_remote_service_id ELSE vexo_routed_services.active_remote_service_id END,
         base_rate_usd = EXCLUDED.base_rate_usd,
         rate_pkr = EXCLUDED.rate_pkr,
         min = EXCLUDED.min,
         max = EXCLUDED.max,
         refill = EXCLUDED.refill,
         cancel = EXCLUDED.cancel,
         enabled = EXCLUDED.enabled,
         fallback_queue = EXCLUDED.fallback_queue,
         provider_rates = EXCLUDED.provider_rates,
         description = EXCLUDED.description,
         updated_at = NOW()`,
      params
    );
  }

  // Purge any stale/obsolete routed services that no longer match any valid groupKey
  const activeKeys = routedItems.map((r) => r.groupKey as string);
  if (activeKeys.length > 0) {
    await db.query(`DELETE FROM vexo_routed_services WHERE service_group_key != ALL($1::varchar[])`, [activeKeys]);
  }

  return routedItems.length;
}

function generateDisplayTitle(platform: string, groupKey: string, isGuaranteed: boolean, originalName: string): string {
  if (originalName.length <= 130 && !originalName.includes("Azadi") && !originalName.includes("PKR")) {
    return originalName;
  }

  const parts = groupKey.split("_");
  const action = parts[1] || "services";
  const tier = parts[2] === "high_quality" ? "High Quality / Real" : "Standard Speed";
  const guaranteeBadge = isGuaranteed ? "⚡ Lifetime Refill Guarantee" : "⚡ Instant Delivery";

  const actionCapitalized = action.charAt(0).toUpperCase() + action.slice(1);
  return `${platform} ${actionCapitalized} | ${tier} | ${guaranteeBadge}`;
}
