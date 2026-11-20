"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Social3DIcon } from "@/components/social-3d-icon";
import { fireConfetti } from "./confetti";

interface WorkflowStep {
  step: string;
  title: string;
  desc: string;
  tag: string;
  mockHeadline: string;
}

const STEPS: WorkflowStep[] = [
  {
    step: "01",
    title: "Choose Platform & Goal",
    desc: "Pick from Instagram, TikTok, YouTube, Telegram & 20+ networks with 1,000+ targeted wholesale services.",
    tag: "Instant Catalog",
    mockHeadline: "Targeted Service Matrix",
  },
  {
    step: "02",
    title: "Paste URL (No Passwords)",
    desc: "Simply paste your public username or post link. Zero password required—your account stays 100% secure.",
    tag: "Bank-Grade Privacy",
    mockHeadline: "Zero-Password Link Verification",
  },
  {
    step: "03",
    title: "Automated Instant Launch",
    desc: "Our automated API nodes forward your order in under 45ms. Delivery kicks off automatically in 0–15 minutes.",
    tag: "Sub-Second Dispatch",
    mockHeadline: "Automated API Delivery Node",
  },
  {
    step: "04",
    title: "Watch Numbers Surge",
    desc: "Track real-time progress right from your live dashboard. Enjoy free 30-day refills and money-back wallet safety.",
    tag: "30-Day Auto Refill",
    mockHeadline: "Live Engagement Surge & Refill Shield",
  },
];

export function InteractiveWorkflow() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="how-it-works" className="w-full border-t border-slate-800 bg-[#0b0f1b] px-[clamp(1rem,4vw,2.5rem)] py-[clamp(3.5rem,6vw,5.5rem)] relative overflow-hidden">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="rounded-full border border-[#baff00]/25 bg-[#baff00]/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#baff00]">
            Interactive Workflow
          </span>
          <h2 className="mt-4 text-fluid-h2 font-black tracking-tight text-white">
            How VEXARO Ignites Growth in{" "}
            <span className="bg-gradient-to-r from-[#baff00] via-lime-300 to-emerald-400 bg-clip-text text-transparent">
              4 Simple Steps
            </span>
          </h2>
          <p className="mt-3 text-fluid-body text-slate-400">
            No complicated contracts or manual approval. Click any step below to preview the automated pipeline.
          </p>
        </div>

        {/* Step Navigation Pill Strip */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
          {STEPS.map((s, idx) => {
            const active = activeStep === idx;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  setActiveStep(idx);
                  if (idx === 3) fireConfetti();
                }}
                className={`relative text-left rounded-2xl p-4 sm:p-5 transition cursor-pointer border ${
                  active
                    ? "border-[#baff00] bg-gradient-to-b from-lime-950/30 to-[#12192c] text-white shadow-xl shadow-[#baff00]/10"
                    : "border-slate-800 bg-[#0e1424] text-slate-400 hover:text-white hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-black font-mono ${active ? "text-[#baff00]" : "text-slate-500"}`}>
                    STEP {s.step}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    active ? "bg-[#baff00]/20 text-[#baff00] border border-[#baff00]/30" : "bg-slate-800 text-slate-500"
                  }`}>
                    {s.tag}
                  </span>
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-white">{s.title}</h3>
                <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">{s.desc}</p>

                {active && (
                  <div className="absolute inset-x-4 -bottom-px h-1 rounded-full bg-gradient-to-r from-[#baff00] to-emerald-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Interactive Step Visual Sandbox Display */}
        <div className="mt-8 relative overflow-hidden rounded-3xl border border-slate-700/80 bg-[#101728] p-6 sm:p-8 shadow-2xl">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 items-center">
            {/* Left: Step details & action */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#baff00]/15 border border-[#baff00]/30 px-3 py-1 text-xs font-black text-[#baff00]">
                <span>Phase {STEPS[activeStep].step} of 04</span>
              </div>
              <h3 className="mt-3 text-2xl sm:text-3xl font-black text-white">
                {STEPS[activeStep].title}
              </h3>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                {STEPS[activeStep].desc}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="rounded-xl bg-gradient-to-r from-[#baff00] to-lime-400 hover:from-lime-300 hover:to-lime-400 px-6 py-3 text-xs sm:text-sm font-black text-black shadow-lg shadow-[#baff00]/25 transition hover:scale-105"
                >
                  <span>Experience Step {STEPS[activeStep].step} Live →</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    const next = (activeStep + 1) % STEPS.length;
                    setActiveStep(next);
                    if (next === 3) fireConfetti();
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs font-bold text-slate-300 hover:text-white transition"
                >
                  Next Step ({activeStep === 3 ? "Restart" : `Step 0${activeStep + 2}`})
                </button>
              </div>
            </div>

            {/* Right: Rich Visual Mockup corresponding to current step */}
            <div className="rounded-2xl border border-slate-700 bg-[#0d1320] p-5 sm:p-6 shadow-inner relative overflow-hidden">
              {/* Step 0: Platform Selection Visual */}
              {activeStep === 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-bold text-slate-300">Platform Selector Preview:</span>
                    <span className="text-[11px] text-emerald-400 font-mono">1,000+ Services Available</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    {[
                      { name: "Instagram", badge: "From $0.002", icon: "instagram" },
                      { name: "TikTok", badge: "From $0.001", icon: "tiktok" },
                      { name: "YouTube", badge: "From $0.05", icon: "youtube" },
                      { name: "Telegram", badge: "From $0.003", icon: "telegram" },
                    ].map((p, i) => (
                      <div
                        key={p.name}
                        className={`p-3 rounded-xl border text-center transition ${
                          i === 0
                            ? "border-[#baff00] bg-[#baff00]/15 text-white"
                            : "border-slate-800 bg-[#111827] text-slate-300"
                        }`}
                      >
                        <div className="flex justify-center mb-1.5">
                          <Social3DIcon platform={p.icon} size={26} glow={i === 0} />
                        </div>
                        <p className="text-xs font-black">{p.name}</p>
                        <span className="text-[10px] text-[#baff00] font-mono">{p.badge}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl bg-[#111827] border border-slate-800 p-3 text-xs text-slate-300 flex items-center justify-between">
                    <span>Selected: <strong>Instagram High Retention Non-Drop Followers</strong></span>
                    <span className="font-bold text-emerald-400">₨118 / 1k</span>
                  </div>
                </div>
              )}

              {/* Step 1: Link Paste Preview (No Passwords) */}
              {activeStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-bold text-slate-300">Target URL Validation:</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <span>🔒 Zero Password Required</span>
                    </span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400">Profile or Post URL:</label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value="https://instagram.com/mybrand.official"
                        className="w-full rounded-xl border border-[#baff00]/50 bg-[#111827] px-4 py-3 text-xs font-mono text-lime-300 outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <span>✓</span> Verified Target
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#111827] border border-slate-800 p-3 text-xs text-slate-400 flex items-start gap-2.5">
                    <span className="text-base text-amber-400">🛡️</span>
                    <span>We only require your public post or profile link. You will <strong>never</strong> be asked for your login or password.</span>
                  </div>
                </div>
              )}

              {/* Step 2: Automated Dispatch Preview */}
              {activeStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-bold text-slate-300">API Dispatch Status:</span>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">Node #7 Active (42ms)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl border border-slate-800 bg-[#111827] p-3">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Queue Latency</span>
                      <p className="text-base font-black text-emerald-400 font-mono mt-0.5">38ms</p>
                    </div>
                    <div className="rounded-xl border border-[#baff00]/30 bg-[#baff00]/10 p-3">
                      <span className="text-[10px] text-[#baff00] uppercase font-bold">Auto Start</span>
                      <p className="text-base font-black text-white font-mono mt-0.5">0–15 Min</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-[#111827] p-3">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Protocol</span>
                      <p className="text-base font-black text-[#baff00] font-mono mt-0.5">TLS 1.3</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#111827] border border-slate-800 p-3 text-xs text-slate-300 font-mono">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>{">"} Dispatched order #928492 to High-Speed Cluster</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Surge & Celebration Preview */}
              {activeStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-bold text-slate-300">Live Delivery Surge:</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <span>🎉 Goal Achieved (100%)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-[#baff00]/15 via-emerald-500/15 to-lime-500/15 border border-[#baff00]/30 p-4">
                    <div>
                      <p className="text-xs text-slate-300 font-bold">Total Delivered:</p>
                      <p className="text-2xl font-black text-white tracking-tight mt-0.5">+10,000 Verified Followers</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fireConfetti()}
                      className="rounded-xl bg-gradient-to-r from-[#baff00] to-lime-400 px-4 py-2 text-xs font-black text-black shadow-lg hover:from-lime-300 hover:to-lime-400 transition cursor-pointer"
                    >
                      Trigger Confetti 🎉
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div className="rounded-xl bg-[#111827] border border-slate-800 p-3">
                      <span className="text-slate-400">Refill Status:</span>
                      <p className="font-bold text-white mt-0.5">30-Day Auto Guarantee Active</p>
                    </div>
                    <div className="rounded-xl bg-[#111827] border border-slate-800 p-3">
                      <span className="text-slate-400">Balance Spent:</span>
                      <p className="font-bold text-[#baff00] mt-0.5">₨236 ($0.84)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
