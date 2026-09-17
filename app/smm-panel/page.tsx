import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vexo-smm-panel-7sln.vercel.app";

export const metadata: Metadata = {
  title: "Best SMM Panel – Cheapest Automated Social Media Marketing Services",
  description: "Looking for the best SMM panel? VEXARO SMM provides the cheapest and fastest automated social media marketing services with instant delivery and 24/7 support.",
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
    "smm services"
  ],
  alternates: {
    canonical: "https://vexarosmm.com/smm-panel",
  },
  openGraph: {
    title: "Best SMM Panel – Cheapest Automated Social Media Marketing Services",
    description: "Looking for the best SMM panel? VEXARO SMM provides the cheapest and fastest automated social media marketing services with instant delivery and 24/7 support.",
    url: "https://vexarosmm.com/smm-panel",
    siteName: "VEXARO SMM Services",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "Best SMM Panel for Instant Social Media Growth",
      url: "https://vexarosmm.com/smm-panel",
      provider: {
        "@type": "Organization",
        name: "VEXARO SMM Panel",
        url: SITE_URL,
      },
      serviceType: "SMM Services",
      description: "Looking for the best SMM panel? VEXARO SMM provides the cheapest and fastest automated social media marketing services with instant delivery and 24/7 support.",
      areaServed: ["Worldwide", "Pakistan"],
    },
    {
      "@type": "FAQPage",
      mainEntity: [{"@type":"Question","name":"What is an SMM Panel?","acceptedAnswer":{"@type":"Answer","text":"An SMM Panel (Social Media Marketing Panel) is an online platform where users and resellers purchase social media engagement services like followers, likes, views, and watch hours at direct wholesale prices with automated delivery."}},{"@type":"Question","name":"Why is VEXARO considered the best SMM panel?","acceptedAnswer":{"@type":"Answer","text":"VEXARO combines high-speed automated server routing, direct wholesale rates with 0% markup middleman fees, automatic drop refill protection, and 24/7 dedicated support."}},{"@type":"Question","name":"Can I resell VEXARO services to my own clients?","acceptedAnswer":{"@type":"Answer","text":"Yes! VEXARO includes standard v2 API documentation. You can link your own website or panel to automate order forwarding with custom markups."}}],
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
                SMM Services
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
          <span className="text-white font-semibold">SMM Services</span>
        </nav>

        <div className="max-w-3xl">
          <span className="inline-block rounded-full border border-lime-400/20 bg-lime-400/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#baff00]">
            ⚡ The Industry Standard SMM Panel
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Best SMM Panel for Instant Social Media Growth
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed">
            Welcome to VEXARO SMM, the #1 automated SMM panel designed for influencers, digital marketing agencies, resellers, and brands. Get real followers, likes, comments, watch time, and views across Instagram, TikTok, YouTube, Facebook, and Telegram at direct wholesale prices.
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
            Why Choose VEXARO for SMM Services?
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Premium infrastructure designed for creators, businesses, and SMM resellers.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                ⚡
              </div>
              <h3 className="mt-4 text-lg font-black text-white">0–15 Min Automated Start</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Orders are queued and processed automatically by our server infrastructure. No manual delays or bottlenecks.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                💰
              </div>
              <h3 className="mt-4 text-lg font-black text-white">Direct Wholesale Rates</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Eliminate middlemen fees. Buy social media marketing services starting from just a fraction of a cent per 1,000 units.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                🛡️
              </div>
              <h3 className="mt-4 text-lg font-black text-white">100% Wallet Money-Back Guarantee</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                If an order cannot be completed by providers, your full balance is instantly credited back to your platform wallet.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                🤖
              </div>
              <h3 className="mt-4 text-lg font-black text-white">Reseller API Integration</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Easily connect your own SMM reseller panel, website, or Telegram bot using our standard v2 JSON REST API.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                💳
              </div>
              <h3 className="mt-4 text-lg font-black text-white">0% Surcharge Deposits</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Support for SadaPay, Easypaisa, JazzCash, Bank Transfer, Visa/Mastercard, and Crypto with 0% payment processing fees.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                💬
              </div>
              <h3 className="mt-4 text-lg font-black text-white">24/7 Human Support</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Get real human assistance via WhatsApp (+92 317 6437013) and Telegram (@VexaroSMMAdmin) any time of day or night.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mt-16 sm:mt-24 border-t border-white/10 pt-16">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Frequently Asked Questions About SMM Services
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Common questions regarding delivery speed, refill guarantees, and account safety.
          </p>

          <div className="mt-8 space-y-4 max-w-4xl">
            
            <div className="rounded-2xl border border-white/10 bg-[#10191b] p-6">
              <h3 className="text-base font-bold text-white">What is an SMM Panel?</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">An SMM Panel (Social Media Marketing Panel) is an online platform where users and resellers purchase social media engagement services like followers, likes, views, and watch hours at direct wholesale prices with automated delivery.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#10191b] p-6">
              <h3 className="text-base font-bold text-white">Why is VEXARO considered the best SMM panel?</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">VEXARO combines high-speed automated server routing, direct wholesale rates with 0% markup middleman fees, automatic drop refill protection, and 24/7 dedicated support.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#10191b] p-6">
              <h3 className="text-base font-bold text-white">Can I resell VEXARO services to my own clients?</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">Yes! VEXARO includes standard v2 API documentation. You can link your own website or panel to automate order forwarding with custom markups.</p>
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
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <a href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q" target="_blank" rel="noreferrer" className="text-[#25d366] hover:underline font-bold">WhatsApp Channel</a>
            <a href="https://vexo-smm-panel-7sln.vercel.app/" target="_blank" rel="noreferrer" className="text-lime-400 hover:underline font-mono text-[11px]">vexo-smm-panel-7sln.vercel.app</a>
            <Link href="/" className="hover:text-[#baff00]">Home</Link>
            <Link href="/terms" className="hover:text-[#baff00]">Terms</Link>
            <Link href="/privacy" className="hover:text-[#baff00]">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
