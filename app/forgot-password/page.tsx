"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { RealCaptcha, CaptchaData } from "@/components/real-captcha";

function Icon({ name, size = 18 }: { name: "shield" | "whatsapp" | "lock" | "eye" | "eyeOff" | "check" | "mail"; size?: number }) {
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
  if (name === "shield") return <svg {...common}><path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>;
  if (name === "whatsapp") return <svg {...common}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884"/></svg>;
  if (name === "eye") return <svg {...common}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
  if (name === "eyeOff") return <svg {...common}><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>;
  if (name === "mail") return <svg {...common}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
  if (name === "check") return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>;
  return <svg {...common}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Captcha state
  const [captchaData, setCaptchaData] = useState<CaptchaData>({
    captchaResponse: "",
    captchaToken: "",
    turnstileToken: "",
    honeypot: "",
  });

  const [resendCooldown, setResendCooldown] = useState(0);
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 1: Send Reset Verification Code to Email
  async function handleSendResetCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    if (!captchaData.captchaResponse && !captchaData.turnstileToken) {
      setError("Please complete the security verification challenge below.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password/send-code", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          email: email.trim(),
          captchaResponse: captchaData.captchaResponse,
          captchaToken: captchaData.captchaToken,
          turnstileToken: captchaData.turnstileToken,
          honeypot: captchaData.honeypot,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to send reset verification code.");
        return;
      }

      if (data.simulatedCode) {
        setSimulatedCode(data.simulatedCode);
      }
      setResendCooldown(45);
      setStep("reset");
    } catch {
      setError("Network error sending reset code. Please try again or reach out on WhatsApp.");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify Code and Set New Password
  async function handleVerifyAndReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setError("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password/verify-code", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          email: email.trim(),
          code: cleanCode,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to reset password.");
        return;
      }

      setSuccess("Password reset successfully! Logging you in...");
      setTimeout(() => {
        window.location.replace(data.redirect || "/dashboard");
      }, 1000);
    } catch {
      setError("An unexpected error occurred. Please try again or reach out on WhatsApp.");
    } finally {
      setLoading(false);
    }
  }

  // Resend code handler
  async function handleResendCode() {
    if (resendCooldown > 0 || loading) return;
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password/send-code", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          captchaResponse: captchaData.captchaResponse,
          captchaToken: captchaData.captchaToken,
          turnstileToken: captchaData.turnstileToken,
          honeypot: captchaData.honeypot,
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

  const whatsappMessage = encodeURIComponent(
    `Hello VEXARO SMM Admin, I need help resetting my password for email: ${email.trim() || "[enter email]"}.`
  );

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#0b0f19] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md min-w-0 items-center justify-center">
        <div className="w-full max-w-full rounded-3xl bg-[#111827] p-5 shadow-2xl border border-slate-800 sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-2xl font-black text-indigo-400">
              <Icon name="lock" size={26} />
            </div>
            <h1 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
              {step === "reset" ? "Enter Verification Code" : "Reset Your Password"}
            </h1>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {step === "reset"
                ? `Enter the 6-digit verification code sent to ${email} to set a new password.`
                : "Enter your registered email address to receive a secure password reset code."}
            </p>
          </div>

          {/* Direct WhatsApp Emergency Reset Badge */}
          <div className="mt-5 rounded-2xl border border-[#25d366]/30 bg-[#25d366]/10 p-3.5 sm:p-4">
            <div className="flex items-start gap-2.5">
              <span className="text-[#25d366] mt-0.5 shrink-0"><Icon name="whatsapp" size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white">Need Instant Help?</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-300">
                  Message VEXARO SMM Admin directly on WhatsApp to unlock or reset your account in under 2 minutes.
                </p>
                <a
                  href={`https://wa.me/923176437013?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2.5 inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-[#25d366] px-3 py-1.5 text-xs font-bold text-[#07100f] transition hover:bg-[#20bd5a]"
                >
                  <Icon name="whatsapp" size={13} /> Reset via WhatsApp (+92 317 6437013)
                </a>
              </div>
            </div>
          </div>

          {step === "reset" ? (
            /* ================= STEP 2: CODE & NEW PASSWORD ================= */
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 mb-2">
                  <Icon name="mail" size={20} />
                </div>
                <p className="text-xs font-bold text-white">Reset code sent to:</p>
                <p className="font-mono text-sm font-black text-indigo-400 mt-0.5">{email}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Valid for 15 minutes. Check Spam/Junk folder if not in Inbox.
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
                  <div className="flex items-center justify-between border-t border-amber-400/20 pt-2.5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-400 block">Your Reset Code:</span>
                      <span className="font-mono text-xl font-black text-indigo-400 tracking-widest">{simulatedCode}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCode(simulatedCode)}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition cursor-pointer"
                    >
                      Fill Code ↵
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleVerifyAndReset} className="space-y-4">
                <div>
                  <label htmlFor="vexaro-reset-code" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400 text-center">
                    6-Digit Verification Code
                  </label>
                  <input
                    id="vexaro-reset-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="• • • • • •"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    className="w-full rounded-2xl border-2 border-indigo-500/50 bg-[#0d131f] px-4 py-3 text-center font-mono text-2xl font-black tracking-[0.4em] text-indigo-400 placeholder:tracking-widest placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="vexaro-reset-newpassword" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      New Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs font-medium text-slate-400 hover:text-white"
                      tabIndex={-1}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="vexaro-reset-newpassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      required
                      className="w-full rounded-xl border border-slate-800 bg-[#0d131f] px-4 py-3 text-base sm:text-sm text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="vexaro-reset-confirmpassword" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Confirm New Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-xs font-medium text-slate-400 hover:text-white"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    id="vexaro-reset-confirmpassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your new password"
                    autoComplete="new-password"
                    required
                    className="w-full rounded-xl border border-slate-800 bg-[#0d131f] px-4 py-3 text-base sm:text-sm text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-300">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-400 flex items-center gap-2">
                    <Icon name="check" size={16} />
                    <span>{success}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="mt-2 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-3.5 text-sm font-bold text-white transition hover:from-indigo-400 hover:to-blue-500 disabled:opacity-60 shadow-lg shadow-indigo-500/25 cursor-pointer"
                >
                  {loading ? "Updating password..." : "Set New Password & Sign In"}
                </button>
              </form>

              <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-400">
                <button
                  type="button"
                  onClick={() => setStep("request")}
                  className="hover:text-white transition underline"
                >
                  ← Change Email Address
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
            /* ================= STEP 1: EMAIL ENTRY & CAPTCHA ================= */
            <form onSubmit={handleSendResetCode} method="POST" action="/api/auth/forgot-password/send-code" className="mt-6 space-y-4">
              <div>
                <label htmlFor="vexaro-reset-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Registered Account Email
                </label>
                <input
                  id="vexaro-reset-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-slate-800 bg-[#0d131f] px-4 py-3 text-base sm:text-sm text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Real CAPTCHA Code */}
              <RealCaptcha
                onVerify={(data) => {
                  setCaptchaData(data);
                  if (error && error.includes("verification")) setError("");
                }}
              />

              {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-3.5 text-sm font-bold text-white transition hover:from-indigo-400 hover:to-blue-500 disabled:opacity-60 shadow-lg shadow-indigo-500/25 cursor-pointer"
              >
                {loading ? "Sending verification code..." : "Send Verification Code →"}
              </button>
            </form>
          )}

          <div className="mt-7 space-y-2 text-center text-sm text-slate-400 border-t border-slate-800 pt-5">
            <p>
              Remember your password?{" "}
              <Link href="/login" className="font-bold text-indigo-400 hover:underline">
                Sign In
              </Link>
            </p>
            <p className="text-xs text-slate-500">
              Need a new account?{" "}
              <Link href="/signup" className="font-semibold text-slate-300 hover:text-white hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
