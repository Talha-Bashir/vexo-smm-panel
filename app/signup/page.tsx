"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { BotShield } from "@/components/bot-shield";

function Icon({ name, size = 18 }: { name: "eye" | "eyeOff" | "support" | "shield" | "whatsapp" | "globe"; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (name === "eye") return <svg {...common}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
  if (name === "eyeOff") return <svg {...common}><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>;
  if (name === "support") return <svg {...common}><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v5H5.5A1.5 1.5 0 0 1 4 17.5V14Z"/><path d="M20 14h-3v5h1.5a1.5 1.5 0 0 0 1.5-1.5V14Z"/><path d="M17 19c-1 1.3-2.6 2-5 2"/></svg>;
  if (name === "whatsapp") return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M8.4 7.8c.4-.4 1-.4 1.4.1l1 1.3c.3.4.3.8 0 1.2l-.5.6c.8 1.5 1.7 2.4 3.2 3.2l.6-.5c.4-.3.8-.3 1.2 0l1.3 1c.5.4.5 1 .1 1.4l-.6.6c-.5.5-1.3.7-2 .4-3.4-1.3-5.9-3.8-7.2-7.2-.3-.7-.1-1.5.4-2l.6-.6Z"/></svg>;
  if (name === "globe") return <svg {...common}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
  return <svg {...common}><path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>;
}

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [hasReferralParam, setHasReferralParam] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState("");
  const [isExistingAccount, setIsExistingAccount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState("");

  useEffect(() => {
    try {
      const str = [
        typeof window !== "undefined" ? `${window.screen?.width}x${window.screen?.height}` : "",
        typeof window !== "undefined" ? window.screen?.colorDepth : "",
        typeof navigator !== "undefined" ? (navigator.hardwareConcurrency || 2) : "",
        typeof navigator !== "undefined" ? (navigator.language || "") : "",
        Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      ].join("|");

      if (typeof window !== "undefined" && window.crypto?.subtle) {
        const encoder = new TextEncoder();
        window.crypto.subtle.digest("SHA-256", encoder.encode(str)).then((buf) => {
          const hash = Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          setDeviceFingerprint(hash);
        }).catch(() => {
          let h = 0;
          for (let i = 0; i < str.length; i++) {
            h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
          }
          setDeviceFingerprint("fp_" + Math.abs(h).toString(16));
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) {
        setReferralCode(ref.trim().toUpperCase());
        setHasReferralParam(true);
      }
    } catch {
      // ignore
    }
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsExistingAccount(false);

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const turnstileRequired = Boolean(process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY);
    if (turnstileRequired && !botToken) {
      setError("Please complete the human verification security check.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          referralCode: referralCode.trim(),
          botToken,
          honeypot,
          deviceFingerprint,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 409 || (data.error && data.error.includes("already exists"))) {
          setIsExistingAccount(true);
        }
        setError(data.error || "Unable to create account.");
        return;
      }

      // Store bonus celebration payload for dashboard welcome notification
      if (data.bonus) {
        try {
          sessionStorage.setItem("vexo_new_user_bonus", JSON.stringify(data.bonus));
        } catch {}
      }

      // Hard redirect to load session cookie natively into middleware & root dashboard
      window.location.replace("/dashboard");
    } catch {
      setError("Unable to create account. Please try again or reach out on WhatsApp.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#070d0d] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md min-w-0 items-center justify-center">
        <div className="w-full max-w-full rounded-3xl bg-[#111a1d] p-5 shadow-2xl border border-white/10 sm:p-8">
          <div className="text-center">
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden shadow-[0_0_28px_rgba(186,255,0,0.35)] border border-[#baff00]/30">
              <img src="/logo.png" alt="VEXARO SMM Free Registration" className="h-full w-full object-cover" />
            </div>
            <h1 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
              Create your account
            </h1>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Join VEXARO SMM Panel and start growing your social media instantly.
            </p>
          </div>

          {/* Welcome Promotional Bonus Notice */}
          <div className="mt-4 rounded-xl border border-[#baff00]/30 bg-[#baff00]/10 p-3 text-xs text-[#baff00] flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0 text-base">🎁</span>
            <div>
              <strong className="text-white block font-black">Rs. 50 Welcome Bonus Credit</strong>
              Genuine new accounts receive ₨50 promotional credit instantly on signup to test our services!
            </div>
          </div>

          {hasReferralParam && (
            <div className="mt-3 rounded-xl border border-[#baff00]/30 bg-[#baff00]/10 p-3 text-center text-xs text-[#baff00]">
              🎁 You were invited with referral code: <span className="font-bold">{referralCode}</span>
            </div>
          )}

          {/* Security Notice */}
          <div className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0 text-base">🛡️</span>
            <div>
              <strong className="text-white block">VEXARO Account Security</strong>
              Create a unique password exclusively for your VEXARO Panel. Do NOT reuse passwords from your Google, Instagram, TikTok, or email accounts.
            </div>
          </div>

          <form onSubmit={handleSubmit} method="POST" action="/api/auth/signup" className="mt-6 space-y-4">
            <div>
              <label htmlFor="vexaro-signup-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Full Name</label>
              <input
                id="vexaro-signup-name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Talha Khan"
                autoComplete="name"
                required
                className="w-full rounded-xl border border-white/10 bg-[#0b1316] px-4 py-3 text-base sm:text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#baff00]/60 focus:ring-2 focus:ring-[#baff00]/10"
              />
            </div>

            <div>
              <label htmlFor="vexaro-signup-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">VEXARO Account Email</label>
              <input
                id="vexaro-signup-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-white/10 bg-[#0b1316] px-4 py-3 text-base sm:text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#baff00]/60 focus:ring-2 focus:ring-[#baff00]/10"
              />
            </div>

            <div>
              <label htmlFor="vexaro-signup-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Create VEXARO Panel Password</label>
              <div className="relative">
                <input
                  id="vexaro-signup-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#0b1316] px-4 py-3 pr-11 text-base sm:text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#baff00]/60 focus:ring-2 focus:ring-[#baff00]/10"
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

            <div>
              <label htmlFor="vexaro-signup-confirm-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Confirm VEXARO Panel Password
              </label>
              <div className="relative">
                <input
                  id="vexaro-signup-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#0b1316] px-4 py-3 pr-11 text-base sm:text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#baff00]/60 focus:ring-2 focus:ring-[#baff00]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  <Icon name={showConfirmPassword ? "eyeOff" : "eye"} size={17} />
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Referral Code <span className="text-[11px] font-normal lowercase tracking-normal text-slate-500">(optional)</span>
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="e.g. VX9F2A1B"
                className="w-full rounded-xl border border-white/10 bg-[#0b1316] px-4 py-3 text-base sm:text-sm uppercase text-white outline-none transition placeholder:text-slate-600 focus:border-[#baff00]/60 focus:ring-2 focus:ring-[#baff00]/10"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-300">
                <p>{error}</p>
                {isExistingAccount && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-red-400/15 pt-2 text-[11px]">
                    <Link
                      href="/login"
                      className="rounded-lg bg-[#baff00] px-2.5 py-1 font-bold text-[#07100f] hover:bg-[#d2ff5a]"
                    >
                      Sign In Now →
                    </Link>
                    <Link
                      href="/forgot-password"
                      className="font-semibold text-slate-300 underline hover:text-[#baff00]"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                )}
              </div>
            )}

            <BotShield
              onVerify={(token, hp) => {
                setBotToken(token);
                setHoneypot(hp);
                if (token && error.includes("verification")) setError("");
              }}
            />

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#baff00] px-4 py-3.5 text-sm font-black text-[#07100f] transition hover:bg-[#d2ff5a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create Account"}
              <span>→</span>
            </button>
          </form>

          {/* Direct WhatsApp channel and support links */}
          <div className="mt-5 flex flex-col items-center gap-2 text-center">
            <a
              href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#25d366]/30 bg-[#25d366]/10 px-3.5 py-1 text-xs font-bold text-[#25d366] hover:bg-[#25d366]/20 transition"
            >
              <Icon name="whatsapp" size={13} />
              <span>Join WhatsApp Channel for Updates &amp; Discounts</span>
              <span className="text-[10px]">↗</span>
            </a>

            <a
              href="https://wa.me/923176437013"
              target="_blank"
              rel="noreferrer"
              className="inline-flex flex-wrap items-center justify-center gap-1 text-xs text-slate-400 hover:text-[#25d366] transition"
            >
              <span className="inline-flex items-center gap-1">
                <Icon name="support" size={13} /> Questions or issues?
              </span>
              <span>WhatsApp Admin: <strong className="text-white font-bold underline">+92 317 6437013</strong></span>
            </a>
          </div>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-[#baff00] hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
