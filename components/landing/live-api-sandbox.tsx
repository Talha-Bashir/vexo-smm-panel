"use client";

import React, { useState } from "react";
import Link from "next/link";

type LanguageKey = "curl" | "python" | "node";

const CODE_EXAMPLES: Record<LanguageKey, string> = {
  curl: `curl -X POST https://vexarosmm.com/api/v2 \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "your_api_token_here",
    "action": "add",
    "service": 142,
    "link": "https://instagram.com/your_handle",
    "quantity": 5000
  }'`,
  python: `import requests

url = "https://vexarosmm.com/api/v2"
payload = {
    "key": "your_api_token_here",
    "action": "add",
    "service": 142,
    "link": "https://instagram.com/your_handle",
    "quantity": 5000
}

response = requests.post(url, json=payload)
print(response.json())`,
  node: `const axios = require('axios');

async function placeOrder() {
  const { data } = await axios.post('https://vexarosmm.com/api/v2', {
    key: 'your_api_token_here',
    action: 'add',
    service: 142,
    link: 'https://instagram.com/your_handle',
    quantity: 5000
  });
  console.log('Order Dispatched:', data.order);
}
placeOrder();`,
};

export function LiveApiSandbox() {
  const [lang, setLang] = useState<LanguageKey>("curl");
  const [isRunning, setIsRunning] = useState(false);
  const [hasExecuted, setHasExecuted] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRun = () => {
    setIsRunning(true);
    setHasExecuted(false);
    setTimeout(() => {
      setIsRunning(false);
      setHasExecuted(true);
    }, 450);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(CODE_EXAMPLES[lang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="w-full px-[clamp(1rem,4vw,2.5rem)] py-[clamp(3.5rem,6vw,5.5rem)] bg-[#090d18] relative overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8 items-center">
          {/* Left Text & Value Prop for Resellers/Developers */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#baff00]/25 bg-[#baff00]/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#baff00]">
              <span>⚡ Reseller &amp; API Ready</span>
            </div>
            <h2 className="mt-4 text-fluid-h2 font-black tracking-tight text-white">
              Connect Your Website or App via{" "}
              <span className="bg-gradient-to-r from-[#baff00] via-lime-300 to-emerald-400 bg-clip-text text-transparent">
                Sub-Second REST API
              </span>
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Automated order forwarding, balance sync, and status webhooks for your website or app.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="rounded-2xl border border-slate-800 bg-[#111827] p-3 text-center sm:text-left">
                <span className="text-[10px] font-bold text-[#baff00] uppercase font-mono">LATENCY</span>
                <p className="text-sm font-black text-white mt-0.5">⚡ &lt;50ms Queue</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Sub-second start</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#111827] p-3 text-center sm:text-left">
                <span className="text-[10px] font-bold text-emerald-400 uppercase font-mono">COMPATIBLE</span>
                <p className="text-sm font-black text-white mt-0.5">Standard v2</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Perfect Panel ready</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#111827] p-3 text-center sm:text-left">
                <span className="text-[10px] font-bold text-[#baff00] uppercase font-mono">PROTECTION</span>
                <p className="text-sm font-black text-white mt-0.5">Auto Refill</p>
                <p className="text-[10px] text-slate-500 mt-0.5">30-day warranty</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="rounded-xl bg-gradient-to-r from-[#baff00] to-lime-400 hover:from-lime-300 hover:to-lime-400 px-6 py-3 text-xs sm:text-sm font-black text-black shadow-lg shadow-[#baff00]/25 transition hover:scale-105"
              >
                <span>Generate Free API Key →</span>
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-5 py-3 text-xs sm:text-sm font-bold text-slate-300 hover:text-white transition"
              >
                Full API Reference
              </Link>
            </div>
          </div>

          {/* Right: Sleek Interactive macOS Terminal Sandbox */}
          <div className="rounded-3xl border border-slate-700/80 bg-[#0d121f] shadow-2xl overflow-hidden">
            {/* Terminal Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#0a0e17] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono text-[11px] text-slate-400 font-semibold">
                  api.vexarosmm.com:443
                </span>
              </div>

              {/* Language Switcher Tabs */}
              <div className="flex items-center gap-1 bg-[#111827] rounded-lg p-1 border border-slate-800">
                {(["curl", "python", "node"] as LanguageKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setLang(k);
                      setHasExecuted(false);
                    }}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold transition uppercase ${
                      lang === k
                        ? "bg-[#baff00] text-black font-black"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Body */}
            <div className="relative p-4 sm:p-5 font-mono text-xs text-slate-200 overflow-x-auto bg-[#0d121f]">
              <button
                type="button"
                onClick={handleCopy}
                className="absolute top-4 right-4 rounded-lg border border-slate-700 bg-slate-800/90 px-2.5 py-1 text-[10px] font-bold text-slate-300 hover:text-white transition"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
              <pre className="text-slate-300 leading-relaxed">
                <code>{CODE_EXAMPLES[lang]}</code>
              </pre>
            </div>

            {/* Terminal Action / Run Trigger */}
            <div className="border-t border-slate-800 bg-[#0a0e17] p-3 sm:p-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handleRun}
                disabled={isRunning}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#baff00] to-lime-400 hover:from-lime-300 hover:to-lime-400 px-4 py-2 text-xs font-black text-black transition shadow-md shadow-[#baff00]/25 cursor-pointer disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Transmitting packet...</span>
                  </>
                ) : (
                  <>
                    <span>▶ Run Test Request</span>
                  </>
                )}
              </button>

              <span className="text-[11px] font-mono text-slate-400">
                Response: <strong className="text-emerald-400">{hasExecuted ? "200 OK (38ms)" : "Ready"}</strong>
              </span>
            </div>

            {/* Simulated Live JSON Response Output */}
            {hasExecuted && (
              <div className="border-t border-slate-800 bg-[#080c14] p-4 font-mono text-xs text-emerald-400 animate-in fade-in duration-200">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">// 200 OK Response Payload</p>
                <pre className="text-[11px] leading-relaxed text-emerald-300 overflow-x-auto">
{`{
  "status": "success",
  "order": 948210,
  "service": 142,
  "service_name": "Instagram High-Retention Followers",
  "quantity": 5000,
  "charge_usd": "2.10",
  "charge_pkr": "585.80",
  "cluster_node": "PK-ISB-04",
  "dispatch_latency": "38ms",
  "refill": true,
  "refill_period": "30 days"
}`}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
