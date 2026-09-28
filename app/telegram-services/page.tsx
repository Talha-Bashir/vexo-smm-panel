import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vexarosmm.com";

export const metadata: Metadata = {
  title: "Telegram SMM Panel – Channel Members & Post Views Provider",
  description: "Boost your Telegram channels and groups with VEXARO SMM panel. High-speed delivery for channel members, group members, and post view increments.",
  keywords: [
    "smm panel",
    "best smm panel",
    "cheap smm panel",
    "affordable smm panel",
    "social media marketing panel",
    "smm reseller panel",
    "automatic smm panel",
    "fast smm panel",
    "vexaro smm",
    "vexaro smm panel",
    "telegram services"
  ],
  alternates: {
    canonical: "https://vexarosmm.com/telegram-services",
  },
  openGraph: {
    title: "Telegram SMM Panel – Channel Members & Post Views Provider",
    description: "Boost your Telegram channels and groups with VEXARO SMM panel. High-speed delivery for channel members, group members, and post view increments.",
    url: "https://vexarosmm.com/telegram-services",
    siteName: "VEXARO SMM Services",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "Telegram SMM Panel – Channel Members & Post Views",
      url: "https://vexarosmm.com/telegram-services",
      provider: {
        "@type": "Organization",
        name: "VEXARO SMM Panel",
        url: SITE_URL,
      },
      serviceType: "Telegram Services",
      description: "Boost your Telegram channels and groups with VEXARO SMM panel. High-speed delivery for channel members, group members, and post view increments.",
      areaServed: ["Worldwide", "Pakistan"],
    },
    {
      "@type": "FAQPage",
      mainEntity: [{"@type":"Question","name":"Can I add members to private Telegram channels?","acceptedAnswer":{"@type":"Answer","text":"Yes, we support both public usernames (@channel) and private invite links (t.me/+hash)."}},{"@type":"Question","name":"Do you offer auto-views for future Telegram posts?","acceptedAnswer":{"@type":"Answer","text":"Yes, our automated post view services can automatically add views to your next 5, 10, or 20 posts as you publish them."}},{"@type":"Question","name":"Is there any risk of channel ban?","acceptedAnswer":{"@type":"Answer","text":"Zero risk. Delivery is throttled to mimic organic channel growth without triggering Telegram spam filters."}}],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": SITE_URL,
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Telegram Services",
          "item": `${SITE_URL}/telegram-services`,
        },
      ],
    },
  ],
};

export default function ServiceLandingPage() {
  return (
    <div className="min-h-screen bg-[#070d0d] text-white selection:bg-[#baff00] selection:text-[#07100f]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070d0d]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-[0_0_20px_rgba(186,255,0,0.35)] border border-[#baff00]/30">
              <img src="/logo.png" alt="VEXARO SMM - Telegram Channel Members & Post Views Panel" className="h-full w-full object-cover" />
            </div>
            <div>
              <span className="text-xl font-black text-white">VEXARO SMM</span>
              <span className="hidden sm:inline-block ml-2 rounded-full border border-lime-400/20 bg-lime-400/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#baff00]">
                Telegram Services
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Home
            </Link>
            <Link
              href="/blog"
              className="text-xs font-semibold text-slate-300 hover:text-[#baff00] transition"
            >
              Blog & Guides
            </Link>
            <a
              href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#25d366]/40 bg-[#25d366]/10 px-3 py-2 text-xs font-bold text-[#25d366] hover:bg-[#25d366]/20 transition"
            >
              <span>WhatsApp Channel</span>
            </a>
            <Link
              href="/login"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 transition"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-[#baff00] px-4 py-2 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] transition shadow-[0_0_15px_rgba(186,255,0,0.2)]"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-slate-400">
          <Link href="/" className="hover:text-[#baff00]">Home</Link>
          <span>/</span>
          <span className="text-white font-semibold">Telegram Services</span>
        </nav>

        <div className="max-w-3xl">
          <span className="inline-block rounded-full border border-lime-400/20 bg-lime-400/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#baff00]">
            ✈️ #1 Telegram Growth Provider
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Telegram SMM Panel – Channel Members & Post Views
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed">
            Build high-authority crypto, trading, e-commerce, and community Telegram channels. VEXARO delivers non-drop channel members, group members, and automated post views at lightning speeds.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="rounded-xl bg-[#baff00] px-7 py-3.5 text-sm font-black text-[#07100f] shadow-[0_0_24px_rgba(186,255,0,0.3)] hover:bg-[#d2ff5a] transition"
            >
              ⚡ Get Started in 30 Seconds
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/10 transition"
            >
              View Live Pricing
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="mt-16 sm:mt-24">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Why Choose VEXARO for Telegram Services?
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Premium infrastructure designed for creators, businesses, and SMM resellers.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                👥
              </div>
              <h3 className="mt-4 text-lg font-black text-white">Channel & Group Members</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Add thousands of members to your public or private Telegram channels with instant delivery.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                👁️
              </div>
              <h3 className="mt-4 text-lg font-black text-white">Post Views & Impressions</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Keep your channel looking lively with automatic post views for recent and upcoming updates.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                ⚡
              </div>
              <h3 className="mt-4 text-lg font-black text-white">0–5 Min Instant Start</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Telegram API orders dispatch within minutes of placement, perfect for new project launches.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                🛡️
              </div>
              <h3 className="mt-4 text-lg font-black text-white">Non-Drop Quality</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                High-stability members with low drop rates and automated replacement guarantees.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                🤖
              </div>
              <h3 className="mt-4 text-lg font-black text-white">Telegram Bot API Compatible</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Directly forward orders from your custom Telegram trading or reseller bots via REST API.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                🇵🇰
              </div>
              <h3 className="mt-4 text-lg font-black text-white">Local SadaPay & Easypaisa</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Convenient zero-fee payment methods tailored for Pakistani and worldwide users.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mt-16 sm:mt-24 border-t border-white/10 pt-16">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Frequently Asked Questions About Telegram Services
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Common questions regarding delivery speed, refill guarantees, and account safety.
          </p>

          <div className="mt-8 space-y-4 max-w-4xl">
            
            <div className="rounded-2xl border border-white/10 bg-[#10191b] p-6">
              <h3 className="text-base font-bold text-white">Can I add members to private Telegram channels?</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">Yes, we support both public usernames (@channel) and private invite links (t.me/+hash).</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#10191b] p-6">
              <h3 className="text-base font-bold text-white">Do you offer auto-views for future Telegram posts?</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">Yes, our automated post view services can automatically add views to your next 5, 10, or 20 posts as you publish them.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#10191b] p-6">
              <h3 className="text-base font-bold text-white">Is there any risk of channel ban?</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">Zero risk. Delivery is throttled to mimic organic channel growth without triggering Telegram spam filters.</p>
            </div>
          </div>
        </section>

        {/* Featured Growth Guides & Tutorials */}
        <section className="mt-16 sm:mt-24 border-t border-white/10 pt-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#baff00]">Learn & Grow</span>
              <h2 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-white">
                Telegram Growth Guides & Community Strategies
              </h2>
            </div>
            <Link href="/blog" className="text-xs font-bold text-[#baff00] hover:underline flex items-center gap-1">
              View All 6 Guides →
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Link
              href="/blog/how-to-start-smm-reseller-business"
              className="group rounded-2xl border border-white/10 bg-[#0d1618] p-5 hover:border-[#baff00]/40 transition space-y-2.5 block"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl select-none">💼</span>
                <span className="rounded-full border border-lime-400/20 bg-lime-400/10 px-2.5 py-0.5 text-[10px] font-bold text-[#baff00]">Reseller Blueprint</span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-[#baff00] transition">
                How to Start a Profitable SMM Reseller Business with API in 2026
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                Learn how crypto community managers and signal providers scale their Telegram channels with automated member growth.
              </p>
              <span className="text-[11px] font-semibold text-[#baff00] block pt-1">Read Complete Guide →</span>
            </Link>

            <Link
              href="/blog/free-signup-bonus-smm-panel-pakistan"
              className="group rounded-2xl border border-white/10 bg-[#0d1618] p-5 hover:border-[#baff00]/40 transition space-y-2.5 block"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl select-none">🎁</span>
                <span className="rounded-full border border-lime-400/20 bg-lime-400/10 px-2.5 py-0.5 text-[10px] font-bold text-[#baff00]">Exclusive Bonus</span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-[#baff00] transition">
                Free Signup Bonus SMM Panel in Pakistan: Claim ₨50 Free Balance
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                Use your instant ₨50 welcome bonus to test Telegram channel post views or subscribers before adding funds.
              </p>
              <span className="text-[11px] font-semibold text-[#baff00] block pt-1">Claim Free Bonus →</span>
            </Link>
          </div>
        </section>

        {/* Other Services Navigation */}
        <section className="mt-16 sm:mt-24 border-t border-white/10 pt-16">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Explore More SMM Services
          </h2>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/smm-panel" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:border-[#baff00] hover:text-white transition">
              Best SMM Panel
            </Link>
            <Link href="/instagram-services" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:border-[#baff00] hover:text-white transition">
              Instagram SMM Panel
            </Link>
            <Link href="/tiktok-services" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:border-[#baff00] hover:text-white transition">
              TikTok SMM Panel
            </Link>
            <Link href="/youtube-services" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:border-[#baff00] hover:text-white transition">
              YouTube SMM Panel
            </Link>
            <Link href="/facebook-services" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:border-[#baff00] hover:text-white transition">
              Facebook SMM Panel
            </Link>
            <Link href="/telegram-services" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:border-[#baff00] hover:text-white transition">
              Telegram SMM Panel
            </Link>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="mt-16 sm:mt-24 rounded-3xl border border-lime-400/30 bg-gradient-to-r from-[#0d2218] to-[#10191b] p-8 sm:p-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Boost Your Presence With VEXARO SMM Panel
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300">
            Join over 50,000 satisfied creators and agencies. Create your free account now.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-xl bg-[#baff00] px-8 py-3.5 text-sm font-black text-[#07100f] shadow-[0_0_24px_rgba(186,255,0,0.3)] hover:bg-[#d2ff5a] transition"
            >
              Sign Up for Free
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#050a0a] py-8 text-xs text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6">
          <p>© 2026 VEXARO SMM. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <a href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q" target="_blank" rel="noreferrer" className="text-[#25d366] hover:underline font-bold">WhatsApp Channel</a>
            <a href="https://vexarosmm.com/" target="_blank" rel="noreferrer" className="text-lime-400 hover:underline font-mono text-[11px]">vexarosmm.com</a>
            <Link href="/" className="hover:text-[#baff00]">Home</Link>
            <Link href="/blog" className="hover:text-[#baff00]">Blog</Link>
            <Link href="/terms" className="hover:text-[#baff00]">Terms</Link>
            <Link href="/privacy" className="hover:text-[#baff00]">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
