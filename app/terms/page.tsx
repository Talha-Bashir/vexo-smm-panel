import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | VEXARO SMM Panel",
  description: "Terms of service, platform usage rules, order fulfillment policies, and user responsibilities for VEXARO SMM.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#07100f] text-slate-200 selection:bg-[#baff00] selection:text-black">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07100f]/90 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#baff00] text-sm font-black text-[#07100f] shadow-[0_0_15px_rgba(186,255,0,0.35)]">
              V
            </div>
            <span className="text-lg font-black tracking-tight text-white">VEXARO SMM</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition"
            >
              ← Back to Home
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-[#baff00] px-4 py-2 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] transition"
            >
              Create Account
            </Link>
          </div>
        </div>
      </header>

      {/* Content Container */}
      <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <div className="space-y-3 border-b border-white/10 pb-8">
          <span className="inline-block rounded-full border border-[#baff00]/30 bg-[#baff00]/10 px-3 py-1 text-xs font-bold text-[#baff00]">
            Legal Agreement
          </span>
          <h1 className="text-3xl font-black text-white sm:text-4xl tracking-tight">
            Terms of Service &amp; User Agreement
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Last updated: September 16, 2026. By accessing VEXARO SMM services, you agree to these terms.
          </p>
        </div>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-300">
          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">1. General Platform Terms</h2>
            <p>
              By signing up, adding funds, or placing orders on VEXARO SMM (&quot;the Platform&quot;), you acknowledge and agree that you are bound by these terms. We reserve the right to alter, modify, or amend these terms at any time without prior individual notice. You are encouraged to review this page periodically.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">2. SMM Services &amp; Delivery</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Purpose:</strong> VEXARO SMM services are promotional utilities designed to boost visibility, social metrics, and brand appearance across supported digital networks.
              </li>
              <li>
                <strong>Target Links:</strong> You must supply a valid, publicly accessible profile URL, video link, or username. Orders placed with private accounts, invalid URLs, or changed usernames after submission cannot be canceled or refunded once dispatched.
              </li>
              <li>
                <strong>Delivery Speeds:</strong> Speed and start estimates stated on services are indicative averages. Platform updates, network load, and API throttling may affect delivery speed.
              </li>
              <li>
                <strong>Refill Policy:</strong> Services tagged with &quot;Refill&quot; or &quot;Guaranteed&quot; include a specified warranty window. In the event of metric drop during the warranty period, submit a Refill request via your Orders page or support ticket.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">3. Wallet, Payments &amp; Deposits</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Deposit Verification:</strong> Deposits made via SadaPay, Easypaisa, JazzCash, or bank transfer are verified manually by administrators against real transaction receipts.
              </li>
              <li>
                <strong>Transaction IDs (TID):</strong> Users must provide truthful, authentic transaction IDs and valid receipt screenshots. Submitting fraudulent, reused, or manipulated payment receipts will result in immediate permanent account termination and forfeiture of balances.
              </li>
              <li>
                <strong>Non-Refundable Deposits:</strong> Once deposited into your platform wallet, funds are non-refundable to fiat accounts and must be used for platform services, orders, and digital tools.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">4. Subscriptions &amp; Digital Tools</h2>
            <p>
              Digital tool access (activation links, promotional coupons, or accounts) dispatched through our automated store is delivered immediately upon wallet confirmation. Users agree not to alter recovery credentials or violate third-party service provider rules.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">5. Account Security &amp; Fair Use</h2>
            <p>
              Users are responsible for safeguarding their login credentials and API keys. Any unauthorized attempts to scrape the platform, exploit pricing bugs, abuse referral commissions, or conduct denial-of-service attacks will result in immediate account suspension.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">6. Contact &amp; Support</h2>
            <p>
              For inquiries, disputes, or order assistance, our dedicated staff is available 24/7 via:
            </p>
            <div className="rounded-xl border border-white/10 bg-[#0d1618] p-4 text-xs space-y-1 font-mono">
              <p>WhatsApp: <span className="text-[#25d366]">+92 317 6437013</span></p>
              <p>Telegram: <span className="text-[#229ed9]">@VexaroSMMAdmin</span></p>
              <p>Support Portal: In-app ticket system at /dashboard</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
