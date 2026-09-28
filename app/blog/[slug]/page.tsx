import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS, type BlogPost } from "@/lib/blog-data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vexarosmm.com";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    return {
      title: "Article Not Found | VEXARO SMM",
    };
  }

  const postUrl = `${SITE_URL}/blog/${post.slug}`;

  return {
    title: `${post.metaTitle}`,
    description: post.metaDescription,
    alternates: {
      canonical: postUrl,
    },
    keywords: post.keywords,
    authors: [{ name: post.author.name, url: SITE_URL }],
    openGraph: {
      type: "article",
      title: post.title,
      description: post.summary,
      url: postUrl,
      siteName: "VEXARO SMM",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      tags: post.tags,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
      images: ["/og-image.png"],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${post.slug}`,
    },
    author: {
      "@type": "Person",
      name: post.author.name,
      jobTitle: post.author.role,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "VEXARO SMM",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
    keywords: post.keywords.join(", "),
    articleSection: post.category,
    image: `${SITE_URL}/og-image.png`,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${SITE_URL}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${SITE_URL}/blog/${post.slug}`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#070d0d] text-slate-100 flex flex-col">
      {/* Structured Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070d0d]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-[0_0_20px_rgba(186,255,0,0.35)] border border-[#baff00]/30 group-hover:border-[#baff00]/60 transition-all duration-300">
              <img src="/logo.png" alt="VEXARO SMM - Pakistan's #1 Social Media Marketing Panel" className="h-full w-full object-cover" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-white group-hover:text-[#baff00] transition">
                VEXARO <span className="text-[#baff00]">SMM</span>
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/blog"
              className="text-xs font-bold text-slate-300 hover:text-white transition px-3 py-2"
            >
              ← All Articles
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

      {/* Breadcrumb Bar */}
      <div className="border-b border-white/5 bg-white/[0.01] px-4 py-3 sm:px-6">
        <nav className="mx-auto max-w-5xl flex items-center gap-2 text-xs text-slate-400 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-white transition">Blog</Link>
          <span>/</span>
          <span className="text-slate-300 font-semibold">{post.category}</span>
        </nav>
      </div>

      {/* Article Main */}
      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-16 sm:px-6 flex-1 w-full space-y-10">
        {/* Article Header */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-xs font-bold text-[#baff00]">
              {post.category}
            </span>
            <span className="text-xs text-slate-400">• {post.readTime}</span>
            <span className="text-xs text-slate-400">• Updated {post.updatedAt}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            {post.title}
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            {post.summary}
          </p>

          {/* Author Card */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#baff00] text-sm font-black text-[#07100f] shadow-[0_0_15px_rgba(186,255,0,0.3)]">
                {post.author.avatar}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{post.author.name}</p>
                <p className="text-xs text-slate-400">{post.author.role}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/signup"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:border-[#baff00]/40 transition"
              >
                Join Free
              </Link>
            </div>
          </div>
        </header>

        {/* Table of Contents */}
        {post.tableOfContents && post.tableOfContents.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#0d1618] p-5 sm:p-6 space-y-3 shadow-lg">
            <p className="text-xs font-black uppercase tracking-wider text-[#baff00] flex items-center gap-2">
              <span>📑</span> Table of Contents
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2 text-xs">
              {post.tableOfContents.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="text-slate-300 hover:text-[#baff00] transition py-1 hover:translate-x-0.5"
                >
                  {item.title}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Article Body */}
        <article className="space-y-10 text-slate-200 leading-relaxed text-sm sm:text-base">
          {post.sections.map((sec, idx) => (
            <section key={idx} id={sec.id} className="space-y-4 scroll-mt-24">
              {sec.heading && (
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white pt-2 border-b border-white/5 pb-2">
                  {sec.heading}
                </h2>
              )}

              {sec.paragraphs &&
                sec.paragraphs.map((p, pIdx) => (
                  <p key={pIdx} className="text-slate-300 leading-relaxed">
                    {p}
                  </p>
                ))}

              {sec.list && (
                <ul className="space-y-2.5 my-4">
                  {sec.list.map((item, lIdx) => (
                    <li key={lIdx} className="flex items-start gap-3 text-slate-200">
                      <span className="mt-1 h-2 w-2 rounded-full bg-[#baff00] shrink-0 shadow-[0_0_8px_#baff00]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {sec.paragraphsAfterList &&
                sec.paragraphsAfterList.map((p, pIdx) => (
                  <p key={pIdx} className="text-slate-300 leading-relaxed">
                    {p}
                  </p>
                ))}

              {sec.highlightBox && (
                <div className="rounded-2xl border border-lime-400/20 bg-lime-400/[0.04] p-5 space-y-2.5 my-4">
                  <h3 className="text-sm font-bold text-[#baff00] uppercase tracking-wider">
                    {sec.highlightBox.title}
                  </h3>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-slate-200">
                    {sec.highlightBox.items.map((item, hIdx) => (
                      <li key={hIdx} className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {sec.callout && (
                <div
                  className={`rounded-xl border p-4 my-4 text-xs sm:text-sm flex items-start gap-3 ${
                    sec.callout.type === "warning"
                      ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                      : sec.callout.type === "success"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                  }`}
                >
                  <span className="text-base shrink-0">
                    {sec.callout.type === "warning" ? "⚠️" : sec.callout.type === "success" ? "✅" : "💡"}
                  </span>
                  <p>{sec.callout.text}</p>
                </div>
              )}
            </section>
          ))}
        </article>

        {/* In-Article Promotion Card */}
        <div className="rounded-3xl border border-[#baff00]/30 bg-gradient-to-br from-[#0c1a16] via-[#091512] to-[#07100f] p-8 sm:p-10 shadow-2xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-xs font-bold text-[#baff00]">
            ⚡ Direct Wholesale API Provider
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Order Real Social Growth on VEXARO SMM
          </h3>
          <p className="mx-auto max-w-xl text-xs sm:text-sm text-slate-300 leading-relaxed">
            Instant delivery, automated drop protection, and 0% deposit fees with SadaPay, Easypaisa, JazzCash, and Binance Pay.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-xl bg-[#baff00] px-6 py-3 text-xs font-black text-[#07100f] shadow-[0_0_24px_rgba(186,255,0,0.4)] hover:brightness-110 transition"
            >
              Start Your First Order →
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-xs font-bold text-white hover:bg-white/10 transition"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <div className="space-y-6 pt-6 border-t border-white/10">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Recommended Guides
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {relatedPosts.map((rel) => (
                <Link
                  key={rel.slug}
                  href={`/blog/${rel.slug}`}
                  className="group rounded-2xl border border-white/10 bg-[#0d1618] p-4 hover:border-[#baff00]/40 transition space-y-2 block"
                >
                  <span className="text-2xl select-none">{rel.coverIcon}</span>
                  <p className="text-[11px] font-bold text-[#baff00]">{rel.category}</p>
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#baff00] transition line-clamp-2">
                    {rel.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 block pt-1">{rel.readTime}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Explore Official Services */}
        <section className="mt-12 rounded-2xl border border-white/10 bg-[#0c1416] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Explore Official VEXARO SMM Services
            </h4>
            <span className="text-[11px] text-[#baff00] font-semibold">Wholesale Rates in PKR</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/tiktok-services" className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-[#baff00] hover:text-white transition">
              TikTok SMM Services
            </Link>
            <Link href="/instagram-services" className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-[#baff00] hover:text-white transition">
              Instagram SMM Services
            </Link>
            <Link href="/youtube-services" className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-[#baff00] hover:text-white transition">
              YouTube SMM Services
            </Link>
            <Link href="/facebook-services" className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-[#baff00] hover:text-white transition">
              Facebook SMM Services
            </Link>
            <Link href="/telegram-services" className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-[#baff00] hover:text-white transition">
              Telegram SMM Services
            </Link>
            <Link href="/smm-panel" className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-[#baff00] hover:text-white transition">
              Cheapest SMM Panel
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 bg-[#050a0a] px-4 py-8 text-xs text-slate-400">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative h-6 w-6 rounded-md overflow-hidden border border-[#baff00]/30">
              <img src="/logo.png" alt="VEXARO SMM Knowledge Hub & Services" className="h-full w-full object-cover" />
            </div>
            <span className="font-bold text-white">VEXARO SMM Knowledge Hub</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <Link href="/blog" className="hover:text-white transition">Blog</Link>
            <Link href="/smm-panel" className="hover:text-white transition">SMM Panel</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/dashboard" className="text-[#baff00] font-bold hover:underline">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
