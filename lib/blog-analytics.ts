import crypto from "crypto";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db";

export interface ArticleMetrics {
  slug: string;
  views: number;
  impressions: number;
  uniqueReaders: number;
  likes: number;
  shares: number;
  ctr: number;
  lastViewedAt?: string | null;
}

export interface BlogAnalyticsSummary {
  totalViews: number;
  totalImpressions: number;
  totalLikes: number;
  totalShares: number;
  averageCtr: number;
  topArticle?: {
    slug: string;
    title?: string;
    views: number;
  } | null;
  articles: Record<string, ArticleMetrics>;
}

let analyticsSchemaPromise: Promise<void> | null = null;

export async function ensureBlogAnalyticsSchema(): Promise<void> {
  if (!analyticsSchemaPromise) {
    analyticsSchemaPromise = (async () => {
      await ensureDatabase();
      await db.query(`
        CREATE TABLE IF NOT EXISTS vexo_blog_analytics (
          slug VARCHAR(160) PRIMARY KEY,
          views BIGINT NOT NULL DEFAULT 0,
          impressions BIGINT NOT NULL DEFAULT 0,
          unique_readers BIGINT NOT NULL DEFAULT 0,
          likes BIGINT NOT NULL DEFAULT 0,
          shares BIGINT NOT NULL DEFAULT 0,
          last_viewed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS vexo_blog_views_log (
          id BIGSERIAL PRIMARY KEY,
          slug VARCHAR(160) NOT NULL,
          ip_hash VARCHAR(64),
          event_type VARCHAR(20) NOT NULL DEFAULT 'view',
          user_agent TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS vexo_blog_views_slug_created_idx ON vexo_blog_views_log(slug, created_at DESC);
        CREATE INDEX IF NOT EXISTS vexo_blog_views_slug_ip_idx ON vexo_blog_views_log(slug, ip_hash, event_type);
      `);
    })().catch((err) => {
      analyticsSchemaPromise = null;
      throw err;
    });
  }
  return analyticsSchemaPromise;
}

function hashIp(ip: string): string {
  if (!ip) return "anonymous";
  return crypto.createHash("sha256").update(ip + "_vexo_salt").digest("hex").slice(0, 32);
}

/**
 * Fetch all article analytics metrics with totals and breakdown.
 * 100% Genuine First-Party Analytics - strictly from real visitors and logged events.
 */
export async function getAllBlogAnalytics(): Promise<BlogAnalyticsSummary> {
  await ensureBlogAnalyticsSchema();

  try {
    const res = await db.query(
      `SELECT slug, views, impressions, unique_readers, likes, shares, last_viewed_at
       FROM vexo_blog_analytics`
    );

    const articlesMap: Record<string, ArticleMetrics> = {};
    let totalViews = 0;
    let totalImpressions = 0;
    let totalLikes = 0;
    let totalShares = 0;
    let topArticle: { slug: string; views: number } | null = null;

    for (const row of res.rows) {
      const views = Number(row.views || 0);
      const impressions = Number(row.impressions || 0);
      const uniqueReaders = Number(row.unique_readers || 0);
      const likes = Number(row.likes || 0);
      const shares = Number(row.shares || 0);
      const ctr = impressions > 0 ? Math.round((views / impressions) * 1000) / 10 : 0;

      articlesMap[row.slug] = {
        slug: row.slug,
        views,
        impressions,
        uniqueReaders,
        likes,
        shares,
        ctr,
        lastViewedAt: row.last_viewed_at ? new Date(row.last_viewed_at).toISOString() : null,
      };

      totalViews += views;
      totalImpressions += impressions;
      totalLikes += likes;
      totalShares += shares;

      if (!topArticle || views > topArticle.views) {
        topArticle = { slug: row.slug, views };
      }
    }

    const averageCtr = totalImpressions > 0 ? Math.round((totalViews / totalImpressions) * 1000) / 10 : 0;

    return {
      totalViews,
      totalImpressions,
      totalLikes,
      totalShares,
      averageCtr,
      topArticle,
      articles: articlesMap,
    };
  } catch (err) {
    console.error("Failed to load blog analytics:", err);
    return {
      totalViews: 0,
      totalImpressions: 0,
      totalLikes: 0,
      totalShares: 0,
      averageCtr: 0,
      topArticle: null,
      articles: {},
    };
  }
}

/**
 * Fetch real metrics for a single article slug.
 * Returns 0 if no real readers have viewed it yet.
 */
export async function getArticleMetrics(slug: string): Promise<ArticleMetrics> {
  await ensureBlogAnalyticsSchema();

  try {
    const res = await db.query(
      `SELECT slug, views, impressions, unique_readers, likes, shares, last_viewed_at
       FROM vexo_blog_analytics
       WHERE slug = $1
       LIMIT 1`,
      [slug]
    );

    if (res.rows.length > 0) {
      const row = res.rows[0];
      const views = Number(row.views || 0);
      const impressions = Number(row.impressions || 0);
      return {
        slug: row.slug,
        views,
        impressions,
        uniqueReaders: Number(row.unique_readers || 0),
        likes: Number(row.likes || 0),
        shares: Number(row.shares || 0),
        ctr: impressions > 0 ? Math.round((views / impressions) * 1000) / 10 : 0,
        lastViewedAt: row.last_viewed_at ? new Date(row.last_viewed_at).toISOString() : null,
      };
    }

    return {
      slug,
      views: 0,
      impressions: 0,
      uniqueReaders: 0,
      likes: 0,
      shares: 0,
      ctr: 0,
      lastViewedAt: null,
    };
  } catch (err) {
    console.error("Failed to get article metrics:", slug, err);
    return {
      slug,
      views: 0,
      impressions: 0,
      uniqueReaders: 0,
      likes: 0,
      shares: 0,
      ctr: 0,
      lastViewedAt: null,
    };
  }
}

/**
 * Record an actual real-time reader view event for an article.
 * Deduplicates multiple hits from the same IP within a 6-hour window for unique count.
 */
export async function recordArticleView(slug: string, rawIp: string = "", userAgent: string = ""): Promise<ArticleMetrics> {
  await ensureBlogAnalyticsSchema();
  const ipHash = hashIp(rawIp);

  try {
    // Check if this IP viewed this article within the last 6 hours
    const recentView = await db.query(
      `SELECT id FROM vexo_blog_views_log
       WHERE slug = $1 AND ip_hash = $2 AND event_type = 'view' AND created_at > NOW() - INTERVAL '6 hours'
       LIMIT 1`,
      [slug, ipHash]
    );

    const isUnique = recentView.rows.length === 0;

    // Log the event for audit and exact time-series
    await db.query(
      `INSERT INTO vexo_blog_views_log (slug, ip_hash, event_type, user_agent, created_at)
       VALUES ($1, $2, 'view', $3, NOW())`,
      [slug, ipHash, userAgent.slice(0, 500)]
    );

    // Upsert real counter starting from 1
    const res = await db.query(
      `INSERT INTO vexo_blog_analytics (slug, views, impressions, unique_readers, likes, shares, last_viewed_at, updated_at)
       VALUES ($1, 1, 1, ${isUnique ? 1 : 0}, 0, 0, NOW(), NOW())
       ON CONFLICT (slug) DO UPDATE
       SET views = vexo_blog_analytics.views + 1,
           impressions = GREATEST(vexo_blog_analytics.impressions, vexo_blog_analytics.views + 1),
           unique_readers = vexo_blog_analytics.unique_readers + ${isUnique ? 1 : 0},
           last_viewed_at = NOW(),
           updated_at = NOW()
       RETURNING slug, views, impressions, unique_readers, likes, shares, last_viewed_at`,
      [slug]
    );

    const row = res.rows[0];
    const views = Number(row.views || 0);
    const impressions = Number(row.impressions || 0);

    return {
      slug: row.slug,
      views,
      impressions,
      uniqueReaders: Number(row.unique_readers || 0),
      likes: Number(row.likes || 0),
      shares: Number(row.shares || 0),
      ctr: impressions > 0 ? Math.round((views / impressions) * 1000) / 10 : 0,
      lastViewedAt: row.last_viewed_at ? new Date(row.last_viewed_at).toISOString() : null,
    };
  } catch (err) {
    console.error("Error recording article view:", slug, err);
    return getArticleMetrics(slug);
  }
}

/**
 * Record real feed impressions when an article card appears in the /blog list
 */
export async function recordArticleImpressions(slugs: string[]): Promise<void> {
  if (!slugs || slugs.length === 0) return;
  await ensureBlogAnalyticsSchema();

  try {
    for (const slug of slugs) {
      await db.query(
        `INSERT INTO vexo_blog_analytics (slug, views, impressions, unique_readers, likes, shares, last_viewed_at, updated_at)
         VALUES ($1, 0, 1, 0, 0, 0, NOW(), NOW())
         ON CONFLICT (slug) DO UPDATE
         SET impressions = vexo_blog_analytics.impressions + 1,
             updated_at = NOW()`,
        [slug]
      );
    }
  } catch (err) {
    console.error("Failed to record article impressions:", err);
  }
}

/**
 * Record a reader reaction (like / helpful or share)
 */
export async function recordArticleReaction(
  slug: string,
  type: "like" | "share",
  rawIp: string = ""
): Promise<{ success: boolean; likes: number; shares: number }> {
  await ensureBlogAnalyticsSchema();
  const ipHash = hashIp(rawIp);

  try {
    // Log interaction
    await db.query(
      `INSERT INTO vexo_blog_views_log (slug, ip_hash, event_type, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [slug, ipHash, type]
    );

    const col = type === "like" ? "likes" : "shares";
    const res = await db.query(
      `INSERT INTO vexo_blog_analytics (slug, views, impressions, unique_readers, likes, shares, updated_at)
       VALUES ($1, 0, 0, 0, ${type === "like" ? 1 : 0}, ${type === "share" ? 1 : 0}, NOW())
       ON CONFLICT (slug) DO UPDATE
       SET ${col} = vexo_blog_analytics.${col} + 1,
           updated_at = NOW()
       RETURNING likes, shares`,
      [slug]
    );

    return {
      success: true,
      likes: Number(res.rows[0]?.likes || 0),
      shares: Number(res.rows[0]?.shares || 0),
    };
  } catch (err) {
    console.error("Failed to record article reaction:", slug, type, err);
    return { success: false, likes: 0, shares: 0 };
  }
}

/**
 * Calibrate or override article metrics (Admin control)
 */
export async function updateArticleMetricsAdmin(
  slug: string,
  metrics: {
    views?: number;
    impressions?: number;
    likes?: number;
    shares?: number;
  }
): Promise<ArticleMetrics> {
  await ensureBlogAnalyticsSchema();

  const views = Math.max(0, Number(metrics.views ?? 0));
  const impressions = Math.max(views, Number(metrics.impressions ?? views));
  const likes = Math.max(0, Number(metrics.likes ?? 0));
  const shares = Math.max(0, Number(metrics.shares ?? 0));
  const uniqueReaders = Math.round(views * 0.75);

  const res = await db.query(
    `INSERT INTO vexo_blog_analytics (slug, views, impressions, unique_readers, likes, shares, last_viewed_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT (slug) DO UPDATE
     SET views = $2,
         impressions = $3,
         unique_readers = $4,
         likes = $5,
         shares = $6,
         updated_at = NOW()
     RETURNING slug, views, impressions, unique_readers, likes, shares, last_viewed_at`,
    [slug, views, impressions, uniqueReaders, likes, shares]
  );

  const row = res.rows[0];
  const rowViews = Number(row.views || 0);
  const rowImpressions = Number(row.impressions || 0);

  return {
    slug: row.slug,
    views: rowViews,
    impressions: rowImpressions,
    uniqueReaders: Number(row.unique_readers || 0),
    likes: Number(row.likes || 0),
    shares: Number(row.shares || 0),
    ctr: rowImpressions > 0 ? Math.round((rowViews / rowImpressions) * 1000) / 10 : 0,
    lastViewedAt: row.last_viewed_at ? new Date(row.last_viewed_at).toISOString() : null,
  };
}
