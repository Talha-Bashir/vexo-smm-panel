"use client";

import { useState } from "react";
import {
  type ParsedAccountItem,
  type ParsedAccessDetails,
} from "@/lib/account-credentials-parser";

interface StructuredCredentialsCardProps {
  details: ParsedAccessDetails;
  toolName?: string;
  onCopy: (text: string, label: string) => void;
  compact?: boolean;
}

export function StructuredCredentialsCard({
  details,
  toolName = "",
  onCopy,
  compact = false,
}: StructuredCredentialsCardProps) {
  // Track password visibility per account id
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  // Track whether guide is open
  const [showGuide, setShowGuide] = useState<boolean>(true);
  // Track whether raw text is expanded
  const [showRaw, setShowRaw] = useState<boolean>(false);

  const togglePassword = (accId: string) => {
    setShowPassword((prev) => ({ ...prev, [accId]: !prev[accId] }));
  };

  const accounts = details.accounts || [];

  return (
    <div className="space-y-3.5">
      {/* Header Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
            {accounts.length > 1 ? `${accounts.length} Ready Accounts Delivered` : "Ready Account Access"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1"
        >
          <span>{showGuide ? "Hide Login Steps ▲" : "How to Login? (Steps) ▼"}</span>
        </button>
      </div>

      {/* Account Cards List */}
      <div className="space-y-3">
        {accounts.map((acc, index) => {
          const isPassVisible = Boolean(showPassword[acc.id]);
          const portalUrl = acc.portalUrl || details.defaultPortalUrl;
          const providerName = acc.providerName || details.defaultProviderName;

          return (
            <div
              key={acc.id}
              className="rounded-2xl border border-white/10 bg-[#081215] p-3.5 sm:p-4 space-y-3.5 shadow-inner"
            >
              {accounts.length > 1 && (
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Account #{index + 1}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {acc.email || "Credential"}
                  </span>
                </div>
              )}

              {/* Direct Action Portal Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {portalUrl && (
                  <a
                    href={portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-cyan-400 px-3.5 py-2 text-xs font-black text-[#07100f] hover:bg-cyan-300 transition shadow-[0_2px_10px_rgba(34,211,238,0.2)]"
                  >
                    <span>🌐 Sign In at {providerName} ↗</span>
                  </a>
                )}

                {acc.codeUrl && (
                  <a
                    href={acc.codeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-black text-[#07100f] hover:bg-emerald-400 transition shadow-[0_2px_10px_rgba(16,185,129,0.2)]"
                  >
                    <span className="inline-block h-2 w-2 rounded-full bg-[#07100f] animate-ping" />
                    <span>📩 Get Verification Code ↗</span>
                  </a>
                )}
              </div>

              {/* Account Credentials Fields */}
              <div className="space-y-2.5">
                {/* Email Row */}
                {acc.email ? (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Account Email / Login
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#04080a] p-1.5 pl-3">
                      <span className="flex-1 font-mono text-xs font-bold text-white select-all truncate">
                        {acc.email}
                      </span>
                      <button
                        type="button"
                        onClick={() => onCopy(acc.email!, "Email copied to clipboard!")}
                        className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:bg-white/20 hover:text-white transition flex items-center gap-1 shrink-0"
                      >
                        <span>📋</span>
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Password Row */}
                {acc.password ? (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Password
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#04080a] p-1.5 pl-3">
                      <span className="flex-1 font-mono text-xs font-bold text-[#baff00] select-all truncate">
                        {isPassVisible ? acc.password : "••••••••••••"}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePassword(acc.id)}
                        className="rounded-lg bg-white/5 px-2 py-1 text-[11px] font-bold text-slate-400 hover:text-slate-200 hover:bg-white/10 transition shrink-0"
                        title={isPassVisible ? "Hide password" : "Show password"}
                      >
                        {isPassVisible ? "Hide 👁️" : "Show 👁️"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onCopy(acc.password!, "Password copied to clipboard!")}
                        className="rounded-lg bg-[#baff00] px-2.5 py-1 text-[11px] font-black text-[#07100f] hover:bg-[#d2ff5a] transition flex items-center gap-1 shrink-0"
                      >
                        <span>📋</span>
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Backup Verification Mail / Inbox (if present) */}
                {(acc.backupEmail || acc.backupPortal) && (
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-bold">Backup 2FA / Security Inbox:</span>
                      {acc.backupPortal && (
                        <a
                          href={acc.backupPortal}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:underline font-bold"
                        >
                          Open Backup Portal ↗
                        </a>
                      )}
                    </div>
                    {acc.backupEmail && (
                      <div className="flex items-center justify-between font-mono text-[11px] text-slate-300">
                        <span className="truncate">{acc.backupEmail}</span>
                        <button
                          type="button"
                          onClick={() => onCopy(acc.backupEmail!, "Backup email copied!")}
                          className="text-[10px] text-slate-400 hover:text-white underline ml-2 shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step-by-Step Login Instructions Walkthrough */}
      {showGuide && (
        <div className="rounded-2xl border border-cyan-500/20 bg-[#071317] p-3.5 sm:p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm">📖</span>
            <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
              Easy Step-by-Step Login Guide
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
            {/* Step 1 */}
            <div className="flex items-start gap-2 rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-400 font-black text-[#07100f] text-[10px]">
                1
              </span>
              <div>
                <p className="font-bold text-white">Open Login Portal</p>
                <p className="text-slate-400 mt-0.5 text-[10.5px] leading-relaxed">
                  Click the <strong>&ldquo;Sign In&rdquo;</strong> button above. (Tip: Use a <em>Private / Incognito</em> browser tab).
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-2 rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-400 font-black text-[#07100f] text-[10px]">
                2
              </span>
              <div>
                <p className="font-bold text-white">Enter Email &amp; Password</p>
                <p className="text-slate-400 mt-0.5 text-[10.5px] leading-relaxed">
                  Use the <strong>Copy</strong> buttons above to paste your Email and Password into the login screen.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-2 rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400 font-black text-[#07100f] text-[10px]">
                3
              </span>
              <div>
                <p className="font-bold text-white">Verification Code (If prompted)</p>
                <p className="text-slate-400 mt-0.5 text-[10.5px] leading-relaxed">
                  If asked to verify identity, click <strong>&ldquo;Get Verification Code&rdquo;</strong> to view the code instantly.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-2 rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#baff00] font-black text-[#07100f] text-[10px]">
                4
              </span>
              <div>
                <p className="font-bold text-white">Login Complete!</p>
                <p className="text-slate-400 mt-0.5 text-[10.5px] leading-relaxed">
                  You are all set. You can link your personal phone or recovery email in security settings anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Collapsible: Raw Delivery String */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowRaw(!showRaw)}
          className="text-[10px] text-slate-500 hover:text-slate-400 transition font-mono flex items-center gap-1"
        >
          <span>{showRaw ? "▼ Hide raw data" : "▶ Advanced: View raw delivery text"}</span>
        </button>

        {showRaw && (
          <div className="mt-2 rounded-xl border border-white/10 bg-black/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">Raw Supplier Delivery String</span>
              <button
                type="button"
                onClick={() => onCopy(details.raw, "Raw text copied to clipboard!")}
                className="text-[10px] font-bold text-cyan-400 hover:underline"
              >
                📋 Copy Raw String
              </button>
            </div>
            <pre className="font-mono text-[11px] text-slate-300 whitespace-pre-wrap break-all select-all leading-relaxed max-h-32 overflow-y-auto">
              {details.raw}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
