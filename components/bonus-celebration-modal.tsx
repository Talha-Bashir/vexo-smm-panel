"use client";

import { useEffect, useRef } from "react";

interface BonusCelebrationModalProps {
  isOpen: boolean;
  amount: number;
  onClose: () => void;
  onOrderNow: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  shape: "rect" | "circle" | "strip";
  opacity: number;
  decay: number;
}

const CELEBRATION_COLORS = [
  "#baff00", // VEXARO Cyber Lime
  "#00ffcc", // Electric Teal
  "#ffd700", // Bright Gold
  "#ff1493", // Deep Pink
  "#00bfff", // Sky Blue
  "#9b5de5", // Electric Purple
  "#ff5722", // Neon Orange
  "#ffffff", // Crisp White
];

export default function BonusCelebrationModal({
  isOpen,
  amount = 50,
  onClose,
  onOrderNow,
}: BonusCelebrationModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Play synthesized party popper sound & fanfare chime (Web Audio API)
  useEffect(() => {
    if (!isOpen) return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();

      // Party Popper "POP!" Sound (rapid pitch bend + noise burst)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);

      // Festive Fanfare Chime (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const noteOsc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        noteOsc.type = "sine";
        noteOsc.frequency.setValueAtTime(freq, ctx.currentTime + 0.1 + idx * 0.08);

        noteGain.gain.setValueAtTime(0, ctx.currentTime + 0.1 + idx * 0.08);
        noteGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.13 + idx * 0.08);
        noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55 + idx * 0.08);

        noteOsc.connect(noteGain);
        noteGain.connect(ctx.destination);
        noteOsc.start(ctx.currentTime + 0.1 + idx * 0.08);
        noteOsc.stop(ctx.currentTime + 0.6 + idx * 0.08);
      });
    } catch {
      // Safe fallback if browser blocks autoplay or Web Audio is unavailable
    }
  }, [isOpen]);

  // 2. High-Performance Canvas Party Popper Confetti Particle System
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles: Particle[] = [];

    // Helper: spawn confetti burst from specific origin
    function createBurst(
      originX: number,
      originY: number,
      minAngle: number,
      maxAngle: number,
      count: number,
      speedMin = 14,
      speedMax = 24
    ) {
      for (let i = 0; i < count; i++) {
        const angle = (minAngle + Math.random() * (maxAngle - minAngle)) * (Math.PI / 180);
        const speed = speedMin + Math.random() * (speedMax - speedMin);
        const shapes: Particle["shape"][] = ["rect", "rect", "strip", "circle"];
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const color = CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)];

        particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: shape === "strip" ? 6 + Math.random() * 8 : 7 + Math.random() * 6,
          color,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 12,
          wobble: Math.random() * 10,
          wobbleSpeed: 0.1 + Math.random() * 0.1,
          shape,
          opacity: 1,
          decay: 0.003 + Math.random() * 0.005,
        });
      }
    }

    // Launch Wave 1: Left and Right Party Popper Cannons (immediate)
    createBurst(width * 0.12, height * 0.85, -80, -25, 75, 16, 26);
    createBurst(width * 0.88, height * 0.85, -155, -100, 75, 16, 26);

    // Launch Wave 2: Center Starburst (at t=300ms)
    const timer1 = window.setTimeout(() => {
      createBurst(width * 0.5, height * 0.45, 0, 360, 60, 8, 18);
    }, 300);

    // Launch Wave 3: Secondary Popper Rain (at t=750ms)
    const timer2 = window.setTimeout(() => {
      createBurst(width * 0.2, height * 0.8, -75, -35, 50, 14, 22);
      createBurst(width * 0.8, height * 0.8, -145, -105, 50, 14, 22);
    }, 750);

    // Animation Loop with Physics & Gravity
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Physics updates
        p.vx *= 0.985; // Air drag
        p.vy *= 0.985;
        p.vy += 0.38; // Gravity
        p.x += p.vx + Math.sin(p.wobble) * 1.2;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.wobble += p.wobbleSpeed;
        p.opacity -= p.decay;

        if (p.opacity <= 0 || p.y > height + 50) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;

        const wobbleScale = Math.cos(p.wobble);

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, (-p.size / 2) * wobbleScale, p.size, p.size * wobbleScale);
        } else if (p.shape === "strip") {
          ctx.fillRect(-p.size, (-p.size * 0.35) * wobbleScale, p.size * 2, p.size * 0.7 * wobbleScale);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (particles.length > 0) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer1);
      clearTimeout(timer2);
      cancelAnimationFrame(animId);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Confetti Celebration Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[60] h-full w-full"
      />

      {/* Celebratory Modal Card */}
      <div className="relative z-[70] w-full max-w-lg rounded-3xl border-2 border-[#baff00]/50 bg-gradient-to-b from-[#11221e] via-[#0d1719] to-[#070e10] p-6 sm:p-8 text-center shadow-[0_0_80px_rgba(186,255,0,0.25)] animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-44 w-72 rounded-full bg-[#baff00]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 right-0 h-32 w-32 rounded-full bg-[#00ffcc]/10 blur-2xl" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
          title="Close celebration"
          aria-label="Close celebration modal"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Top Celebratory Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#baff00]/40 bg-[#baff00]/15 px-3.5 py-1 text-xs font-black uppercase tracking-widest text-[#baff00] shadow-[0_0_15px_rgba(186,255,0,0.3)] animate-pulse">
          <span>🎉</span>
          <span>CONGRATULATIONS!</span>
          <span>🎉</span>
        </div>

        {/* Party Popper Hero Icon with Bounce & Glow */}
        <div className="mx-auto mt-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-[#baff00] via-[#89f500] to-[#00ffcc] text-4xl shadow-[0_0_40px_rgba(186,255,0,0.5)] transform hover:scale-105 transition">
          <span className="select-none filter drop-shadow">🎉</span>
        </div>

        {/* Headline */}
        <h2 className="mt-5 text-2xl sm:text-3xl font-black tracking-tight text-white">
          Rs. {amount} Bonus Credited!
        </h2>

        <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
          Your <strong className="text-[#baff00]">VEXARO</strong> promotional bonus credit is active and deposited into your wallet. Enjoy boosting your social presence!
        </p>

        {/* Balance Showcase Box */}
        <div className="mt-5 rounded-2xl border border-[#baff00]/30 bg-[#baff00]/10 p-4 text-center shadow-inner">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Promotional Wallet Balance
          </p>
          <div className="mt-1 flex items-baseline justify-center gap-1.5">
            <span className="text-3xl sm:text-4xl font-black text-[#baff00] tracking-tight">
              ₨{amount.toFixed(2)}
            </span>
            <span className="text-sm font-bold text-slate-300">PKR</span>
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Active &amp; Ready to Spend</span>
          </div>
        </div>

        {/* Perks / Explanations */}
        <div className="mt-5 space-y-2 text-left text-xs">
          <div className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
            <span className="text-base leading-none">⚡</span>
            <div>
              <p className="font-bold text-white">100% Usable on All Services</p>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                Spend on Instagram followers/likes, TikTok views, YouTube watchtime, or Telegram growth.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
            <span className="text-base leading-none">🎯</span>
            <div>
              <p className="font-bold text-white">Automatically Deducted First</p>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                Bonus credit is used before your real deposited cash whenever you place an order.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
            <span className="text-base leading-none">🔒</span>
            <div>
              <p className="font-bold text-white">Promotional Growth Credit</p>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                Credit cannot be cashed out or transferred. Guaranteed non-withdrawable promotional funds.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={onOrderNow}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#baff00] py-3.5 px-5 text-sm font-black text-[#07100f] shadow-[0_0_30px_rgba(186,255,0,0.35)] hover:bg-[#d2ff5a] hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
          >
            <span>🚀 Start Placing Orders (Spend Bonus)</span>
            <span>→</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/5 py-3 px-4 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            Explore Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
