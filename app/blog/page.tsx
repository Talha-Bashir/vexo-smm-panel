import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS, BLOG_CATEGORIES } from "@/lib/blog-data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vexarosmm.com";

export const metadata: Metadata = {
  title: "SMM Growth Blog & Guides (2026) – Social Media Tips & Tutorials",
  description:
    "Official VEXARO SMM Blog. In-depth tutorials and growth strategies for Instagram followers, TikTok viral hacks, YouTube 4000 hours watch time, and SMM reseller business.",
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
  keywords: [
    "smm blog",
    "smm panel pakistan blog",
    "instagram growth guide",
    "youtube watch time tutorial",
    "tiktok algorithm tips",
    "smm reseller guide",
    "buy followers guide",
    "vexaro smm blog",
  ],
  openGraph: {
    title: "VEXARO SMM Growth Blog & Guides (2026)",
    description:
      "Actionable tutorials and wholesale strategies to grow Instagram, TikTok, YouTube, and Facebook engagement.",
    url: `${SITE_URL}/blog`,
    siteName: "VEXARO SMM",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "VEXARO SMM Blog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VEXARO SMM Growth Blog & Guides (2026)",
    description:
      "Actionable tutorials and wholesale strategies to grow Instagram, TikTok, YouTube, and Facebook engagement.",
    images: ["/og-image.png"],
  },
};

export default function BlogIndexPage() {
  const featuredPost = BLOG_POSTS.find((p) => p.featured) || BLOG_POSTS[0];
  const regularPosts = BLOG_POSTS.filter((p) => p.slug !== featuredPost.slug);

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "VEXARO SMM Growth Blog & Guides",
    description:
      "Official VEXARO SMM Blog featuring tutorials on social media marketing, reseller strategies, and platform algorithm insights.",
    url: `${SITE_URL}/blog`,
    publisher: {
      "@type": "Organization",
      name: "VEXARO SMM",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
    },
    hasPart: BLOG_POSTS.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.summary,
      url: `${SITE_URL}/blog/${post.slug}`,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: {
        "@type": "Person",
        name: post.author.name,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-[#070d0d] text-slate-100 flex flex-col">
      {/* Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070d0d]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-[0_0_20px_rgba(186,255,0,0.35)] border border-[#baff00]/30 group-hover:border-[#baff00]/60 transition-all duration-300">
              <img src="/logo.png" alt="VEXARO SMM" className="h-full w-full object-cover" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-white group-hover:text-[#baff00] transition">
                VEXARO <span className="text-[#baff00]">SMM</span>
              </span>
              <span className="hidden sm:inline-block ml-2 rounded-full border border-lime-400/20 bg-lime-400/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#baff00]">
                Knowledge Hub
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden md:inline-flex text-xs font-bold text-slate-300 hover:text-white transition px-3 py-2"
            >
              Services
            </Link>
            <Link
              href="/smm-panel"
              className="hidden md:inline-flex text-xs font-bold text-slate-300 hover:text-white transition px-3 py-2"
            >
              Wholesale Panel
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 hover:border-white/30 hover:bg-white/10 transition"
            >
              Dashboard
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-[#baff00] px-4 py-2 text-xs font-black text-[#07100f] shadow-[0_0_20px_rgba(186,255,0,0.3)] hover:brightness-110 transition"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/[0.08] bg-gradient-to-b from-[#0b1418] via-[#070d0d] to-[#070d0d] px-4 py-16 sm:py-24 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#baff00]/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative mx-auto max-w-5xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#baff00]">
            <span className="h-2 w-2 rounded-full bg-[#baff00] animate-pulse" />
            <span>Official VEXARO SMM Knowledge Base</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white">
            Social Media Growth, Algorithm Secrets &amp; Reseller Guides
          </h1>

          <p className="mx-auto max-w-2xl text-sm sm:text-base text-slate-400 leading-relaxed">
            Data-backed tutorials, platform algorithm breakdowns, and monetization blueprints to help you scale your audience and agency with direct wholesale provider tools.
          </p>

          {/* Category Chips */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-2">
            {BLOG_CATEGORIES.map((cat, idx) => (
              <span
                key={cat}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-default ${
                  idx === 0
                    ? "bg-[#baff00] text-[#07100f] shadow-[0_0_15px_rgba(186,255,0,0.3)]"
                    : "bg-white/5 border border-white/10 text-slate-300 hover:border-white/25 hover:text-white"
                }`}
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 flex-1 w-full space-y-12">
        {/* Featured Post Banner */}
        {featuredPost && (
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#0c1815] to-[#07100f] p-6 sm:p-10 shadow-2xl group hover:border-[#baff00]/40 transition-all duration-300">
            <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-[#baff00]/10 blur-3xl pointer-events-none" />

            <div className="relative grid gap-8 lg:grid-cols-12 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="rounded-full border border-lime-400/30 bg-lime-400/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#baff00]">
                    ⭐ Featured Guide
                  </span>
                  <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs text-slate-300">
                    {featuredPost.category}
                  </span>
                  <span className="text-xs text-slate-400">
                    • {featuredPost.readTime}
                  </span>
                </div>

                <Link href={`/blog/${featuredPost.slug}`}>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white group-hover:text-[#baff00] transition tracking-tight">
                    {featuredPost.title}
                  </h2>
                </Link>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
                  {featuredPost.summary}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#baff00] text-xs font-black text-[#07100f]">
                      {featuredPost.author.avatar}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{featuredPost.author.name}</p>
                      <p className="text-[10px] text-slate-400">{featuredPost.author.role}</p>
                    </div>
                  </div>

                  <Link
                    href={`/blog/${featuredPost.slug}`}
                    className="ml-auto inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-[#baff00] hover:text-[#07100f] transition cursor-pointer"
                  >
                    <span>Read Full Guide</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-4 flex items-center justify-center">
                <div className="relative flex h-48 w-48 sm:h-56 sm:w-56 items-center justify-center rounded-3xl bg-white/[0.03] border border-white/10 shadow-[0_0_40px_rgba(186,255,0,0.15)] group-hover:scale-105 transition-transform duration-500">
                  <span className="text-7xl select-none">{featuredPost.coverIcon}</span>
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-[#07100f] via-transparent to-transparent opacity-60" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Regular Posts Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Latest Growth Strategies &amp; Tutorials
            </h3>
            <span className="text-xs text-slate-400 font-semibold">
              {BLOG_POSTS.length} Comprehensive Articles
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {regularPosts.map((post) => (
              <article
                key={post.slug}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0d1618]/90 p-6 shadow-xl hover:border-[#baff00]/40 hover:bg-[#101b1e] transition-all duration-300"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-300">
                      {post.category}
                    </span>
                    <span>{post.readTime}</span>
                  </div>

                  <Link href={`/blog/${post.slug}`}>
                    <h4 className="text-lg sm:text-xl font-bold text-white group-hover:text-[#baff00] transition leading-snug">
                      {post.title}
                    </h4>
                  </Link>

                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed line-clamp-3">
                    {post.summary}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#baff00]/20 text-[10px] font-black text-[#baff00]">
                      {post.author.avatar}
                    </div>
                    <span className="text-slate-300 font-medium">{post.author.name}</span>
                  </div>

                  <Link
                    href={`/blog/${post.slug}`}
                    className="font-bold text-[#baff00] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1"
                  >
                    <span>Read Article</span>
                    <span>→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Global Growth CTA Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-[#baff00]/30 bg-gradient-to-r from-[#0d1c16] via-[#091512] to-[#07100f] p-8 sm:p-12 shadow-[0_0_50px_rgba(186,255,0,0.1)] text-center space-y-4">
          <span className="inline-block text-3xl">🚀</span>
          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Ready to Accelerate Your Social Presence?
          </h3>
          <p className="mx-auto max-w-xl text-xs sm:text-sm text-slate-300 leading-relaxed">
            Join thousands of influencers, agencies, and businesses scaling on VEXARO SMM. Instant delivery, 0% deposit fees via SadaPay/Easypaisa, and 24/7 WhatsApp support.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-xl bg-[#baff00] px-6 py-3 text-xs font-black text-[#07100f] shadow-[0_0_24px_rgba(186,255,0,0.4)] hover:brightness-110 transition"
            >
              Create Free Account →
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-xs font-bold text-white hover:bg-white/10 transition"
            >
              Explore Live Services
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 bg-[#050a0a] px-4 py-8 text-xs text-slate-400">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative h-6 w-6 rounded-md overflow-hidden border border-[#baff00]/30">
              <img src="/logo.png" alt="VEXARO" className="h-full w-full object-cover" />
            </div>
            <span className="font-bold text-white">VEXARO SMM Knowledge Hub</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <Link href="/smm-panel" className="hover:text-white transition">SMM Panel</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/dashboard" className="text-[#baff00] font-bold hover:underline">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
