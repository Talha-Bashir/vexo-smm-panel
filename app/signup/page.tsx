"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { RealCaptcha, CaptchaData } from "@/components/real-captcha";

function Icon({ name, size = 18 }: { name: "eye" | "eyeOff" | "support" | "shield" | "whatsapp" | "globe" | "mail" | "check"; size?: number }) {
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
  if (name === "mail") return <svg {...common}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
  if (name === "check") return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>;
  return <svg {...common}><path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>;
}

export default function SignupPage() {
  const [step, setStep] = useState<"form" | "verify">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [hasReferralParam, setHasReferralParam] = useState(false);
  const [couponCode, setCouponCode] = useState("");

  // Captcha & Security state
  const [captchaData, setCaptchaData] = useState<CaptchaData>({
    captchaResponse: "",
    captchaToken: "",
    turnstileToken: "",
    honeypot: "",
  });

  // Verification Step state
  const [verificationCode, setVerificationCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [isExistingAccount, setIsExistingAccount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState("");

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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
      const promo = params.get("coupon") || params.get("promo") || params.get("code");
      if (promo) {
        setCouponCode(promo.trim().toUpperCase());
      }
    } catch {}
  }, []);

  // Step 1: Request Email Verification Code
  async function handleSendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsExistingAccount(false);

    if (!name.trim() || !email.trim() || !password || !confirmPassword || !whatsapp.trim()) {
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
    const cleanWhatsapp = whatsapp.replace(/[\s-]/g, "").trim();
    if (!/^\+?[0-9]{7,15}$/.test(cleanWhatsapp)) {
      setError("Enter a valid WhatsApp number.");
      return;
    }

    if (!captchaData.captchaResponse && !captchaData.turnstileToken) {
      setError("Please complete the security verification challenge below.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup/send-code", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          whatsapp: whatsapp.replace(/[\s-]/g, "").trim(),
          password,
          confirmPassword,
          referralCode: referralCode.trim(),
          couponCode: couponCode.trim().toUpperCase(),
          captchaResponse: captchaData.captchaResponse,
          captchaToken: captchaData.captchaToken,
          turnstileToken: captchaData.turnstileToken,
          honeypot: captchaData.honeypot,
          deviceFingerprint,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 409 || (data.error && data.error.includes("already exists"))) {
          setIsExistingAccount(true);
        }
        setError(data.error || "Unable to send verification code.");
        return;
      }

      // Transition to code verification screen
      if (data.simulatedCode) {
        setSimulatedCode(data.simulatedCode);
      }
      setResendCooldown(45);
      setStep("verify");
    } catch {
      setError("Network error sending verification code. Please check your connection or contact WhatsApp.");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify Submitted 6-Digit Code
  async function handleVerifyCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const cleanCode = verificationCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup/verify-code", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          email: email.trim(),
          code: cleanCode,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Verification failed. Please double-check your code.");
        return;
      }

      // Hard redirect to load session cookie natively into middleware & root dashboard
      window.location.replace(data.redirect || "/dashboard");
    } catch {
      setError("Unable to verify code. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  }

  // Resend Verification Code
  async function handleResendCode() {
    if (resendCooldown > 0 || loading) return;
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup/send-code", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          whatsapp: whatsapp.replace(/[\s-]/g, "").trim(),
          password,
          confirmPassword,
          referralCode: referralCode.trim(),
          couponCode: couponCode.trim().toUpperCase(),
          captchaResponse: captchaData.captchaResponse,
          captchaToken: captchaData.captchaToken,
          turnstileToken: captchaData.turnstileToken,
          honeypot: captchaData.honeypot,
          deviceFingerprint,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || "Failed to resend code.");
        return;
      }

      setResendCooldown(45);
      if (data.simulatedCode) setSimulatedCode(data.simulatedCode);
    } catch {
      setError("Unable to resend code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#0b0f19] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md min-w-0 items-center justify-center">
        <div className="w-full max-w-full rounded-3xl bg-[#111827] p-5 shadow-2xl border border-slate-800 sm:p-8">
          <div className="text-center">
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden shadow-[0_0_28px_rgba(99,102,241,0.25)] border border-indigo-500/30">
              <img src="/logo.png" alt="VEXARO SMM Registration" className="h-full w-full object-cover" />
            </div>
            <h1 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
              {step === "verify" ? "Verify your email" : "Create your account"}
            </h1>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {step === "verify"
                ? `Enter the 6-digit verification code sent to ${email}`
                : "Join VEXARO SMM Panel and start growing your social media instantly."}
            </p>
          </div>

          {step === "verify" ? (
            /* ================= STEP 2: EMAIL CODE VERIFICATION ================= */
            <div className="mt-6 space-y-5">
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 mb-2.5">
                  <Icon name="mail" size={24} />
                </div>
                <p className="text-xs font-bold text-white">We sent a verification code to:</p>
                <p className="font-mono text-sm font-black text-indigo-400 mt-0.5">{email}</p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Please check your inbox (and Spam/Junk folder). The code is valid for 15 minutes.
                </p>
              </div>

              {simulatedCode && (
                <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-amber-950/30 p-4 text-xs text-amber-200 shadow-lg space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-300 font-bold">
                    <span className="text-base">⚠️</span>
                    <span>Resend Testing Sandbox Active</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    Resend default test sender (<code className="bg-black/30 px-1 py-0.5 rounded text-amber-300">onboarding@resend.dev</code>) only delivers live emails to your account owner email (<strong className="text-white">talhabashir012@gmail.com</strong>).
                  </p>
                  <p className="text-[11px] text-amber-200/90">
                    To deliver live emails to any customer, verify your domain at <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="underline text-white font-bold hover:text-indigo-400">resend.com/domains</a>.
                  </p>
                  <div className="flex items-center justify-between border-t border-amber-400/20 pt-2.5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-400 block">Your Verification Code:</span>
                      <span className="font-mono text-xl font-black text-indigo-400 tracking-widest">{simulatedCode}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVerificationCode(simulatedCode)}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition cursor-pointer"
                    >
                      Fill Code ↵
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label htmlFor="vexaro-email-code" className="mb-1.5 block text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                    6-Digit Security Code
                  </label>
                  <input
                    id="vexaro-email-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="• • • • • •"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    className="w-full rounded-2xl border-2 border-indigo-500/50 bg-[#0d131f] px-4 py-3.5 text-center font-mono text-3xl font-extrabold tracking-[0.5em] text-indigo-400 placeholder:tracking-widest placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition shadow-[0_0_25px_rgba(99,102,241,0.1)]"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-300 text-center">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-3.5 text-sm font-bold text-white transition hover:from-indigo-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-indigo-500/25"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                      Verifying code...
                    </span>
                  ) : (
                    <>
                      <span>Verify &amp; Create Account</span>
                      <span>✓</span>
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-400">
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="hover:text-white transition underline"
                >
                  ← Edit registration info
                </button>

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || loading}
                  className={`font-semibold transition ${
                    resendCooldown > 0 ? "text-slate-500 cursor-not-allowed" : "text-indigo-400 hover:underline"
                  }`}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </button>
              </div>
            </div>
          ) : (
            /* ================= STEP 1: REGISTRATION DETAILS & CAPTCHA ================= */
            <>
              {/* Free Test Trial Feature Notice */}
              <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-300 flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0 text-base">✨</span>
                <div>
                  <strong className="text-white block font-bold">1-Time Free Test Trial Available</strong>
                  Test our speed after sign up: Up to 1,000 Views or 50 Likes for TikTok &amp; Instagram!
                </div>
              </div>

              {hasReferralParam && (
                <div className="mt-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-center text-xs text-indigo-300">
                  🎁 You were invited with referral code: <span className="font-bold text-white">{referralCode}</span>
                </div>
              )}

              {/* Bot Protection / Security Notice */}
              <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0 text-base">🛡️</span>
                <div>
                  <strong className="text-white block">Email Verification Protected</strong>
                  A secure 6-digit verification code will be sent to your email to verify authenticity and protect against fake bots.
                </div>
              </div>

              <form onSubmit={handleSendCode} method="POST" action="/api/auth/signup/send-code" className="mt-6 space-y-4">
                <div>
                  <label htmlFor="vexaro-signup-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Full Name
                  </label>
                  <input
                    id="vexaro-signup-name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Talha Khan"
                    autoComplete="name"
                    required
                    className="w-full rounded-xl border border-slate-800 bg-[#0d131f] px-4 py-3 text-base sm:text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label htmlFor="vexaro-signup-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Your Real Email Address (Code Sent Here)
                  </label>
                  <input
                    id="vexaro-signup-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border border-slate-800 bg-[#0d131f] px-4 py-3 text-base sm:text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
                    <span className="text-emerald-400 font-semibold">✓ Verified only:</span> Gmail, Yahoo, Outlook, Hotmail, iCloud. (Temp-mail blocked)
                  </p>
                </div>
                <div>
                  <label htmlFor="vexaro-signup-whatsapp" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    WhatsApp Number
                    </label>
                    <input
                    id="vexaro-signup-whatsapp"
                  name="whatsapp"
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="e.g. 03001234567"
                  autoComplete="tel"
                  required
                  className="w-full rounded-xl border border-slate-800 bg-[#0d131f] px-4 py-3 text-base sm:text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                                </div>

                <div>
                  <label htmlFor="vexaro-signup-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Create Password
                  </label>
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
                      className="w-full rounded-xl border border-slate-800 bg-[#0d131f] px-4 py-3 pr-11 text-base sm:text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
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
                    Confirm Password
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
                      className="w-full rounded-xl border border-slate-800 bg-[#0d131f] px-4 py-3 pr-11 text-base sm:text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
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
                  <label className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span>Promo Coupon Code</span>
                    <span className="text-[11px] font-semibold lowercase tracking-normal text-indigo-400">
                      optional
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Optional coupon"
                      className="w-full rounded-xl border border-slate-800 bg-[#0d131f] px-4 py-3 pr-24 font-mono text-base font-bold tracking-wider uppercase text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 sm:text-sm"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
                      🎟️ COUPON
                    </span>
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
                    className="w-full rounded-xl border border-slate-800 bg-[#0d131f] px-4 py-3 text-base sm:text-sm uppercase text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Real CAPTCHA (Visual Security Code / Cloudflare Turnstile) */}
                <RealCaptcha
                  onVerify={(data) => {
                    setCaptchaData(data);
                    if (error && error.includes("verification")) setError("");
                  }}
                />

                {error && (
                  <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-300">
                    <p>{error}</p>
                    {isExistingAccount && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-red-400/15 pt-2 text-[11px]">
                        <Link
                          href="/login"
                          className="rounded-lg bg-indigo-600 px-2.5 py-1 font-bold text-white hover:bg-indigo-500"
                        >
                          Sign In Now →
                        </Link>
                        <Link
                          href="/forgot-password"
                          className="font-semibold text-slate-300 underline hover:text-indigo-400"
                        >
                          Forgot Password?
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-3.5 text-sm font-bold text-white transition hover:from-indigo-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-indigo-500/25 cursor-pointer"
                >
                  {loading ? "Sending verification code..." : "Send Verification Code"}
                  <span>→</span>
                </button>
              </form>
            </>
          )}

          {/* Support links */}
          <div className="mt-6 flex flex-col items-center gap-2 text-center border-t border-slate-800 pt-5">
            <a
              href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition"
            >
              <Icon name="whatsapp" size={13} />
              <span>Join WhatsApp Channel for Updates &amp; Discounts</span>
              <span className="text-[10px]">↗</span>
            </a>

            <a
              href="https://wa.me/923088180234"
              target="_blank"
              rel="noreferrer"
              className="inline-flex flex-wrap items-center justify-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition"
            >
              <span className="inline-flex items-center gap-1">
                <Icon name="support" size={13} /> Need help?
              </span>
              <span>WhatsApp Admin: <strong className="text-white font-bold underline">+92 308 8180234</strong></span>
            </a>
          </div>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-indigo-400 hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
