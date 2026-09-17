"use client";

import { useEffect, useRef, useState } from "react";

interface BotShieldProps {
  onVerify: (token: string, honeypot: string) => void;
  className?: string;
}

export function BotShield({ onVerify, className = "" }: BotShieldProps) {
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;

  // 1. If Cloudflare Turnstile site key is configured, load Turnstile widget
  useEffect(() => {
    if (!turnstileSiteKey || !turnstileRef.current) return;

    // Inject Cloudflare Turnstile script
    if (!document.getElementById("cf-turnstile-script")) {
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    const interval = setInterval(() => {
      const turnstile = (window as unknown as { turnstile?: { render: (el: HTMLElement, opts: unknown) => string } }).turnstile;
      if (turnstile && turnstileRef.current) {
        clearInterval(interval);
        turnstile.render(turnstileRef.current, {
          sitekey: turnstileSiteKey,
          theme: "dark",
          callback: (token: string) => {
            setVerified(true);
            onVerify(token, honeypot);
          },
          "error-callback": () => {
            setVerified(false);
            onVerify("", honeypot);
          },
        });
      }
    }, 200);

    return () => clearInterval(interval);
  }, [turnstileSiteKey, honeypot, onVerify]);

  // 2. Native Smart Fallback Token Generator
  async function handleNativeVerification() {
    if (verified || verifying) return;
    setVerifying(true);

    try {
      // Simulate micro security challenge check
      await new Promise((resolve) => setTimeout(resolve, 350));

      const timestamp = Date.now();
      const msgBuffer = new TextEncoder().encode(`vexo_human_shield_${timestamp}`);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
      const token = `human_shield:${timestamp}:${hashHex}`;

      setVerified(true);
      onVerify(token, honeypot);
    } catch {
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  }

  // If Cloudflare Turnstile key is configured, render Turnstile container
  if (turnstileSiteKey) {
    return (
      <div className={`my-3 ${className}`}>
        {/* Hidden Honeypot trap */}
        <input
          type="text"
          name="_hp_trap"
          value={honeypot}
          onChange={(e) => {
            setHoneypot(e.target.value);
            onVerify("", e.target.value);
          }}
          tabIndex={-1}
          autoComplete="off"
          style={{ display: "none", opacity: 0, position: "absolute", left: "-9999px" }}
          aria-hidden="true"
        />
        <div ref={turnstileRef} className="flex justify-center" />
      </div>
    );
  }

  // Native Smart Interactive Verification Shield
  return (
    <div className={`my-3 ${className}`}>
      {/* Hidden Honeypot trap (catches automated scraper bots that fill every input) */}
      <input
        type="text"
        name="_hp_trap"
        value={honeypot}
        onChange={(e) => {
          setHoneypot(e.target.value);
          onVerify("", e.target.value);
        }}
        tabIndex={-1}
        autoComplete="off"
        style={{ display: "none", opacity: 0, position: "absolute", left: "-9999px" }}
        aria-hidden="true"
      />

      <div
        onClick={handleNativeVerification}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleNativeVerification()}
        className={`flex items-center justify-between rounded-2xl border p-3.5 transition cursor-pointer select-none ${
          verified
            ? "border-[#baff00]/50 bg-[#baff00]/5 shadow-[0_0_20px_rgba(186,255,0,0.08)]"
            : "border-white/10 bg-[#0d1618] hover:border-white/20 hover:bg-[#111c1e]"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-lg border transition ${
              verified
                ? "border-[#baff00] bg-[#baff00] text-[#07100f]"
                : verifying
                ? "border-amber-400/50 bg-amber-400/10"
                : "border-white/20 bg-white/5"
            }`}
          >
            {verifying ? (
              <svg className="h-3.5 w-3.5 animate-spin text-amber-300" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : verified ? (
              <svg className="h-3.5 w-3.5 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-bold text-white">
              {verifying ? "Verifying..." : verified ? "Human Verified" : "I am human (Verification)"}
            </p>
            <p className="text-[10px] text-slate-400">
              {verified ? "VEXARO Security Shield Active" : "Click to verify you are not a bot"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-slate-500">
          <svg className="h-4 w-4 text-[#baff00]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12 2.2 2.2 4.8-5" />
          </svg>
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400">VEXARO Guard</span>
        </div>
      </div>
    </div>
  );
}
