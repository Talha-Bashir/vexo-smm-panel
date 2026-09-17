import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vexarosmm.com";

export const metadata: Metadata = {
  title: "YouTube SMM Panel – Monetization Watch Time & Subscribers",
  description: "Complete 4,000 watch hours and 1,000 subscribers fast with the #1 YouTube SMM panel. Monetization-safe views, subscribers, likes, and watch time.",
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
    "youtube services"
  ],
  alternates: {
    canonical: "https://vexarosmm.com/youtube-services",
  },
  openGraph: {
    title: "YouTube SMM Panel – Monetization Watch Time & Subscribers",
    description: "Complete 4,000 watch hours and 1,000 subscribers fast with the #1 YouTube SMM panel. Monetization-safe views, subscribers, likes, and watch time.",
    url: "https://vexarosmm.com/youtube-services",
    siteName: "VEXARO SMM Services",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "YouTube SMM Panel – 4000 Watch Hours & Subscribers",
      url: "https://vexarosmm.com/youtube-services",
      provider: {
        "@type": "Organization",
        name: "VEXARO SMM Panel",
        url: SITE_URL,
      },
      serviceType: "YouTube Services",
      description: "Complete 4,000 watch hours and 1,000 subscribers fast with the #1 YouTube SMM panel. Monetization-safe views, subscribers, likes, and watch time.",
      areaServed: ["Worldwide", "Pakistan"],
    },
    {
      "@type": "FAQPage",
      mainEntity: [{"@type":"Question","name":"Are these YouTube watch hours safe for channel monetization?","acceptedAnswer":{"@type":"Answer","text":"Yes. Our watch hours packages are delivered using organic audience retention models designed specifically to meet YouTube Partner Program eligibility requirements safely."}},{"@type":"Question","name":"How long does 4,000 watch hours delivery take?","acceptedAnswer":{"@type":"Answer","text":"Depending on your video length, watch hours are paced naturally over 5 to 14 days to appear organic in YouTube Studio."}},{"@type":"Question","name":"What video length is recommended for watch hours?","acceptedAnswer":{"@type":"Answer","text":"We recommend uploading at least one video that is 60+ minutes in duration for optimal watch hour accumulation."}}],
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#baff00] text-lg font-black text-[#07100f] shadow-[0_0_20px_rgba(186,255,0,0.3)]">
              V
            </div>
            <div>
              <span className="text-xl font-black text-white">VEXARO SMM</span>
              <span className="hidden sm:inline-block ml-2 rounded-full border border-lime-400/20 bg-lime-400/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#baff00]">
                YouTube Services
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
          <span className="text-white font-semibold">YouTube Services</span>
        </nav>

        <div className="max-w-3xl">
          <span className="inline-block rounded-full border border-lime-400/20 bg-lime-400/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#baff00]">
            ▶️ #1 YouTube Monetization Partner
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            YouTube SMM Panel – 4000 Watch Hours & Subscribers
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed">
            Fast-track your YouTube Partner Program (YPP) monetization eligibility. VEXARO SMM delivers non-drop 4,000 watch hours, authentic subscribers, high-retention views, and likes with 100% safety guarantees.
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
            Why Choose VEXARO for YouTube Services?
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Premium infrastructure designed for creators, businesses, and SMM resellers.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                ⏱️
              </div>
              <h3 className="mt-4 text-lg font-black text-white">4,000 Watch Hours Packages</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Complete your monetization requirement safely with high-retention video watch time delivered naturally.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                🔴
              </div>
              <h3 className="mt-4 text-lg font-black text-white">1,000 Non-Drop Subscribers</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Genuine YouTube subscribers that stay permanent on your channel to meet YouTube Partner Program thresholds.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                👁️
              </div>
              <h3 className="mt-4 text-lg font-black text-white">Monetization-Safe Views</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                High retention video views with organic referral traffic sources (Suggested, Browse Features, External Search).
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                👍
              </div>
              <h3 className="mt-4 text-lg font-black text-white">Likes & Custom Comments</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Enhance engagement ratios to signal high community satisfaction and video quality to YouTube algorithms.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                🛡️
              </div>
              <h3 className="mt-4 text-lg font-black text-white">Drop-Free Refill Protection</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Our YouTube services feature guaranteed refill protection to maintain your channel subscriber and hour counts.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                📈
              </div>
              <h3 className="mt-4 text-lg font-black text-white">Analytics Verified</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Track delivery progress directly inside your YouTube Studio dashboard with real-time analytics updates.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mt-16 sm:mt-24 border-t border-white/10 pt-16">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Frequently Asked Questions About YouTube Services
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Common questions regarding delivery speed, refill guarantees, and account safety.
          </p>

          <div className="mt-8 space-y-4 max-w-4xl">
            
            <div className="rounded-2xl border border-white/10 bg-[#10191b] p-6">
              <h3 className="text-base font-bold text-white">Are these YouTube watch hours safe for channel monetization?</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">Yes. Our watch hours packages are delivered using organic audience retention models designed specifically to meet YouTube Partner Program eligibility requirements safely.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#10191b] p-6">
              <h3 className="text-base font-bold text-white">How long does 4,000 watch hours delivery take?</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">Depending on your video length, watch hours are paced naturally over 5 to 14 days to appear organic in YouTube Studio.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#10191b] p-6">
              <h3 className="text-base font-bold text-white">What video length is recommended for watch hours?</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">We recommend uploading at least one video that is 60+ minutes in duration for optimal watch hour accumulation.</p>
            </div>
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
          <div className="flex gap-6">
            <Link href="/" className="hover:text-[#baff00]">Home</Link>
            <Link href="/terms" className="hover:text-[#baff00]">Terms</Link>
            <Link href="/privacy" className="hover:text-[#baff00]">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
