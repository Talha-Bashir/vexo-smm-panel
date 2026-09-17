import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vexo-smm-panel-7sln.vercel.app";

export const metadata: Metadata = {
  title: "Instagram SMM Panel – Buy Real Followers, Likes, Views & Reels Growth",
  description: "Scale your Instagram profile with the #1 Instagram SMM panel. Instant delivery of followers, likes, comments, and reels views with 30-day auto-refill.",
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
    "instagram services"
  ],
  alternates: {
    canonical: "https://vexarosmm.com/instagram-services",
  },
  openGraph: {
    title: "Instagram SMM Panel – Buy Real Followers, Likes, Views & Reels Growth",
    description: "Scale your Instagram profile with the #1 Instagram SMM panel. Instant delivery of followers, likes, comments, and reels views with 30-day auto-refill.",
    url: "https://vexarosmm.com/instagram-services",
    siteName: "VEXARO SMM Services",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "Instagram SMM Panel – Fast Followers, Likes & Reels Views",
      url: "https://vexarosmm.com/instagram-services",
      provider: {
        "@type": "Organization",
        name: "VEXARO SMM Panel",
        url: SITE_URL,
      },
      serviceType: "Instagram Services",
      description: "Scale your Instagram profile with the #1 Instagram SMM panel. Instant delivery of followers, likes, comments, and reels views with 30-day auto-refill.",
      areaServed: ["Worldwide", "Pakistan"],
    },
    {
      "@type": "FAQPage",
      mainEntity: [{"@type":"Question","name":"Are VEXARO Instagram followers safe for my account?","acceptedAnswer":{"@type":"Answer","text":"Yes, 100% safe. We never request your password, and our delivery networks use gradual, organic pacing to comply with Instagram platform limits."}},{"@type":"Question","name":"How quickly do Instagram likes and views start?","acceptedAnswer":{"@type":"Answer","text":"Most Instagram orders start within 1 to 15 minutes. High-speed views and likes begin updating almost instantaneously."}},{"@type":"Question","name":"Do you offer refills if followers drop?","acceptedAnswer":{"@type":"Answer","text":"Yes! Our guaranteed Instagram services come with 30-day refill protection. If any drop occurs, trigger a free refill directly from your orders dashboard."}}],
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
                Instagram Services
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
          <span className="text-white font-semibold">Instagram Services</span>
        </nav>

        <div className="max-w-3xl">
          <span className="inline-block rounded-full border border-lime-400/20 bg-lime-400/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#baff00]">
            📸 #1 Instagram SMM Services
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Instagram SMM Panel – Fast Followers, Likes & Reels Views
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed">
            Accelerate your Instagram credibility and algorithm reach. VEXARO SMM delivers high-retention Instagram followers, targeted post likes, viral Reels views, and custom comments with zero password requirements and 30-day refill guarantees.
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
            Why Choose VEXARO for Instagram Services?
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Premium infrastructure designed for creators, businesses, and SMM resellers.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                👥
              </div>
              <h3 className="mt-4 text-lg font-black text-white">Real & High-Quality Followers</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Authentic-looking profiles with posts, profile pictures, and organic delivery speeds to keep your account 100% safe.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                ❤️
              </div>
              <h3 className="mt-4 text-lg font-black text-white">Instant Post & Reel Likes</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Trigger the Instagram Explore algorithm with instant high-speed likes delivered within 0 to 15 minutes of ordering.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                🎥
              </div>
              <h3 className="mt-4 text-lg font-black text-white">Viral Reels Views</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Boost your video reach with high-retention Reels views and impression metrics designed to maximize discovery.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                🔄
              </div>
              <h3 className="mt-4 text-lg font-black text-white">30-Day Auto Refill</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Guaranteed services include automatic 30-day drop protection. Refill your metrics with a single click in your dashboard.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                🔒
              </div>
              <h3 className="mt-4 text-lg font-black text-white">Zero Passwords Required</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                We only require your public profile username or post link. Your account credentials remain 100% private and protected.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-xl font-black text-[#baff00]">
                ⚡
              </div>
              <h3 className="mt-4 text-lg font-black text-white">Sub-Second API Forwarding</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Agency and reseller accounts can automate bulk Instagram orders via our fast, high-throughput REST API.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mt-16 sm:mt-24 border-t border-white/10 pt-16">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Frequently Asked Questions About Instagram Services
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Common questions regarding delivery speed, refill guarantees, and account safety.
          </p>

          <div className="mt-8 space-y-4 max-w-4xl">
            
            <div className="rounded-2xl border border-white/10 bg-[#10191b] p-6">
              <h3 className="text-base font-bold text-white">Are VEXARO Instagram followers safe for my account?</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">Yes, 100% safe. We never request your password, and our delivery networks use gradual, organic pacing to comply with Instagram platform limits.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#10191b] p-6">
              <h3 className="text-base font-bold text-white">How quickly do Instagram likes and views start?</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">Most Instagram orders start within 1 to 15 minutes. High-speed views and likes begin updating almost instantaneously.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#10191b] p-6">
              <h3 className="text-base font-bold text-white">Do you offer refills if followers drop?</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">Yes! Our guaranteed Instagram services come with 30-day refill protection. If any drop occurs, trigger a free refill directly from your orders dashboard.</p>
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
