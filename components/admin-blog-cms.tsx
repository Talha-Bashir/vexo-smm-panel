"use client";

import { useEffect, useState, useMemo } from "react";

interface AdminBlogPost {
  id: string;
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  summary: string;
  category: string;
  tags: string[];
  authorName: string;
  authorRole: string;
  readTime: string;
  coverIcon: string;
  published: boolean;
  contentMarkdown: string;
  isDbPost: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  "Pakistan Guides",
  "Instagram Growth",
  "YouTube Monetization",
  "Reseller Business",
  "TikTok Virality",
];

export function BlogCmsAdmin() {
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<AdminBlogPost | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCategory, setFormCategory] = useState("Pakistan Guides");
  const [formSummary, setFormSummary] = useState("");
  const [formMetaTitle, setFormMetaTitle] = useState("");
  const [formMetaDesc, setFormMetaDesc] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formReadTime, setFormReadTime] = useState("5 min read");
  const [formAuthorName, setFormAuthorName] = useState("VEXARO Team");
  const [formAuthorRole, setFormAuthorRole] = useState("SMM Strategist");
  const [formCoverIcon, setFormCoverIcon] = useState("🚀");
  const [formTags, setFormTags] = useState("");
  const [formPublished, setFormPublished] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blog", { credentials: "include" });
      const data = await res.json();
      if (data.success && Array.isArray(data.posts)) {
        setPosts(data.posts);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load blog posts.");
    } finally {
      setLoading(false);
    }
  }

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchCat = categoryFilter === "All" || p.category === categoryFilter;
      const q = search.trim().toLowerCase();
      const matchQ =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [posts, categoryFilter, search]);

  function handleOpenCreate() {
    setEditingPost(null);
    setFormTitle("");
    setFormSlug("");
    setFormCategory("Pakistan Guides");
    setFormSummary("");
    setFormMetaTitle("");
    setFormMetaDesc("");
    setFormContent(
      "### 1. Introduction\n\nWrite your guide or article introduction here...\n\n### 2. Strategy & Step-by-Step\n\nAdd your detailed steps or tips...\n\n### 3. Conclusion & Takeaway\n\nWrap up with key insights and a call to action to boost engagement with VEXARO SMM."
    );
    setFormReadTime("5 min read");
    setFormAuthorName("VEXARO Team");
    setFormAuthorRole("SMM Strategist");
    setFormCoverIcon("🚀");
    setFormTags("smm panel, pakistan, social media marketing");
    setFormPublished(true);
    setIsEditorOpen(true);
  }

  function handleOpenEdit(p: AdminBlogPost) {
    setEditingPost(p);
    setFormTitle(p.title);
    setFormSlug(p.slug);
    setFormCategory(p.category || "Pakistan Guides");
    setFormSummary(p.summary || "");
    setFormMetaTitle(p.metaTitle || p.title);
    setFormMetaDesc(p.metaDescription || p.summary || "");
    setFormContent(p.contentMarkdown || "");
    setFormReadTime(p.readTime || "5 min read");
    setFormAuthorName(p.authorName || "VEXARO Team");
    setFormAuthorRole(p.authorRole || "SMM Strategist");
    setFormCoverIcon(p.coverIcon || "🚀");
    setFormTags((p.tags || []).join(", "));
    setFormPublished(p.published !== false);
    setIsEditorOpen(true);
  }

  async function handleSavePost() {
    if (!formTitle.trim() || !formContent.trim()) {
      alert("Please provide both an article Title and Content.");
      return;
    }

    setSaving(true);
    setMsg("");
    setErr("");

    try {
      const payload = {
        id: editingPost?.id,
        title: formTitle.trim(),
        slug: formSlug.trim() || formTitle.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        category: formCategory,
        summary: formSummary.trim(),
        metaTitle: formMetaTitle.trim() || formTitle.trim(),
        metaDescription: formMetaDesc.trim() || formSummary.trim(),
        contentMarkdown: formContent.trim(),
        readTime: formReadTime.trim(),
        authorName: formAuthorName.trim(),
        authorRole: formAuthorRole.trim(),
        coverIcon: formCoverIcon.trim(),
        tags: formTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        published: formPublished,
      };

      const url = "/api/admin/blog";
      const method = editingPost?.isDbPost ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save blog post.");
      }

      setMsg(data.message || "✓ Article published successfully!");
      setIsEditorOpen(false);
      await fetchPosts();
      setTimeout(() => setMsg(""), 5000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save post.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePost(p: AdminBlogPost) {
    if (!confirm(`Are you sure you want to delete "${p.title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/blog?slug=${encodeURIComponent(p.slug)}&id=${encodeURIComponent(p.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete post.");
      }
      setMsg("✓ Post deleted successfully.");
      await fetchPosts();
      setTimeout(() => setMsg(""), 4000);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-white/10 bg-[#111a1d] p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">✍️</span>
            <h2 className="text-xl font-black text-white">Blog CMS &amp; Article Manager</h2>
            <span className="rounded-full bg-[#baff00]/15 px-2.5 py-0.5 text-[10px] font-black uppercase text-[#baff00]">
              {posts.length} Articles
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Publish, edit, and optimize growth articles and guides displayed on <code>/blog</code> without editing code.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/blog"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white transition"
          >
            ↗ View Live Blog
          </a>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="rounded-xl bg-[#baff00] px-4 py-2 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] transition shadow-lg cursor-pointer flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Write New Article</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 font-bold">
          {msg}
        </div>
      )}
      {err && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 font-bold">
          {err}
        </div>
      )}

      {/* Filter controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#111a1d] p-4 sm:flex-row sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles by title, slug, or keywords..."
          className="flex-1 rounded-xl border border-white/10 bg-[#070d0d] px-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#baff00]"
        />

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoryFilter(c)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                categoryFilter === c
                  ? "bg-[#baff00] text-[#07100f]"
                  : "border border-white/10 bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Posts Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111a1d]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/10 bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Article</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Read Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Author</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Loading articles...
                  </td>
                </tr>
              ) : filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No articles match your criteria.
                  </td>
                </tr>
              ) : (
                filteredPosts.map((p) => (
                  <tr key={p.slug} className="hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="flex items-start gap-2.5">
                        <span className="text-xl shrink-0 mt-0.5">{p.coverIcon || "📄"}</span>
                        <div className="min-w-0">
                          <p className="font-bold text-white line-clamp-1">{p.title}</p>
                          <p className="font-mono text-[10px] text-slate-500 truncate mt-0.5">
                            /blog/{p.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{p.readTime}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                          p.published !== false
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {p.published !== false ? "Live" : "Draft"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-semibold">{p.authorName}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/blog/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white transition"
                          title="Preview live article"
                        >
                          👁️
                        </a>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="rounded-lg bg-[#baff00] px-2.5 py-1 text-xs font-bold text-[#07100f] hover:bg-[#d2ff5a] transition cursor-pointer"
                          title="Edit article"
                        >
                          ✏️ Edit
                        </button>
                        {p.isDbPost && (
                          <button
                            type="button"
                            onClick={() => handleDeletePost(p)}
                            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
                            title="Delete article"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[92vh] max-w-3xl w-full overflow-hidden rounded-3xl border border-white/10 bg-[#111a1d] p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">✍️</span>
                <h3 className="text-base font-black text-white">
                  {editingPost ? "Edit Blog Article" : "Create New Blog Article"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                ✕ Cancel
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Article Title *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => {
                      setFormTitle(e.target.value);
                      if (!editingPost) {
                        setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"));
                      }
                    }}
                    placeholder="e.g. How to Get 10,000 TikTok Followers in Pakistan (2026 Strategy)"
                    className="w-full rounded-xl border border-white/10 bg-[#070d0d] px-4 py-2.5 text-xs text-white focus:border-[#baff00] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    URL Slug *
                  </label>
                  <div className="flex items-center rounded-xl border border-white/10 bg-[#070d0d] px-3 py-2 text-xs font-mono text-slate-400">
                    <span className="text-slate-600">/blog/</span>
                    <input
                      type="text"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                      placeholder="tiktok-followers-pakistan-guide"
                      className="w-full bg-transparent text-white outline-none pl-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#070d0d] px-3.5 py-2.5 text-xs text-white focus:border-[#baff00] outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Summary / Excerpt (Displayed on article cards &amp; SERP)
                </label>
                <textarea
                  rows={2}
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="A concise 2-sentence summary of the article..."
                  className="w-full rounded-xl border border-white/10 bg-[#070d0d] p-3 text-xs text-white focus:border-[#baff00] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Article Body (Markdown / Heading format) *
                </label>
                <textarea
                  rows={10}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="### 1. Main Heading&#10;&#10;Paragraph text...&#10;&#10;### 2. Next Section..."
                  className="w-full rounded-xl border border-white/10 bg-[#070d0d] p-3 text-xs text-emerald-300 font-mono leading-relaxed focus:border-[#baff00] outline-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Read Time
                  </label>
                  <input
                    type="text"
                    value={formReadTime}
                    onChange={(e) => setFormReadTime(e.target.value)}
                    placeholder="5 min read"
                    className="w-full rounded-xl border border-white/10 bg-[#070d0d] px-3 py-2 text-xs text-white focus:border-[#baff00] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Cover Icon
                  </label>
                  <input
                    type="text"
                    value={formCoverIcon}
                    onChange={(e) => setFormCoverIcon(e.target.value)}
                    placeholder="🚀"
                    className="w-full rounded-xl border border-white/10 bg-[#070d0d] px-3 py-2 text-xs text-white focus:border-[#baff00] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Author Name
                  </label>
                  <input
                    type="text"
                    value={formAuthorName}
                    onChange={(e) => setFormAuthorName(e.target.value)}
                    placeholder="Talha Bashir"
                    className="w-full rounded-xl border border-white/10 bg-[#070d0d] px-3 py-2 text-xs text-white focus:border-[#baff00] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Publish Status
                  </label>
                  <select
                    value={formPublished ? "true" : "false"}
                    onChange={(e) => setFormPublished(e.target.value === "true")}
                    className="w-full rounded-xl border border-white/10 bg-[#070d0d] px-3 py-2 text-xs text-white focus:border-[#baff00] outline-none font-bold"
                  >
                    <option value="true">🟢 Live Published</option>
                    <option value="false">🟡 Draft Only</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSavePost}
                className="rounded-xl bg-[#baff00] px-5 py-2 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] disabled:opacity-50 transition cursor-pointer"
              >
                {saving ? "Saving..." : "✓ Publish Article"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
