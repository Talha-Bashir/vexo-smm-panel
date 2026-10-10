import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { ensureAdminSchema, logAdminActivity } from "@/lib/admin";
import { BLOG_POSTS } from "@/lib/blog-data";

export const dynamic = "force-dynamic";

async function guard() {
  const auth = await requireAdminPermission("settings");
  if (!auth.authorized) {
    return { error: auth.response! };
  }
  return { user: auth.user! };
}

export async function GET() {
  try {
    const g = await guard();
    if (g.error) return g.error;

    await ensureAdminSchema();

    const res = await db.query(
      `SELECT id, slug, title, meta_title, meta_description, summary, category, tags,
              author_name, author_role, read_time, cover_icon, published, content_markdown,
              created_at, updated_at
       FROM vexo_blog_posts
       ORDER BY created_at DESC`
    );

    const dbPosts = res.rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      metaTitle: r.meta_title || r.title,
      metaDescription: r.meta_description || r.summary,
      summary: r.summary,
      category: r.category,
      tags: r.tags || [],
      authorName: r.author_name,
      authorRole: r.author_role,
      readTime: r.read_time,
      coverIcon: r.cover_icon,
      published: r.published,
      contentMarkdown: r.content_markdown,
      isDbPost: true,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    // Also include default static articles for reference if not overridden
    const dbSlugs = new Set(dbPosts.map((p) => p.slug));
    const defaultArticles = BLOG_POSTS.filter((p) => !dbSlugs.has(p.slug)).map((p) => ({
      id: `default-${p.slug}`,
      slug: p.slug,
      title: p.title,
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      summary: p.summary,
      category: p.category,
      tags: p.tags,
      authorName: p.author.name,
      authorRole: p.author.role,
      readTime: p.readTime,
      coverIcon: p.coverIcon,
      published: true,
      contentMarkdown: p.sections.map((s) => `### ${s.heading || ""}\n\n${(s.paragraphs || []).join("\n\n")}`).join("\n\n"),
      isDbPost: false,
      createdAt: p.publishedAt,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      posts: [...dbPosts, ...defaultArticles],
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/blog error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load blog posts." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const g = await guard();
    if (g.error) return g.error;

    await ensureAdminSchema();

    const body = await req.json();
    const title = String(body.title || "").trim();
    let slug = String(body.slug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    const summary = String(body.summary || "").trim();
    const content = String(body.contentMarkdown || "").trim();

    if (!title || !content) {
      return NextResponse.json({ success: false, error: "Title and content are required." }, { status: 400 });
    }

    if (!slug) {
      slug = title.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    }

    const metaTitle = String(body.metaTitle || title).trim();
    const metaDescription = String(body.metaDescription || summary).trim();
    const category = String(body.category || "Pakistan Guides").trim();
    const tags = Array.isArray(body.tags) ? body.tags : [];
    const authorName = String(body.authorName || "VEXARO Team").trim();
    const authorRole = String(body.authorRole || "SMM Strategist").trim();
    const readTime = String(body.readTime || "5 min read").trim();
    const coverIcon = String(body.coverIcon || "🚀").trim();
    const published = body.published !== false;

    const res = await db.query(
      `INSERT INTO vexo_blog_posts (
        slug, title, meta_title, meta_description, summary, category, tags,
        author_name, author_role, read_time, cover_icon, published, content_markdown
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (slug) DO UPDATE
      SET title = EXCLUDED.title,
          meta_title = EXCLUDED.meta_title,
          meta_description = EXCLUDED.meta_description,
          summary = EXCLUDED.summary,
          category = EXCLUDED.category,
          tags = EXCLUDED.tags,
          author_name = EXCLUDED.author_name,
          author_role = EXCLUDED.author_role,
          read_time = EXCLUDED.read_time,
          cover_icon = EXCLUDED.cover_icon,
          published = EXCLUDED.published,
          content_markdown = EXCLUDED.content_markdown,
          updated_at = NOW()
      RETURNING id, slug, title`,
      [slug, title, metaTitle, metaDescription, summary, category, tags, authorName, authorRole, readTime, coverIcon, published, content]
    );

    await logAdminActivity(Number(g.user!.id), "blog_create", "blog_post", slug, { title, slug });

    return NextResponse.json({
      success: true,
      message: "Blog post published successfully.",
      post: res.rows[0],
    });
  } catch (err: unknown) {
    console.error("POST /api/admin/blog error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to publish blog post." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const g = await guard();
    if (g.error) return g.error;

    await ensureAdminSchema();

    const body = await req.json();
    const id = body.id;
    const slug = body.slug;

    if (!id && !slug) {
      return NextResponse.json({ success: false, error: "Post ID or slug is required." }, { status: 400 });
    }

    const title = String(body.title || "").trim();
    const summary = String(body.summary || "").trim();
    const content = String(body.contentMarkdown || "").trim();
    const metaTitle = String(body.metaTitle || title).trim();
    const metaDescription = String(body.metaDescription || summary).trim();
    const category = String(body.category || "Pakistan Guides").trim();
    const tags = Array.isArray(body.tags) ? body.tags : [];
    const authorName = String(body.authorName || "VEXARO Team").trim();
    const authorRole = String(body.authorRole || "SMM Strategist").trim();
    const readTime = String(body.readTime || "5 min read").trim();
    const coverIcon = String(body.coverIcon || "🚀").trim();
    const published = body.published !== false;

    await db.query(
      `UPDATE vexo_blog_posts
       SET title = COALESCE(NULLIF($1, ''), title),
           meta_title = $2,
           meta_description = $3,
           summary = COALESCE(NULLIF($4, ''), summary),
           category = $5,
           tags = $6,
           author_name = $7,
           author_role = $8,
           read_time = $9,
           cover_icon = $10,
           published = $11,
           content_markdown = COALESCE(NULLIF($12, ''), content_markdown),
           updated_at = NOW()
       WHERE id::text = $13 OR slug = $14`,
      [title, metaTitle, metaDescription, summary, category, tags, authorName, authorRole, readTime, coverIcon, published, content, String(id || ""), String(slug || "")]
    );

    await logAdminActivity(Number(g.user!.id), "blog_update", "blog_post", String(slug || id), { title });

    return NextResponse.json({
      success: true,
      message: "Blog post updated successfully.",
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/blog error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to update blog post." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const g = await guard();
    if (g.error) return g.error;

    await ensureAdminSchema();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const slug = searchParams.get("slug");

    if (!id && !slug) {
      return NextResponse.json({ success: false, error: "ID or slug is required to delete." }, { status: 400 });
    }

    await db.query(`DELETE FROM vexo_blog_posts WHERE id::text = $1 OR slug = $2`, [id || "", slug || ""]);
    await logAdminActivity(Number(g.user!.id), "blog_delete", "blog_post", String(slug || id), {});

    return NextResponse.json({
      success: true,
      message: "Blog post removed successfully.",
    });
  } catch (err: unknown) {
    console.error("DELETE /api/admin/blog error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to delete blog post." },
      { status: 500 }
    );
  }
}
