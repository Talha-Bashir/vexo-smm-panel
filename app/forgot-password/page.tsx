"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

function Mark() {
  return (
    <div className="relative flex h-14 w-14 mx-auto items-center justify-center rounded-2xl overflow-hidden shadow-[0_0_28px_rgba(186,255,0,0.35)] border border-[#baff00]/30">
      <img src="/logo.png" alt="VEXARO SMM Password Recovery" className="h-full w-full object-cover" />
    </div>
  );
}

function Icon({ name, size = 18 }: { name: "shield" | "whatsapp" | "lock" | "eye" | "eyeOff" | "check"; size?: number }) {
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
  if (name === "check") return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>;
  return <svg {...common}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [accountName, setAccountName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    if (!accountName.trim()) {
      setError("Please enter your registered full name or account name.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter your password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          email: email.trim(),
          accountName: accountName.trim(),
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to reset password.");
        return;
      }

      setSuccess("Password updated successfully! Logging you in...");
      setTimeout(() => {
        window.location.replace("/dashboard");
      }, 1000);
    } catch {
      setError("An unexpected error occurred. Please try again or reach out on WhatsApp.");
    } finally {
      setLoading(false);
    }
  }

  const whatsappMessage = encodeURIComponent(
    `Hello VEXARO SMM Admin, I forgot my password for my account email: ${email.trim() || "[enter email]"}. Please help me reset my account.`
  );

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#070d0d] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md min-w-0 items-center justify-center">
        <div className="w-full max-w-full rounded-3xl bg-[#111a1d] p-5 shadow-2xl border border-white/10 sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#baff00]/10 text-2xl font-black text-[#baff00]">
              <Icon name="lock" size={26} />
            </div>
            <h1 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
              Reset Your Password
            </h1>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Verify your registered account details to securely set a new password.
            </p>
          </div>

          {/* Direct WhatsApp Emergency Reset Badge */}
          <div className="mt-5 rounded-2xl border border-[#25d366]/30 bg-[#25d366]/10 p-3.5 sm:p-4">
            <div className="flex items-start gap-2.5">
              <span className="text-[#25d366] mt-0.5 shrink-0"><Icon name="whatsapp" size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white">Need Instant Help?</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-300">
                  Forgot your account name? Message VEXARO SMM Admin directly on WhatsApp to unlock or reset your account in under 2 minutes.
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

          <form onSubmit={handleSubmit} method="POST" action="/api/auth/forgot-password" className="mt-6 space-y-4">
            <div>
              <label htmlFor="vexaro-reset-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Registered VEXARO Account Email
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
                className="w-full rounded-xl border border-white/10 bg-[#0b1316] px-4 py-3 text-base sm:text-sm text-white outline-none focus:border-[#baff00] focus:ring-2 focus:ring-[#baff00]/10"
              />
            </div>

            <div>
              <label htmlFor="vexaro-reset-accountname" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Registered VEXARO Account Name
              </label>
              <input
                id="vexaro-reset-accountname"
                name="accountName"
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Name entered during signup"
                autoComplete="name"
                required
                className="w-full rounded-xl border border-white/10 bg-[#0b1316] px-4 py-3 text-base sm:text-sm text-white outline-none focus:border-[#baff00] focus:ring-2 focus:ring-[#baff00]/10"
              />
              <p className="mt-1 text-[11px] text-slate-500">Used to verify VEXARO panel account ownership securely.</p>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="vexaro-reset-newpassword" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  New VEXARO Account Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs font-medium text-slate-400 hover:text-white"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="relative">
                <input
                  id="vexaro-reset-newpassword"
                  name="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#0b1316] px-4 py-3 text-base sm:text-sm text-white outline-none focus:border-[#baff00] focus:ring-2 focus:ring-[#baff00]/10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="vexaro-reset-confirmpassword" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Confirm New VEXARO Password
              </label>
              <input
                id="vexaro-reset-confirmpassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
                autoComplete="new-password"
                required
                className="w-full rounded-xl border border-white/10 bg-[#0b1316] px-4 py-3 text-base sm:text-sm text-white outline-none focus:border-[#baff00] focus:ring-2 focus:ring-[#baff00]/10"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-300">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-lime-400/30 bg-lime-400/10 px-4 py-3 text-xs font-bold text-[#baff00] flex items-center gap-2">
                <Icon name="check" size={16} />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-[#baff00] px-4 py-3.5 text-sm font-black text-[#07100f] transition hover:bg-[#d2ff5a] disabled:opacity-60"
            >
              {loading ? "Updating password..." : "Set New Password & Sign In"}
            </button>
          </form>

          <div className="mt-7 space-y-2 text-center text-sm text-slate-400">
            <p>
              Remember your password?{" "}
              <Link href="/login" className="font-bold text-[#baff00] hover:underline">
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
