"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { BotShield } from "@/components/bot-shield";

function Mark() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00] text-xl font-black text-[#07100f] shadow-[0_0_28px_rgba(186,255,0,0.18)]">
      V
    </div>
  );
}

function Icon({ name, size = 18 }: { name: "shield" | "bolt" | "support" | "check" | "eye" | "eyeOff" | "whatsapp" | "globe"; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "shield") return <svg {...common}><path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>;
  if (name === "bolt") return <svg {...common}><path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z"/></svg>;
  if (name === "support") return <svg {...common}><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v5H5.5A1.5 1.5 0 0 1 4 17.5V14Z"/><path d="M20 14h-3v5h1.5a1.5 1.5 0 0 0 1.5-1.5V14Z"/><path d="M17 19c-1 1.3-2.6 2-5 2"/></svg>;
  if (name === "whatsapp") return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M8.4 7.8c.4-.4 1-.4 1.4.1l1 1.3c.3.4.3.8 0 1.2l-.5.6c.8 1.5 1.7 2.4 3.2 3.2l.6-.5c.4-.3.8-.3 1.2 0l1.3 1c.5.4.5 1 .1 1.4l-.6.6c-.5.5-1.3.7-2 .4-3.4-1.3-5.9-3.8-7.2-7.2-.3-.7-.1-1.5.4-2l.6-.6Z"/></svg>;
  if (name === "globe") return <svg {...common}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
  if (name === "eye") return <svg {...common}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
  if (name === "eyeOff") return <svg {...common}><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>;
  return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    const turnstileRequired = Boolean(process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY);
    if (turnstileRequired && !botToken) {
      setError("Please complete the human verification security check.");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ email, password, botToken, honeypot }),
      });
      const d = await r.json();
      if (!r.ok || !d.success) {
        setError(d.error || "Incorrect email or password.");
        return;
      }
      window.location.replace("/dashboard");
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="vexo-shell min-h-screen w-full max-w-full overflow-x-hidden bg-[#070d0d] text-white">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col overflow-x-hidden lg:grid lg:min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        {/* Brand side */}
        <section className="relative hidden overflow-hidden border-r border-white/5 px-10 py-10 lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div className="vexo-orb absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-[#baff00]/7 blur-3xl" />
          <div className="vexo-orb vexo-orb-delay absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-[#baff00]/5 blur-3xl" />
          <div className="relative vexo-fade-up">
            <div className="flex items-center gap-3"><Mark /><div><p className="text-xl font-black tracking-tight">VEXARO</p><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">SMM Panel</p></div></div>
            <div className="mt-24 max-w-xl">
              <p className="mb-4 inline-flex rounded-full border border-lime-300/15 bg-lime-300/5 px-3 py-1.5 text-xs font-bold text-[#baff00]">Fast &amp; Automated Social Media Growth</p>
              <h1 className="text-5xl font-black leading-[1.04] tracking-[-0.04em] xl:text-6xl">Grow smarter.<br /><span className="text-[#baff00]">Spend less.</span></h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">Pakistan&apos;s trusted platform to safely accelerate your social media presence. 100% automated delivery, zero passwords required, and verified local payments.</p>
            </div>
          </div>

          <div className="relative grid max-w-2xl grid-cols-3 gap-3 vexo-fade-up vexo-stagger-2">
            {[
              ["bolt", "Instant Delivery", "Starts in 0 - 15 minutes"],
              ["shield", "100% Safe & Secure", "Zero passwords needed"],
              ["support", "Human WhatsApp Support", "+92 317 6437013"],
            ].map(([icon, title, text]) => (
              <div key={title} className="vexo-card rounded-2xl border border-white/7 bg-[#0d1517]/80 p-4 backdrop-blur-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#baff00]/10 text-[#baff00]"><Icon name={icon as "shield" | "bolt" | "support"} size={17} /></div>
                <p className="mt-3 text-sm font-black text-white">{title}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Login */}
        <section className="relative flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden px-4 py-8 sm:px-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#baff00]/5 blur-3xl" />
          <div className="relative w-full max-w-[460px] min-w-0 vexo-fade-up">
            <div className="mb-6 lg:hidden"><Mark /></div>
            <div className="vexo-login-card w-full max-w-full rounded-3xl border border-white/10 bg-[#10191b] p-5 shadow-2xl shadow-black/30 sm:p-8">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <span className="rounded-full bg-lime-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#baff00]">
                      Verified SMM Panel
                    </span>
                    <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Welcome back 👋</h2>
                  </div>
                  <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-[#baff00]/10 text-[#baff00] sm:flex"><Icon name="shield" size={20} /></div>
                </div>
                <p className="text-xs leading-5 text-slate-400">Sign in to manage your orders, wallet balance, and social media campaigns.</p>
              </div>

              {/* Anti-Phishing & Panel Account Security Notice */}
              <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0 text-base">🛡️</span>
                <div>
                  <strong className="text-white block">Official VEXARO Account Login</strong>
                  This login is strictly for your <strong>VEXARO Panel Account</strong>. Never enter your Instagram, TikTok, YouTube, Facebook, Google, or banking passwords here. We only deliver services through public links and will never request your personal social media passwords.
                </div>
              </div>

              <form onSubmit={handleSubmit} method="POST" action="/api/auth/login" className="mt-6 space-y-4">
                <div>
                  <label htmlFor="vexaro-login-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    VEXARO Account Email
                  </label>
                  <input
                    id="vexaro-login-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    autoComplete="username"
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#0a1214] px-4 py-3 text-base sm:text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#baff00]/60 focus:ring-2 focus:ring-[#baff00]/10"
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label htmlFor="vexaro-login-password" className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">
                      VEXARO Panel Password
                    </label>
                    <Link href="/forgot-password" className="text-xs font-semibold text-[#baff00] hover:underline text-right">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="vexaro-login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your VEXARO account password"
                      autoComplete="current-password"
                      required
                      className="w-full rounded-xl border border-white/10 bg-[#0a1214] px-4 py-3 pr-11 text-base sm:text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#baff00]/60 focus:ring-2 focus:ring-[#baff00]/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <Icon name={showPassword ? "eyeOff" : "eye"} size={17} />
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-300">
                    <p>{error}</p>
                    <div className="mt-2 flex items-center gap-1.5 border-t border-red-400/15 pt-2 text-[11px] text-slate-300">
                      <span>Forgot your login?</span>
                      <Link href="/forgot-password" className="font-bold text-[#baff00] hover:underline">
                        Reset password here →
                      </Link>
                    </div>
                  </div>
                )}
                <BotShield
                  onVerify={(token, hp) => {
                    setBotToken(token);
                    setHoneypot(hp);
                    if (token && error.includes("verification")) setError("");
                  }}
                />

                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#baff00] px-4 py-3.5 text-sm font-black text-[#07100f] transition hover:bg-[#d2ff5a] disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? "Signing in..." : "Sign In to Account"}<span>→</span>
                </button>
              </form>

              {/* Supported Payments Guarantee */}
              <div className="mt-5 rounded-xl border border-white/5 bg-[#0a1214] p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Official Local Payment Methods</p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-300">
                  <span className="rounded-lg bg-white/5 px-2.5 py-1">SadaPay</span>
                  <span className="rounded-lg bg-white/5 px-2.5 py-1">Easypaisa</span>
                  <span className="rounded-lg bg-white/5 px-2.5 py-1">JazzCash</span>
                  <span className="rounded-lg bg-white/5 px-2.5 py-1">Bank</span>
                </div>
              </div>

              {/* Direct WhatsApp channel and verification links */}
              <div className="mt-4 flex flex-col items-center gap-2 text-center">
                <a
                  href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#25d366]/30 bg-[#25d366]/10 px-3.5 py-1 text-xs font-bold text-[#25d366] hover:bg-[#25d366]/20 transition"
                >
                  <Icon name="whatsapp" size={13} />
                  <span>Join WhatsApp Channel for Alerts &amp; Codes</span>
                  <span className="text-[10px]">↗</span>
                </a>

                <a
                  href="https://wa.me/923176437013"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-wrap items-center justify-center gap-1 text-xs text-slate-400 hover:text-[#25d366] transition"
                >
                  <span className="inline-flex items-center gap-1">
                    <Icon name="support" size={13} /> Questions before joining?
                  </span>
                  <span>WhatsApp Admin: <strong className="text-white font-bold underline">+92 317 6437013</strong></span>
                </a>
              </div>

              <p className="mt-6 text-center text-sm text-slate-400">
                New to VEXARO? <Link href="/signup" className="font-black text-[#baff00] hover:underline">Create an account</Link>
              </p>
            </div>

            <p className="mt-4 text-center text-[11px] text-slate-500">
              🔒 256-bit SSL encrypted • Safe automated delivery • 100% money-back wallet protection
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
