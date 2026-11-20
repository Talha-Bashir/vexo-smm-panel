"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { RealCaptcha, CaptchaData } from "@/components/real-captcha";
import { Social3DIcon } from "@/components/social-3d-icon";

function Mark() {
  return (
    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden shadow-[0_0_28px_rgba(186,255,0,0.35)] border border-[#baff00]/40">
      <img src="/logo.png" alt="VEXARO SMM Member Login" className="h-full w-full object-cover" />
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
  const [captchaData, setCaptchaData] = useState<CaptchaData>({
    captchaResponse: "",
    captchaToken: "",
    turnstileToken: "",
    honeypot: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (!captchaData.captchaResponse && !captchaData.turnstileToken) {
      setError("Please complete the security verification challenge below.");
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
        body: JSON.stringify({
          email: email.trim(),
          password,
          captchaResponse: captchaData.captchaResponse,
          captchaToken: captchaData.captchaToken,
          turnstileToken: captchaData.turnstileToken,
          honeypot: captchaData.honeypot,
        }),
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
    <main className="vexo-shell min-h-screen w-full max-w-full overflow-x-hidden bg-[#070b12] text-white selection:bg-[#baff00] selection:text-black">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col overflow-x-hidden lg:grid lg:min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        {/* Brand visual showcase side */}
        <section className="relative hidden overflow-hidden border-r border-slate-800/80 px-10 py-10 lg:flex lg:flex-col lg:justify-between xl:px-16 bg-gradient-to-br from-[#070b12] via-[#09110d] to-[#0a1410]">
          {/* Ambient lime & emerald glow orbs */}
          <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-[#baff00]/10 blur-[130px]" />
          <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-emerald-500/10 blur-[120px]" />

          {/* Floating decorative 3D platform badges */}
          <div className="pointer-events-none absolute right-12 top-20 opacity-80 animate-bounce duration-[4000ms]">
            <Social3DIcon platform="instagram" size={38} glow />
          </div>
          <div className="pointer-events-none absolute right-24 top-48 opacity-80 animate-bounce duration-[5000ms]">
            <Social3DIcon platform="tiktok" size={32} glow />
          </div>
          <div className="pointer-events-none absolute right-10 top-72 opacity-80 animate-bounce duration-[4500ms]">
            <Social3DIcon platform="youtube" size={34} glow />
          </div>

          <div className="relative z-10 vexo-fade-up">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <Mark />
              <div>
                <p className="text-xl font-black tracking-tight text-white group-hover:text-[#baff00] transition">VEXARO</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#baff00]">SMM Panel</p>
              </div>
            </Link>

            <div className="mt-14 max-w-xl">
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#baff00]/30 bg-[#baff00]/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#baff00]">
                <span className="h-2 w-2 rounded-full bg-[#baff00] animate-pulse" />
                #1 Direct Wholesale Provider
              </span>
              <h1 className="text-5xl font-black leading-[1.06] tracking-[-0.04em] xl:text-6xl text-white">
                Grow Faster.<br />
                <span className="bg-gradient-to-r from-[#baff00] via-lime-300 to-emerald-400 bg-clip-text text-transparent">
                  Pay Wholesale.
                </span>
              </h1>
              <p className="mt-4 max-w-lg text-sm sm:text-base leading-relaxed text-slate-300 font-normal">
                Direct automated infrastructure for creators &amp; agencies. Instant 0–15 minute starts, zero passwords required, and verified local Pakistani payment gateways.
              </p>
            </div>

            {/* Live Order Surge Telemetry Card */}
            <div className="mt-8 max-w-lg rounded-2xl border border-[#baff00]/25 bg-[#0e1614]/90 p-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase">Direct Node #4 Active (38ms)</span>
                </div>
                <span className="rounded-full bg-[#baff00]/15 border border-[#baff00]/30 px-2 py-0.5 text-[10px] font-black text-[#baff00]">
                  LIVE DISPATCH
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Social3DIcon platform="tiktok" size={20} />
                  <div>
                    <p className="font-extrabold text-white">@tok.viral • High Retention Reel Boost</p>
                    <p className="text-[11px] text-[#baff00] font-mono font-bold">+25,000 Views in progress</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-black text-white bg-slate-800 px-2 py-1 rounded-lg">₨120 ($0.42)</span>
              </div>
            </div>

            {/* Real Creator Social Proof Stack */}
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2.5 overflow-hidden">
                <img src="/creators/creator-1.jpg" alt="Creator 1" className="inline-block h-10 w-10 rounded-full ring-2 ring-[#070b12] object-cover" />
                <img src="/creators/creator-2.jpg" alt="Creator 2" className="inline-block h-10 w-10 rounded-full ring-2 ring-[#070b12] object-cover" />
                <img src="/creators/creator-3.jpg" alt="Creator 3" className="inline-block h-10 w-10 rounded-full ring-2 ring-[#070b12] object-cover" />
                <img src="/creators/creator-4.jpg" alt="Creator 4" className="inline-block h-10 w-10 rounded-full ring-2 ring-[#070b12] object-cover" />
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#baff00] text-[10px] font-black text-black ring-2 ring-[#070b12] shadow-md">
                  +48k
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-black">
                  <span>★★★★★</span>
                  <span className="text-white font-extrabold">4.9/5</span>
                  <span className="text-[#baff00] text-[10px] bg-[#baff00]/15 border border-[#baff00]/30 px-1.5 py-0.5 rounded font-mono font-bold">VERIFIED</span>
                </div>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                  Trusted by 48,000+ creators &amp; resellers across Pakistan
                </p>
              </div>
            </div>
          </div>

          {/* 3 High-Impact Feature Cards */}
          <div className="relative z-10 grid max-w-2xl grid-cols-3 gap-3 vexo-fade-up pt-8">
            {[
              ["bolt", "Instant Start", "0–15 min automated queue"],
              ["shield", "Zero Passwords", "100% public link delivery"],
              ["support", "WhatsApp Support", "24/7 human desk active"],
            ].map(([icon, title, text]) => (
              <div key={title} className="rounded-2xl border border-slate-800 bg-[#0e1614]/80 p-3.5 backdrop-blur-sm hover:border-[#baff00]/40 transition">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#baff00]/15 text-[#baff00]">
                  <Icon name={icon as "shield" | "bolt" | "support"} size={16} />
                </div>
                <p className="mt-2.5 text-xs font-black text-white">{title}</p>
                <p className="mt-0.5 text-[10px] leading-3.5 text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Login Form Container */}
        <section className="relative flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden px-4 py-8 sm:px-8 bg-[#070b12]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#baff00]/10 blur-[130px]" />
          <div className="pointer-events-none absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-[130px]" />

          <div className="relative w-full max-w-[460px] min-w-0 vexo-fade-up z-10">
            <div className="mb-6 lg:hidden flex justify-center">
              <Link href="/">
                <Mark />
              </Link>
            </div>

            <div className="w-full max-w-full rounded-3xl border border-slate-700/80 bg-[#111827]/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <span className="rounded-full bg-[#baff00]/15 border border-[#baff00]/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#baff00]">
                      Verified SMM Panel
                    </span>
                    <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">Welcome back 👋</h2>
                  </div>
                  <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-[#baff00]/15 border border-[#baff00]/30 text-[#baff00] sm:flex shadow-inner">
                    <Icon name="shield" size={20} />
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-slate-400">Sign in to manage your orders, wallet balance, and direct wholesale campaigns.</p>
              </div>

              {/* Anti-Phishing & Panel Account Security Notice */}
              <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0 text-base">🛡️</span>
                <div className="text-[11px] leading-relaxed">
                  <strong className="text-white block font-bold">Official VEXARO Account Login</strong>
                  Never enter social media passwords here. We only require public post links for delivery.
                </div>
              </div>

              <form onSubmit={handleSubmit} method="POST" action="/api/auth/login" className="mt-6 space-y-4">
                <div>
                  <label htmlFor="vexaro-login-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
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
                    className="w-full rounded-xl border border-slate-800 bg-[#0c121e] px-4 py-3 text-base sm:text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#baff00] focus:ring-2 focus:ring-[#baff00]/25"
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label htmlFor="vexaro-login-password" className="text-xs font-bold uppercase tracking-wider text-slate-300 shrink-0">
                      VEXARO Panel Password
                    </label>
                    <Link href="/forgot-password" className="text-xs font-bold text-[#baff00] hover:underline text-right">
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
                      placeholder="Enter your VEXARO password"
                      autoComplete="current-password"
                      required
                      className="w-full rounded-xl border border-slate-800 bg-[#0c121e] px-4 py-3 pr-11 text-base sm:text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#baff00] focus:ring-2 focus:ring-[#baff00]/25"
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

                <RealCaptcha
                  onVerify={(data) => {
                    setCaptchaData(data);
                    if (error && error.includes("verification")) setError("");
                  }}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#baff00] via-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 px-4 py-3.5 text-sm font-black text-black transition-all transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 shadow-[0_0_25px_rgba(186,255,0,0.35)] hover:shadow-[0_0_35px_rgba(186,255,0,0.5)] cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Account</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </form>

              {/* Supported Payments Guarantee */}
              <div className="mt-5 rounded-xl border border-slate-800 bg-[#0c121e] p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Official Local &amp; Crypto Payments</p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-bold text-slate-300">
                  <span className="rounded-lg border border-slate-800 bg-slate-850 px-2.5 py-1 text-emerald-400">Easypaisa</span>
                  <span className="rounded-lg border border-slate-800 bg-slate-850 px-2.5 py-1 text-red-400">JazzCash</span>
                  <span className="rounded-lg border border-slate-800 bg-slate-850 px-2.5 py-1 text-teal-400">SadaPay</span>
                  <span className="rounded-lg border border-slate-800 bg-slate-850 px-2.5 py-1 text-[#baff00]">Binance Pay</span>
                </div>
              </div>

              {/* Direct WhatsApp channel and verification links */}
              <div className="mt-4 flex flex-col items-center gap-2 text-center">
                <a
                  href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition"
                >
                  <Icon name="whatsapp" size={13} />
                  <span>Join WhatsApp Channel for Alerts &amp; Codes</span>
                  <span className="text-[10px]">↗</span>
                </a>

                <a
                  href="https://wa.me/923088180234"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-wrap items-center justify-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition"
                >
                  <span className="inline-flex items-center gap-1">
                    <Icon name="support" size={13} /> Questions?
                  </span>
                  <span>WhatsApp Admin: <strong className="text-white font-bold underline">+92 308 8180234</strong></span>
                </a>
              </div>

              <p className="mt-6 text-center text-sm text-slate-400">
                New to VEXARO?{" "}
                <Link href="/signup" className="font-black text-[#baff00] hover:underline">
                  Create an account →
                </Link>
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
