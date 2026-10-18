"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface CaptchaData {
  captchaResponse: string;
  captchaToken: string;
  turnstileToken: string;
  honeypot: string;
}

interface RealCaptchaProps {
  onVerify: (data: CaptchaData) => void;
  className?: string;
}

export function RealCaptcha({ onVerify, className = "" }: RealCaptchaProps) {
  const [mode, setMode] = useState<"visual" | "turnstile">("visual");
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
  const [svgUri, setSvgUri] = useState<string>("");
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [userInput, setUserInput] = useState<string>("");
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [honeypot, setHoneypot] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  const cleanupTurnstile = useCallback(() => {
    if (typeof window !== "undefined") {
      const turnstile = (window as unknown as { turnstile?: { remove: (id: string) => void } }).turnstile;
      if (turnstile && turnstileWidgetId.current) {
        try {
          turnstile.remove(turnstileWidgetId.current);
        } catch {}
        turnstileWidgetId.current = null;
      }
    }
    if (turnstileContainerRef.current) {
      turnstileContainerRef.current.innerHTML = "";
    }
  }, []);

  const fetchCaptcha = useCallback(async () => {
    setLoading(true);
    setError("");
    setUserInput("");
    try {
      const res = await fetch("/api/auth/captcha", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        if (data.mode === "turnstile" && data.turnstileSiteKey) {
          setMode("turnstile");
          setTurnstileSiteKey(data.turnstileSiteKey);
        } else {
          setMode("visual");
          cleanupTurnstile();
        }
        if (data.visual) {
          setSvgUri(data.visual.svg);
          setCaptchaToken(data.visual.token);
        }
      } else {
        setError("Could not load security challenge");
      }
    } catch {
      setError("Failed to load captcha. Click to retry.");
    } finally {
      setLoading(false);
    }
  }, [cleanupTurnstile]);

  useEffect(() => {
    fetchCaptcha();
    return () => {
      cleanupTurnstile();
    };
  }, [fetchCaptcha, cleanupTurnstile]);

  // Handle Cloudflare Turnstile initialization
  useEffect(() => {
    if (mode !== "turnstile" || !turnstileSiteKey || !turnstileContainerRef.current) return;

    if (!document.getElementById("cf-turnstile-script")) {
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    const interval = setInterval(() => {
      const turnstile = (window as unknown as {
        turnstile?: {
          render: (el: HTMLElement, opts: unknown) => string;
          remove: (id: string) => void;
        };
      }).turnstile;

      if (turnstile && turnstileContainerRef.current) {
        clearInterval(interval);
        try {
          if (!turnstileWidgetId.current) {
            turnstileWidgetId.current = turnstile.render(turnstileContainerRef.current, {
              sitekey: turnstileSiteKey,
              theme: "dark",
              callback: (token: string) => {
                setTurnstileToken(token);
                onVerify({
                  captchaResponse: token,
                  captchaToken: "",
                  turnstileToken: token,
                  honeypot,
                });
              },
              "error-callback": () => {
                setTurnstileToken("");
                // Safely fallback to visual captcha if turnstile fails
                cleanupTurnstile();
                setMode("visual");
              },
            });
          }
        } catch (e) {
          console.error("Turnstile render error:", e);
        }
      }
    }, 200);

    return () => {
      clearInterval(interval);
    };
  }, [mode, turnstileSiteKey, honeypot, onVerify, cleanupTurnstile]);

  // When user types in visual code
  function handleInputChange(val: string) {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
    setUserInput(clean);
    onVerify({
      captchaResponse: clean,
      captchaToken,
      turnstileToken: "",
      honeypot,
    });
  }

  return (
    <div className={`my-4 w-full overflow-hidden ${className}`}>
      {/* Hidden honeypot trap to catch automated scrapers */}
      <input
        type="text"
        name="_hp_trap"
        value={honeypot}
        onChange={(e) => {
          setHoneypot(e.target.value);
          onVerify({
            captchaResponse: userInput,
            captchaToken,
            turnstileToken,
            honeypot: e.target.value,
          });
        }}
        tabIndex={-1}
        autoComplete="off"
        style={{ display: "none", opacity: 0, position: "absolute", left: "-9999px" }}
        aria-hidden="true"
      />

      {mode === "turnstile" ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-[#0d131f] p-3 shadow-inner overflow-hidden">
          <div ref={turnstileContainerRef} className="my-1 min-h-[65px] flex justify-center w-full max-w-full" />
          <button
            type="button"
            onClick={() => {
              cleanupTurnstile();
              setMode("visual");
            }}
            className="mt-2 text-[11px] font-medium text-slate-400 hover:text-indigo-400 underline transition cursor-pointer"
          >
            Testing locally? Click here to use Visual Security Code
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-[#0d131f] p-3.5 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 truncate">
              <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="truncate">Security Code</span>
            </span>
            <div className="flex items-center gap-3">
              {turnstileSiteKey && (
                <button
                  type="button"
                  onClick={() => setMode("turnstile")}
                  className="text-[11px] text-indigo-400 hover:underline transition"
                >
                  Use Cloudflare Turnstile
                </button>
              )}
              <button
                type="button"
                onClick={fetchCaptcha}
                title="Get a new security code"
                className="shrink-0 flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-400 transition active:scale-95 whitespace-nowrap"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* SVG Captcha Box */}
            <div
              onClick={fetchCaptcha}
              title="Click to refresh security code"
              className="relative cursor-pointer overflow-hidden rounded-xl border border-slate-700 bg-[#070a12] p-1 shrink-0 flex items-center justify-center hover:border-indigo-500/50 transition group"
            >
              {loading ? (
                <div className="w-[140px] h-[46px] flex items-center justify-center bg-[#070a12] text-slate-500 text-xs">
                  <span className="animate-pulse">Loading...</span>
                </div>
              ) : svgUri ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={svgUri}
                  alt="Security Verification Code"
                  width={140}
                  height={46}
                  className="block select-none max-w-full h-auto"
                  draggable={false}
                />
              ) : (
                <div className="w-[140px] h-[46px] flex items-center justify-center text-xs text-rose-400">
                  {error || "Error"}
                </div>
              )}
            </div>

            {/* Input for the code */}
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={userInput}
                onChange={(e) => handleInputChange(e.target.value)}
                maxLength={5}
                placeholder="Enter 5-digit code"
                autoComplete="off"
                spellCheck="false"
                className="w-full rounded-xl border border-slate-700 bg-[#070a12] px-3 py-2.5 text-center font-mono text-base font-extrabold tracking-widest text-indigo-400 placeholder:font-sans placeholder:text-xs placeholder:tracking-normal placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition"
              />
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-400 leading-normal">
            Type the 5 characters shown in the image to verify you are human.
          </p>
        </div>
      )}
    </div>
  );
}
