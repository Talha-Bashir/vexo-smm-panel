import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | VEXARO SMM Panel",
  description: "Learn how VEXARO SMM collects, uses, protects, and safeguards user data and payment information.",
};

export default function PrivacyPage() {
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
          <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
            Privacy &amp; Security
          </span>
          <h1 className="text-3xl font-black text-white sm:text-4xl tracking-tight">
            Privacy Policy &amp; Data Safeguards
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Effective Date: September 16, 2026. Your privacy and confidentiality are strictly protected.
          </p>
        </div>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-300">
          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">1. Information We Collect</h2>
            <p>
              We only collect essential data required to provide and fulfill our services:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Account Credentials:</strong> Name and email address during registration. Passwords are encrypted using cryptographic salt and scrypt algorithms (we never store plain-text passwords).</li>
              <li><strong>Order Information:</strong> Target social media link, post URL, or channel identifier and the selected quantity.</li>
              <li><strong>Deposit Proofs:</strong> Payment method, submitted transaction ID (TID), and receipt screenshots (which are audited and cleaned).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">2. How Information Is Used</h2>
            <p>
              Data collected is strictly used to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Process, dispatch, and track social media promotion orders via automated provider APIs.</li>
              <li>Verify customer wallet deposits and credit account balances.</li>
              <li>Provide customer support, dispute resolution, and refill guarantees.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">3. Third-Party Sharing &amp; Confidentiality</h2>
            <p>
              We respect your privacy. We <strong>never sell, lease, or monetize</strong> your personal details or customer contact information to marketers or advertisers. Target profile links are transmitted securely only to upstream API routing clusters solely for fulfillment.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">4. Cookies &amp; Sessions</h2>
            <p>
              We use secure, HTTP-only authentication session cookies (`vexo_session`) with `SameSite=Lax` protection to keep you securely logged into your account. We do not use intrusive third-party cross-site tracking cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">5. Security Infrastructure</h2>
            <p>
              Our infrastructure employs end-to-end TLS/SSL encryption, timing-safe cryptographic comparisons, SQL parameterization, and isolated connection pooling to defend against unauthorized access, SQL injections, and data tampering.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">6. Inquiries</h2>
            <p>
              If you have any questions regarding your data or wish to delete your account, reach out to our team at{" "}
              <a href="https://t.me/VexaroSMMAdmin" target="_blank" rel="noreferrer" className="text-[#229ed9] hover:underline">
                @VexaroSMMAdmin
              </a>{" "}
              or via WhatsApp at{" "}
              <a href="https://wa.me/923176437013" target="_blank" rel="noreferrer" className="text-[#25d366] hover:underline">
                +92 317 6437013
              </a>.
              For service announcements and platform notices, you can also follow our official WhatsApp Channel at{" "}
              <a href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q" target="_blank" rel="noreferrer" className="text-[#25d366] hover:underline font-bold">
                WhatsApp Channel (VEXARO SMM)
              </a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
