"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* ---------------- TYPES ---------------- */

export type PlatformTheme = "dark" | "light" | "midnight" | "purple";

export const THEME_OPTIONS: { id: PlatformTheme; name: string; icon: string; dot: string }[] = [
  { id: "dark", name: "Cyber Dark", icon: "⚡", dot: "#baff00" },
  { id: "light", name: "Clean Light", icon: "☀️", dot: "#10b981" },
  { id: "midnight", name: "Midnight Navy", icon: "🌌", dot: "#38bdf8" },
  { id: "purple", name: "Neon Purple", icon: "🔮", dot: "#c084fc" },
];

type Service = {
  service: number;
  name: string;
  type: string;
  category: string;
  rate: string;
  rate_usd?: number;
  rate_pkr?: number;
  base_rate_usd?: number;
  min: number;
  max: number;
  desc?: string;
  refill?: boolean;
  average_time?: string;
};

/* ---------------- SVG ICONS ---------------- */

function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (name) {
    case "bolt":
      return (
        <svg {...common}>
          <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z" />
          <path d="m8.5 12 2.2 2.2 4.8-5" />
        </svg>
      );
    case "rocket":
      return (
        <svg {...common}>
          <path d="M14 4c2.8-.8 5.3-.7 6.8-.1.6 1.5.7 4-.1 6.8-1.2 4.2-4.5 7.4-8.7 8.7l-3.3-3.3c1.3-4.2 4.5-7.5 8.7-8.7Z" />
          <path d="m8.7 16.1-4.4.7.7-4.4" />
          <circle cx="15.8" cy="8.2" r="1.7" />
          <path d="M7.4 19.4 4.6 22" />
        </svg>
      );
    case "code":
      return (
        <svg {...common}>
          <path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" />
        </svg>
      );
    case "globe":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="m12 3 1.3 5.7L19 10l-5.7 1.3L12 17l-1.3-5.7L5 10l5.7-1.3L12 3Z" />
          <path d="m19 16 .5 2.5L22 19l-2.5.5L19 22l-.5-2.5L16 19l2.5-.5L19 16Z" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    case "chevronDown":
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H20v14H5.5A2.5 2.5 0 0 1 3 16.5v-9Z" />
          <path d="M20 9h-4a2 2 0 0 0 0 4h4" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 5 5" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.4 7.8c.4-.4 1-.4 1.4.1l1 1.3c.3.4.3.8 0 1.2l-.5.6c.8 1.5 1.7 2.4 3.2 3.2l.6-.5c.4-.3.8-.3 1.2 0l1.3 1c.5.4.5 1 .1 1.4l-.6.6c-.5.5-1.3.7-2 .4-3.4-1.3-5.9-3.8-7.2-7.2-.3-.7-.1-1.5.4-2l.6-.6Z" />
        </svg>
      );
    case "telegram":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="m21.5 4.5-3 14.2c-.2 1-1 1.3-1.8.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2l-11 6.9-4.7-1.5c-1-.3-1-1 .2-1.5L20 3.2c.8-.3 1.7.2 1.5 1.3Z" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      );
    case "x":
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case "eye":
      return (
        <svg {...common}>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "eyeOff":
      return (
        <svg {...common}>
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" x2="22" y1="2" y2="22" />
        </svg>
      );
    case "headset":
      return (
        <svg {...common}>
          <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
          <path d="M4 14h3v5H5.5A1.5 1.5 0 0 1 4 17.5V14Z" />
          <path d="M20 14h-3v5h1.5a1.5 1.5 0 0 0 1.5-1.5V14Z" />
          <path d="M17 19c-1 1.3-2.6 2-5 2" />
        </svg>
      );
    case "arrowRight":
      return (
        <svg {...common}>
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

/* ---------------- BRAND MARK ---------------- */

function BrandMark() {
  return (
    <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(186,255,0,0.35)] border border-[#baff00]/30 group-hover:border-[#baff00]/60 transition-all duration-300">
      <img
        src="/logo.png"
        alt="VEXARO SMM"
        className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-300"
      />
    </div>
  );
}

/* ---------------- PLATFORMS DATA (MARQUEE) ---------------- */

const MARQUEE_NETWORKS = [
  { name: "Instagram", badge: "Followers & Likes", color: "#e1306c" },
  { name: "TikTok", badge: "Views & Saves", color: "#00f2fe" },
  { name: "YouTube", badge: "Watchtime & Subs", color: "#ff0000" },
  { name: "Telegram", badge: "Members & Posts", color: "#229ed9" },
  { name: "X (Twitter)", badge: "Retweets & Votes", color: "#ffffff" },
  { name: "Spotify", badge: "Plays & Followers", color: "#1db954" },
  { name: "Discord", badge: "Server Members", color: "#5865f2" },
  { name: "Facebook", badge: "Page Likes & Shares", color: "#1877f2" },
];

/* ---------------- GLOBAL PAYMENT BADGES ---------------- */

const PAYMENT_METHODS = [
  { name: "Visa", icon: "💳", color: "text-blue-400" },
  { name: "Mastercard", icon: "💳", color: "text-red-400" },
  { name: "Apple Pay", icon: "", color: "text-slate-100" },
  { name: "Google Pay", icon: "G", color: "text-emerald-400" },
  { name: "Binance Pay", icon: "🟡", color: "text-amber-400" },
  { name: "USDT / Crypto", icon: "₮", color: "text-teal-400" },
  { name: "Payeer", icon: "P", color: "text-cyan-400" },
  { name: "SadaPay", icon: "⚡", color: "text-teal-300" },
  { name: "JazzCash", icon: "📱", color: "text-amber-500" },
  { name: "Easypaisa", icon: "📱", color: "text-green-400" },
];

/* ---------------- PLATFORM BADGES HELPER ---------------- */

function getPlatformName(cat: string, name: string): string {
  const text = `${cat} ${name}`.toLowerCase();
  if (text.includes("instagram")) return "Instagram";
  if (text.includes("tiktok")) return "TikTok";
  if (text.includes("youtube")) return "YouTube";
  if (text.includes("facebook") || /\bfb\b/.test(text)) return "Facebook";
  if (text.includes("telegram")) return "Telegram";
  if (text.includes("whatsapp")) return "WhatsApp";
  if (text.includes("spotify")) return "Spotify";
  if (text.includes("discord")) return "Discord";
  if (text.includes("twitter") || text.includes("x ")) return "X / Twitter";
  return "Other";
}

/* ---------------- FAQ DATA ---------------- */

const FAQ_ITEMS = [
  {
    q: "What is VEXARO SMM Panel and how does it work?",
    a: "VEXARO SMM is the world's leading, high-speed automated social media marketing panel. We connect your social profiles directly to high-capacity delivery networks to accelerate your followers, likes, views, comments, and engagement within minutes at direct wholesale rates.",
  },
  {
    q: "Are these services safe for my social media accounts?",
    a: "100% Safe. We never ask for your account password—only your public profile or post URL is needed. All services comply with platform safety guidelines and use organic delivery pacing to ensure zero risk to your accounts.",
  },
  {
    q: "How long does it take for my order to start delivery?",
    a: "Virtually all orders begin processing automatically within 0 to 15 minutes after submission. Our automated API queue handles requests 24/7 without manual intervention, giving you instant real-time progress.",
  },
  {
    q: "What payment methods are supported on VEXARO SMM?",
    a: "We support verified local and global payment methods including Visa, Mastercard, Apple Pay, Google Pay, Binance Pay, USDT/Crypto, Payeer, SadaPay, JazzCash, Easypaisa, and direct Bank Wire Transfers.",
  },
  {
    q: "What happens if an order drops or fails to complete?",
    a: "We guarantee money-back wallet protection. If an order cannot be completed or experiences drops, 100% of the remaining charge is automatically credited back to your VEXARO wallet balance. Guaranteed services also include free 30-day refills.",
  },
];

function renderFormattedAnnouncement(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split("\n").map((line, i) => {
    const parts = line.split(urlRegex);
    return (
      <p key={i} className={line.trim() === "" ? "h-2" : "leading-relaxed"}>
        {parts.map((part, j) => {
          if (part.match(urlRegex)) {
            return (
              <a
                key={j}
                href={part}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-[#baff00] underline hover:text-[#d2ff5a] transition break-all inline-flex items-center gap-1"
              >
                <span>{part}</span>
                <span className="text-[10px]">↗</span>
              </a>
            );
          }
          return <span key={j}>{part}</span>;
        })}
      </p>
    );
  });
}

function extractFirstAnnouncementUrl(text: string): string | null {
  const match = text.match(/(https?:\/\/[^\s]+)/);
  return match ? match[0] : null;
}

/* ---------------- MAIN COMPONENT ---------------- */

export default function LandingPage() {
  // Navigation & Mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  // System Announcements State
  const [announcements, setAnnouncements] = useState<{ id: string; title: string; message: string; createdAt: string }[]>([]);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<{ id: string; title: string; message: string; createdAt: string } | null>(null);
  const [topBannerDismissed, setTopBannerDismissed] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<PlatformTheme>("dark");
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = (localStorage.getItem("vexo_platform_theme") || document.documentElement.getAttribute("data-theme") || "dark") as PlatformTheme;
      const valid = ["dark", "light", "midnight", "purple"].includes(stored) ? stored : "dark";
      setCurrentTheme(valid);
      document.documentElement.setAttribute("data-theme", valid);
    } catch {}
  }, []);

  const selectTheme = (theme: PlatformTheme) => {
    setCurrentTheme(theme);
    try {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("vexo_platform_theme", theme);
    } catch {}
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Services Catalog Preview State
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("All");

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Check if session exists on load
  useEffect(() => {
    try {
      if (typeof document !== "undefined") {
        const cookies = document.cookie;
        if (cookies.includes("vexo_session")) {
          setHasSession(true);
        }
      }
      if (typeof window !== "undefined") {
        const dismissed = sessionStorage.getItem("vexo_top_banner_dismissed");
        if (dismissed === "1") setTopBannerDismissed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  function handleDismissTopBanner() {
    setTopBannerDismissed(true);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("vexo_top_banner_dismissed", "1");
      }
    } catch {}
  }

  // Fetch Services for preview catalog
  useEffect(() => {
    async function loadPreviewServices() {
      try {
        setLoadingServices(true);
        const res = await fetch("/api/services", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.services)) {
          setServices(data.services);
        }
      } catch (err) {
        console.error("Failed to load services preview:", err);
      } finally {
        setLoadingServices(false);
      }
    }
    loadPreviewServices();
  }, []);

  // Fetch Announcements
  useEffect(() => {
    async function loadAnnouncements() {
      try {
        const res = await fetch("/api/announcements", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && Array.isArray(data.announcements)) {
          setAnnouncements(data.announcements);
        }
      } catch (err) {
        console.error("Failed to load announcements:", err);
      }
    }
    loadAnnouncements();
  }, []);


  // Filtered Services for Catalog Section
  const filteredCatalogServices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return services.filter((s) => {
      const platform = getPlatformName(s.category, s.name);
      const matchesPlatform =
        selectedPlatform === "All" ||
        platform.toLowerCase() === selectedPlatform.toLowerCase();
      const matchesSearch =
        !q ||
        `${s.service} ${s.name} ${s.category} ${platform}`
          .toLowerCase()
          .includes(q);
      return matchesPlatform && matchesSearch;
    });
  }, [services, searchQuery, selectedPlatform]);

  const previewList = useMemo(() => {
    return filteredCatalogServices.slice(0, 16);
  }, [filteredCatalogServices]);

  const currentThemeOption = useMemo(() => {
    return THEME_OPTIONS.find((t) => t.id === currentTheme) || THEME_OPTIONS[0];
  }, [currentTheme]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#070d0d] font-sans text-white selection:bg-[#baff00] selection:text-[#07100f]">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden hero-ambient-glow">
        <div className="absolute -left-32 top-10 h-[clamp(16rem,30vw,32rem)] w-[clamp(16rem,30vw,32rem)] rounded-full bg-[#baff00]/5 blur-[120px]" />
        <div className="absolute right-0 top-1/4 h-[clamp(20rem,35vw,36rem)] w-[clamp(20rem,35vw,36rem)] rounded-full bg-[#00ffcc]/4 blur-[140px]" />
        <div className="absolute bottom-10 left-1/3 h-[clamp(14rem,25vw,28rem)] w-[clamp(14rem,25vw,28rem)] rounded-full bg-[#baff00]/4 blur-[130px]" />
      </div>

      {/* ---------------- 0. TOP ANNOUNCEMENT BAR (WHATSAPP CHANNEL & LIVE SITE) ---------------- */}
      {!topBannerDismissed && (
        <div className="relative z-50 w-full border-b border-emerald-500/20 bg-[#071914] px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-emerald-300 animate-in fade-in duration-200">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-bold text-white shrink-0 text-[11px] sm:text-xs">📢 Updates:</span>
              {announcements.length > 0 ? (
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => {
                    setSelectedAnnouncement(announcements[0]);
                    setAnnouncementModalOpen(true);
                  }}
                  className="font-bold text-lime-400 hover:text-white hover:underline transition text-left cursor-pointer truncate text-[11px] sm:text-xs min-w-0"
                >
                  <span className="truncate">{announcements[0].title}</span>
                  <span className="ml-1.5 hidden sm:inline-block rounded bg-lime-400/20 px-1.5 py-0.5 text-[9px] font-black text-[#baff00] uppercase">VIEW NOTICE</span>
                </button>
              ) : (
                <span className="truncate text-[11px] sm:text-xs text-slate-300">Join our WhatsApp Channel for daily discounts &amp; live platform status</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] sm:text-xs font-black text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black transition"
              >
                <Icon name="whatsapp" size={12} />
                <span className="hidden sm:inline">Join WhatsApp Channel</span>
                <span className="sm:hidden">WhatsApp</span>
              </a>
              <span className="text-slate-600 hidden md:inline">•</span>
              <a
                href="https://vexarosmm.com/"
                target="_blank"
                rel="noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition font-mono text-[11px]"
                title="Official Website Link"
              >
                <Icon name="globe" size={13} />
                <span>vexarosmm.com</span>
              </a>
              <button
                type="button"
                suppressHydrationWarning
                onClick={handleDismissTopBanner}
                className="rounded p-1 text-slate-400 hover:text-white hover:bg-white/10 transition shrink-0 ml-1"
                title="Dismiss announcement bar"
                aria-label="Dismiss Announcement Bar"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 1. NAVBAR (HEADER) ---------------- */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#070d0d]/90 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-[clamp(1rem,3vw,2rem)]">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
              <BrandMark />
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white group-hover:text-[#baff00] transition whitespace-nowrap">
                VEXARO <span className="text-[#baff00]">SMM</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm font-semibold text-slate-300">
            <a href="#services" className="transition hover:text-[#baff00]">
              Services
            </a>
            <a href="#features" className="transition hover:text-[#baff00]">
              Features
            </a>
            <a href="#how-it-works" className="transition hover:text-[#baff00]">
              How It Works
            </a>
            <a href="#faq" className="transition hover:text-[#baff00]">
              FAQ
            </a>
            <a href="#updates" className="transition hover:text-[#baff00]">
              Updates
            </a>
            <Link href="/dashboard" className="transition hover:text-[#baff00]">
              API Docs
            </Link>
          </nav>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* 4-Theme Selector Dropdown */}
            <div className="relative" ref={themeMenuRef}>
              <button
                type="button"
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 sm:px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-white/30 shrink-0 cursor-pointer"
                title="Choose Theme"
                aria-label="Choose Theme"
              >
                <span>{currentThemeOption.icon}</span>
                <span className="hidden md:inline font-bold">{currentThemeOption.name}</span>
                <Icon name="chevronDown" size={12} className="text-slate-400" />
              </button>

              {themeMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/10 bg-[#0d1617] p-1.5 shadow-2xl z-50 animate-in fade-in duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Select Theme
                  </div>
                  {THEME_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        selectTheme(t.id);
                        setThemeMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-bold transition cursor-pointer ${
                        currentTheme === t.id
                          ? "bg-white/15 text-white"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{t.icon}</span>
                        <span>{t.name}</span>
                      </div>
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: t.dot }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-xl bg-[#baff00] px-4 py-2 text-xs sm:text-sm font-black text-[#07100f] shadow-[0_0_20px_rgba(186,255,0,0.25)] transition hover:bg-[#d2ff5a] hover:scale-105 whitespace-nowrap shrink-0"
            >
              <Icon name="bolt" size={15} />
              <span>Open Panel</span>
            </Link>
            {hasSession ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs sm:text-sm font-bold text-white transition hover:bg-white/20 whitespace-nowrap shrink-0"
              >
                <span>Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs sm:text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/10 whitespace-nowrap shrink-0"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs sm:text-sm font-bold text-white transition hover:bg-white/10 whitespace-nowrap shrink-0"
                >
                  <span>Sign Up</span>
                  <span className="text-[11px]">→</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Theme Cycle (< 640px) & Hamburger Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => {
                const idx = THEME_OPTIONS.findIndex((t) => t.id === currentTheme);
                const next = THEME_OPTIONS[(idx + 1) % THEME_OPTIONS.length].id;
                selectTheme(next);
              }}
              className="flex sm:hidden h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#121b1d] text-slate-300"
              title={`Theme: ${currentThemeOption.name} (Tap to change)`}
              aria-label="Cycle Theme"
            >
              <span className="text-base">{currentThemeOption.icon}</span>
            </button>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#121b1d] text-slate-300"
              aria-label="Toggle navigation menu"
            >
              <Icon name={mobileMenuOpen ? "x" : "menu"} size={20} />
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Dropdown Sheet */}
        {mobileMenuOpen && (
          <div className="border-b border-white/10 bg-[#0d1617] px-4 py-6 lg:hidden">
            <nav className="flex flex-col gap-4 text-sm font-semibold text-slate-300">
              <a
                href="#services"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#baff00]"
              >
                Services Catalog
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#baff00]"
              >
                Platform Features
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#baff00]"
              >
                How It Works
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#baff00]"
              >
                FAQ
              </a>
              <a
                href="#updates"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#baff00]"
              >
                System Updates
              </a>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#baff00]"
              >
                API Documentation
              </Link>
            </nav>
            <div className="mt-6 flex flex-col gap-3 pt-4 border-t border-white/10">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#baff00] py-3 text-center text-sm font-black text-[#07100f] shadow-[0_0_20px_rgba(186,255,0,0.3)]"
              >
                <span>⚡ Launch Antigravity New Order</span>
              </Link>
              {hasSession ? (
                <Link
                  href="/dashboard"
                  className="w-full rounded-xl border border-white/20 bg-white/10 py-2.5 text-center text-sm font-bold text-white"
                >
                  Go to Dashboard →
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-center text-sm font-bold text-white"
                  >
                    Login to Account
                  </Link>
                  <Link
                    href="/signup"
                    className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-center text-sm font-bold text-white"
                  >
                    Create Free Account
                  </Link>
                </>
              )}

              {/* 4 Theme Options in Mobile Sheet */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {THEME_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTheme(t.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition ${
                      currentTheme === t.id
                        ? "border-[#baff00] bg-white/15 text-white"
                        : "border-white/10 bg-white/5 text-slate-300"
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>

              {/* Official WhatsApp Channel & Live Link */}
              <a
                href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#25d366]/40 bg-[#25d366]/15 py-2.5 text-center text-xs font-bold text-[#25d366] transition hover:bg-[#25d366] hover:text-[#07100f]"
              >
                <Icon name="whatsapp" size={16} />
                <span>Join Official WhatsApp Channel</span>
              </a>

              <a
                href="https://vexarosmm.com/"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2 text-center text-[11px] font-mono text-slate-300 transition hover:text-[#baff00]"
              >
                <Icon name="globe" size={13} className="text-[#baff00]" />
                <span>vexarosmm.com</span>
              </a>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 w-full max-w-full overflow-x-hidden">
        {/* ---------------- 2. HERO SECTION (FLUID RESPONSIVE) ---------------- */}
        <section className="relative w-full px-[clamp(1rem,4vw,2.5rem)] pt-[clamp(2rem,5vw,4.5rem)] pb-[clamp(3rem,6vw,5.5rem)]">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-[clamp(2rem,4vw,3.5rem)] lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              {/* Left Column: Clean Headline & Value Proposition */}
              <div className="w-full min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#baff00]">
                  <Icon name="spark" size={14} />
                  <span>The World&apos;s #1 SMM Automation Platform</span>
                </div>

                <h1 className="mt-5 text-fluid-hero font-black tracking-tight text-white leading-tight">
                  Accelerate Your Social Growth at{" "}
                  <span className="text-[#baff00]">
                    Wholesale Rates
                  </span>
                </h1>

                <p className="mt-4 text-fluid-body font-medium text-slate-300 max-w-2xl leading-relaxed">
                  The fastest, most reliable SMM panel for Instagram, TikTok, YouTube, WhatsApp &amp; Telegram. Instant automated delivery with 24/7 human support.
                </p>

                {/* Minimalist Trust Features */}
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-bold">✓</span> No Passwords Required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-bold">✓</span> 0 - 15m Instant Start
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-bold">✓</span> 24/7 WhatsApp Support
                  </span>
                </div>

                {/* Supporting CTAs (Clean, focused actions) */}
                <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Link
                    href={hasSession ? "/dashboard" : "/signup"}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#baff00] px-7 py-3.5 text-sm font-black text-[#07100f] shadow-[0_0_24px_rgba(186,255,0,0.25)] transition hover:bg-[#d2ff5a] hover:scale-105"
                  >
                    <span>{hasSession ? "Open Customer Dashboard" : "🚀 Get Started Free"}</span>
                    <Icon name="arrowRight" size={16} />
                  </Link>
                  <a
                    href="#services"
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/10"
                  >
                    <span>View 500+ Services &amp; Rates ↓</span>
                  </a>
                </div>
              </div>

              {/* Right Column: Clean Client Access Portal */}
              <div className="w-full max-w-[min(100%,28rem)] mx-auto lg:max-w-none">
                <div className="rounded-3xl border border-white/10 bg-[#10191b]/95 p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
                  <div className="border-b border-white/10 pb-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#baff00]/10 px-2.5 py-1 text-[11px] font-bold text-[#baff00]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#baff00] animate-pulse" />
                      Client Portal
                    </span>
                    <h2 className="mt-2 text-xl font-black text-white">
                      {hasSession ? "Welcome Back to VEXARO" : "Instant Account Access"}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {hasSession
                        ? "Manage active orders, deposit balance & view live rates"
                        : "Sign in or create a free account to place automated orders"}
                    </p>
                  </div>

                  <div className="mt-5 space-y-3">
                    {hasSession ? (
                      <Link
                        href="/dashboard"
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#baff00] py-3.5 text-sm font-black text-[#07100f] shadow-[0_0_24px_rgba(186,255,0,0.25)] transition hover:bg-[#d2ff5a]"
                      >
                        <span>Go to Dashboard →</span>
                      </Link>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#baff00] py-3.5 text-sm font-black text-[#07100f] shadow-[0_0_24px_rgba(186,255,0,0.25)] transition hover:bg-[#d2ff5a]"
                        >
                          <span>Sign In to Account →</span>
                        </Link>
                        <Link
                          href="/signup"
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3 text-xs font-bold text-white transition hover:bg-white/10"
                        >
                          <span>Create Free Account</span>
                        </Link>
                      </>
                    )}

                    <div className="rounded-xl border border-white/5 bg-[#0b1315] p-3 text-center">
                      <p className="text-[11px] font-bold text-slate-300">Accepted Gateways</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Easypaisa • JazzCash • SadaPay • Binance Pay (USDT)
                      </p>
                    </div>

                    <div className="pt-1 text-center text-xs text-slate-400 flex items-center justify-between">
                      <Link
                        href="/forgot-password"
                        className="hover:text-[#baff00] transition text-[11px]"
                      >
                        Forgot password?
                      </Link>
                      <a
                        href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q"
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-[#25d366] hover:underline inline-flex items-center gap-1 text-[11px]"
                      >
                        <Icon name="whatsapp" size={13} />
                        <span>WhatsApp Channel</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- 3. LIVE STATISTICS COUNTER BANNER (AUTO-FIT GRID) ---------------- */}
        <section className="w-full border-y border-white/10 bg-[#0b1315]/80 py-[clamp(1.5rem,3.5vw,2.5rem)] backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-[clamp(1rem,3vw,2rem)]">
            <div className="grid-fluid-stats">
              <div className="rounded-2xl border border-white/5 bg-[#10191b]/50 p-4 sm:p-5 text-center sm:text-left">
                <p className="text-fluid-h2 font-black text-[#baff00]">
                  1.8M+
                </p>
                <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-300">
                  Orders Completed
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-[#10191b]/50 p-4 sm:p-5 text-center sm:text-left">
                <p className="text-fluid-h2 font-black text-white">
                  52,000+
                </p>
                <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-300">
                  Active Clients
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-[#10191b]/50 p-4 sm:p-5 text-center sm:text-left">
                <p className="text-fluid-h2 font-black text-[#baff00]">
                  99.9%
                </p>
                <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-300">
                  Platform Uptime
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-[#10191b]/50 p-4 sm:p-5 text-center sm:text-left">
                <p className="text-fluid-h2 font-black text-white">
                  0.02s
                </p>
                <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-300">
                  Average Delivery Speed
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- 4. SUPPORTED PLATFORMS MARQUEE (SEAMLESS INFINITE TRACK) ---------------- */}
        <section className="w-full overflow-hidden border-b border-white/10 bg-[#070d0d] py-6">
          <div className="mb-3 text-center">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
              Supported Social Networks &amp; Streaming Platforms
            </span>
          </div>
          <div className="relative w-full overflow-hidden">
            {/* Fade masks */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-16 bg-gradient-to-r from-[#070d0d] to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-16 bg-gradient-to-l from-[#070d0d] to-transparent" />

            <div className="vexo-marquee-track flex gap-4 px-4">
              {[...MARQUEE_NETWORKS, ...MARQUEE_NETWORKS].map((network, index) => (
                <div
                  key={`${network.name}-${index}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#10191b] px-5 py-3 shrink-0 transition hover:border-[#baff00]/50"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: network.color }}
                  />
                  <div>
                    <p className="text-xs font-black text-white">{network.name}</p>
                    <p className="text-[10px] text-slate-400">{network.badge}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- 5. GLOBAL PAYMENT TRUST BADGES (FLEX-WRAP STRIP) ---------------- */}
        <section className="w-full border-b border-white/10 bg-[#0a1214] py-8 px-[clamp(1rem,3vw,2rem)]">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#baff00]">
                  Verified Secure Payments
                </span>
                <p className="mt-0.5 text-xs text-slate-400">
                  Instant automated wallet credits with 0% gateway deposit surcharge
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <div
                    key={method.name}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#10191b] px-3 py-1.5 text-xs font-bold text-slate-300"
                  >
                    <span>{method.icon}</span>
                    <span className={method.color}>{method.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- 6. VALUE PROPOSITION & FEATURES GRID (AUTO-FIT) ---------------- */}
        <section id="features" className="w-full px-[clamp(1rem,4vw,2.5rem)] py-[clamp(3rem,6vw,5rem)]">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <span className="rounded-full border border-lime-400/20 bg-lime-400/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#baff00]">
                Why Choose VEXARO SMM Panel
              </span>
              <h2 className="mt-4 text-fluid-h2 font-black tracking-tight text-white">
                Affordable Social Media Marketing Services &amp; Growth Solutions
              </h2>
              <p className="mx-auto mt-3 text-fluid-body text-slate-400 max-w-2xl">
                Engineered for creators, influencers, resellers, and digital marketing agencies who require fast speeds, wholesale rates, and automatic SMM panel delivery.
              </p>
            </div>

            <div className="mt-12 grid-fluid-cards">
              {/* Card 1 */}
              <div className="group rounded-3xl border border-white/10 bg-[#10191b] p-[clamp(1.25rem,2.5vw,2rem)] transition hover:border-[#baff00]/50 hover:bg-[#131f22]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-[#baff00] transition group-hover:bg-[#baff00] group-hover:text-[#07100f]">
                  <Icon name="globe" size={24} />
                </div>
                <h3 className="mt-5 text-fluid-h3 font-black text-white">
                  Empowering Global Reach
                </h3>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400">
                  Expand your brand authority across Instagram, TikTok, YouTube,
                  Facebook, Telegram &amp; X worldwide with targeted geo-regions.
                </p>
              </div>

              {/* Card 2 */}
              <div className="group rounded-3xl border border-white/10 bg-[#10191b] p-[clamp(1.25rem,2.5vw,2rem)] transition hover:border-[#baff00]/50 hover:bg-[#131f22]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-[#baff00] transition group-hover:bg-[#baff00] group-hover:text-[#07100f]">
                  <Icon name="spark" size={24} />
                </div>
                <h3 className="mt-5 text-fluid-h3 font-black text-white">
                  Explore Limitless Possibilities
                </h3>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400">
                  Over 1,000+ premium automated social services tailored for
                  influencers, digital agencies, and e-commerce stores.
                </p>
              </div>

              {/* Card 3 */}
              <div className="group rounded-3xl border border-white/10 bg-[#10191b] p-[clamp(1.25rem,2.5vw,2rem)] transition hover:border-[#baff00]/50 hover:bg-[#131f22]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-[#baff00] transition group-hover:bg-[#baff00] group-hover:text-[#07100f]">
                  <Icon name="code" size={24} />
                </div>
                <h3 className="mt-5 text-fluid-h3 font-black text-white">
                  Automated High-Speed API
                </h3>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400">
                  Enterprise-grade REST API with sub-second order dispatch,
                  automatic status webhooks, and 99.99% system uptime.
                </p>
              </div>

              {/* Card 4 */}
              <div className="group rounded-3xl border border-white/10 bg-[#10191b] p-[clamp(1.25rem,2.5vw,2rem)] transition hover:border-[#baff00]/50 hover:bg-[#131f22]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00]/10 text-[#baff00] transition group-hover:bg-[#baff00] group-hover:text-[#07100f]">
                  <Icon name="rocket" size={24} />
                </div>
                <h3 className="mt-5 text-fluid-h3 font-black text-white">
                  Instant Global Delivery
                </h3>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400">
                  Real-time automated processing starts in 0–15 minutes with
                  free 30-day refills and 24/7 human WhatsApp support.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- 7. "HOW IT WORKS" 4-STEP SECTION ---------------- */}
        <section
          id="how-it-works"
          className="w-full border-t border-white/10 bg-[#091113] px-[clamp(1rem,4vw,2.5rem)] py-[clamp(3rem,6vw,5rem)]"
        >
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <span className="rounded-full border border-lime-400/20 bg-lime-400/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#baff00]">
                Simple 4-Step Flow
              </span>
              <h2 className="mt-4 text-fluid-h2 font-black tracking-tight text-white">
                How VEXARO SMM Panel Works
              </h2>
              <p className="mx-auto mt-3 text-fluid-body text-slate-400 max-w-2xl">
                Start growing your channels in under 60 seconds with our streamlined workflow.
              </p>
            </div>

            <div className="mt-12 grid-fluid-cards">
              {/* Step 1 */}
              <div className="relative rounded-3xl border border-white/10 bg-[#10191b] p-[clamp(1.25rem,2.5vw,1.75rem)]">
                <span className="text-3xl font-black text-[#baff00]/30">01</span>
                <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#baff00]/10 text-[#baff00]">
                  <Icon name="spark" size={18} />
                </div>
                <h3 className="mt-4 text-base font-black text-white">
                  Start Your Journey
                </h3>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400">
                  Create your free VEXARO account in seconds. No complex verification
                  or passwords required.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative rounded-3xl border border-white/10 bg-[#10191b] p-[clamp(1.25rem,2.5vw,1.75rem)]">
                <span className="text-3xl font-black text-[#baff00]/30">02</span>
                <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#baff00]/10 text-[#baff00]">
                  <Icon name="wallet" size={18} />
                </div>
                <h3 className="mt-4 text-base font-black text-white">
                  Fund Your Account
                </h3>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400">
                  Secure local &amp; global payments: Visa, Mastercard, Apple Pay,
                  Crypto, SadaPay, JazzCash &amp; Easypaisa.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative rounded-3xl border border-white/10 bg-[#10191b] p-[clamp(1.25rem,2.5vw,1.75rem)]">
                <span className="text-3xl font-black text-[#baff00]/30">03</span>
                <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#baff00]/10 text-[#baff00]">
                  <Icon name="search" size={18} />
                </div>
                <h3 className="mt-4 text-base font-black text-white">
                  Select Your Package
                </h3>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400">
                  Choose from thousands of curated, high-retention services with
                  instant start times and refill guarantees.
                </p>
              </div>

              {/* Step 4 */}
              <div className="relative rounded-3xl border border-white/10 bg-[#10191b] p-[clamp(1.25rem,2.5vw,1.75rem)]">
                <span className="text-3xl font-black text-[#baff00]/30">04</span>
                <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#baff00]/10 text-[#baff00]">
                  <Icon name="rocket" size={18} />
                </div>
                <h3 className="mt-4 text-base font-black text-white">
                  Achieve Excellence
                </h3>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400">
                  Watch your engagement surge with real-time automated delivery
                  and automated wallet protection.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- 8. SEARCHABLE PUBLIC SERVICES PREVIEW TABLE ---------------- */}
        <section id="services" className="w-full px-[clamp(1rem,4vw,2.5rem)] py-[clamp(3rem,6vw,5rem)]">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <span className="rounded-full border border-lime-400/20 bg-lime-400/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#baff00]">
                  Live Wholesale Rates
                </span>
                <h2 className="mt-4 text-fluid-h2 font-black tracking-tight text-white">
                  Instagram, TikTok &amp; YouTube Growth Services
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Transparent wholesale pricing on the best and cheapest SMM panel. Direct USD ($) &amp; PKR (₨) rates with instant automated dispatch.
                </p>
              </div>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-[#baff00] px-6 py-3 text-xs sm:text-sm font-black text-[#07100f] shadow-[0_0_20px_rgba(186,255,0,0.18)] hover:bg-[#d2ff5a] transition self-start md:self-auto"
              >
                <span>Get Full Catalog Access</span>
                <span>→</span>
              </Link>
            </div>

            {/* Filter Pills & Auto-Scaling Search */}
            <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Platform Filter Buttons */}
              <div
                onWheel={(e) => {
                  if (e.deltaY !== 0) {
                    e.currentTarget.scrollLeft += e.deltaY;
                  }
                }}
                className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs font-bold touch-pan-x w-full md:w-auto"
              >
                {[
                  "All",
                  "Instagram",
                  "TikTok",
                  "YouTube",
                  "Facebook",
                  "Telegram",
                  "WhatsApp",
                  "Other",
                ].map((p) => (
                  <button
                    key={p}
                    type="button"
                    suppressHydrationWarning
                    onClick={() => setSelectedPlatform(p)}
                    className={`shrink-0 rounded-xl px-3.5 py-2 transition ${
                      selectedPlatform === p
                        ? "bg-[#baff00] text-[#07100f] shadow-[0_2px_12px_rgba(186,255,0,0.2)]"
                        : "border border-white/10 bg-[#121b1d] text-slate-400 hover:text-white"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Search Bar - Auto scales to container width */}
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  suppressHydrationWarning
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by ID, platform, or keyword..."
                  className="w-full rounded-xl border border-white/10 bg-[#121b1d] px-4 py-2.5 pl-9 text-white placeholder-slate-500 outline-none transition focus:border-[#baff00]"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Icon name="search" size={14} />
                </span>
              </div>
            </div>

            {/* Services Table Card with Horizontal Scroll Wrapper */}
            <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#10191b]">
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs text-slate-300">
                  <thead className="border-b border-white/10 bg-[#142022] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="py-4 px-4 sm:px-6">ID</th>
                      <th className="py-4 px-4 sm:px-6">Service Name</th>
                      <th className="py-4 px-4 sm:px-6">Price / 1K ($ USD)</th>
                      <th className="py-4 px-4 sm:px-6">Price (₨ PKR)</th>
                      <th className="py-4 px-4 sm:px-6">Min / Max</th>
                      <th className="py-4 px-4 sm:px-6">Speed</th>
                      <th className="py-4 px-4 sm:px-6 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {loadingServices ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <div className="inline-flex items-center gap-2">
                            <span className="h-4 w-4 rounded-full border-2 border-[#baff00] border-t-transparent animate-spin" />
                            <span>Loading live catalog...</span>
                          </div>
                        </td>
                      </tr>
                    ) : previewList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          No services matched your query. Try a different platform or keyword.
                        </td>
                      </tr>
                    ) : (
                      previewList.map((svc) => {
                        const usdRate = Number(svc.rate_usd ?? svc.base_rate_usd ?? (Number(svc.rate_pkr || svc.rate || 0) / 278));
                        const pkrRate = Number(svc.rate_pkr ?? svc.rate ?? (usdRate * 278)).toFixed(2);
                        return (
                          <tr
                            key={svc.service}
                            className="transition hover:bg-white/[0.03]"
                          >
                            <td className="py-3.5 px-4 sm:px-6 font-mono text-slate-400">
                              #{svc.service}
                            </td>
                            <td className="py-3.5 px-4 sm:px-6 font-bold text-white max-w-xs sm:max-w-md">
                              <span className="line-clamp-2">{svc.name}</span>
                            </td>
                            <td className="py-3.5 px-4 sm:px-6 font-bold text-[#baff00]">
                              ${usdRate.toFixed(4)}
                            </td>
                            <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-300">
                              ₨{pkrRate}
                            </td>
                            <td className="py-3.5 px-4 sm:px-6 text-slate-400 font-mono text-[11px]">
                              {svc.min} - {svc.max}
                            </td>
                            <td className="py-3.5 px-4 sm:px-6 text-slate-400 text-[11px]">
                              {svc.average_time || "0 - 15 min"}
                            </td>
                            <td className="py-3.5 px-4 sm:px-6 text-center">
                              <Link
                                href={`/dashboard?service=${svc.service}`}
                                className="inline-block rounded-lg bg-[#baff00] px-3.5 py-1.5 text-[11px] font-black text-[#07100f] hover:bg-[#d2ff5a] transition shadow-[0_2px_10px_rgba(186,255,0,0.15)]"
                              >
                                Order Now
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 bg-[#121b1d] p-4 text-xs text-slate-400">
                <span>
                  Showing <strong className="text-white">{previewList.length}</strong> of{" "}
                  <strong className="text-white">{services.length || "1,000+"}</strong> active services
                </span>
                <Link
                  href="/signup"
                  className="font-bold text-[#baff00] hover:underline"
                >
                  View all 1,000+ services inside dashboard →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- 9. INTERACTIVE FAQ ACCORDION ---------------- */}
        <section id="faq" className="w-full border-t border-white/10 bg-[#091113] px-[clamp(1rem,4vw,2.5rem)] py-[clamp(3rem,6vw,5rem)]">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <span className="rounded-full border border-lime-400/20 bg-lime-400/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#baff00]">
                Got Questions?
              </span>
              <h2 className="mt-4 text-fluid-h2 font-black tracking-tight text-white">
                Frequently Asked Questions About Our SMM Panel
              </h2>
              <p className="mt-3 text-fluid-body text-slate-400">
                Everything you need to know about VEXARO SMM Panel services, security, and wallet protection.
              </p>
            </div>

            <div className="mt-12 space-y-4">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={item.q}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-[#10191b] transition"
                  >
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between p-5 text-left text-sm sm:text-base font-bold text-white transition hover:text-[#baff00]"
                    >
                      <span>{item.q}</span>
                      <span
                        className={`ml-4 shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-[#baff00]" : "text-slate-400"
                        }`}
                      >
                        <Icon name="chevronDown" size={18} />
                      </span>
                    </button>
                    {isOpen && (
                      <div className="border-t border-white/5 px-5 pb-5 pt-3 text-xs sm:text-sm leading-relaxed text-slate-300">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------------- 10. LIVE UPDATES & SYSTEM STATUS ---------------- */}
        <section id="updates" className="w-full px-[clamp(1rem,4vw,2.5rem)] py-[clamp(2.5rem,5vw,4rem)]">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-3xl border border-white/10 bg-[#10191b] p-[clamp(1.25rem,3vw,2.5rem)]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-lime-400/25 bg-lime-400/10 px-3 py-1 text-xs font-bold text-[#baff00]">
                    <span className="h-2 w-2 rounded-full bg-[#baff00] animate-pulse" />
                    All Systems Fully Operational
                  </span>
                  <h3 className="mt-3 text-fluid-h3 font-black text-white">
                    VEXARO Real-Time Network Status
                  </h3>
                </div>
                <div className="text-xs text-slate-400">
                  Status: <strong className="text-[#baff00]">Live 99.9% Uptime</strong>
                </div>
              </div>

              {/* Broadcast Announcement If Available */}
              {announcements.length > 0 && (
                <div className="mt-6 rounded-2xl border border-lime-400/40 bg-gradient-to-r from-lime-400/10 via-[#10241b] to-transparent p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#baff00]">
                      <span className="text-base">📢</span>
                      <span>Official Network Broadcast</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(announcements[0].createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="mt-2 text-base sm:text-xl font-black text-white">
                    {announcements[0].title}
                  </h4>
                  <div className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
                    {announcements[0].message}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={() => {
                        setSelectedAnnouncement(announcements[0]);
                        setAnnouncementModalOpen(true);
                      }}
                      className="rounded-xl bg-[#baff00] px-4 py-2.5 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] transition"
                    >
                      Read Full Announcement
                    </button>
                    {extractFirstAnnouncementUrl(announcements[0].message) && (
                      <a
                        href={extractFirstAnnouncementUrl(announcements[0].message)!}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-[#25d366]/40 bg-[#25d366]/15 px-4 py-2.5 text-xs font-bold text-[#25d366] hover:bg-[#25d366] hover:text-[#07100f] transition inline-flex items-center gap-1.5"
                      >
                        <Icon name="whatsapp" size={14} />
                        <span>Join Channel</span>
                        <span>↗</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 grid-fluid-stats text-xs">
                <div className="rounded-2xl border border-white/5 bg-[#0a1110] p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">API Dispatcher</span>
                    <span className="text-[#baff00] font-bold">100% Operational</span>
                  </div>
                  <p className="mt-1 text-slate-500">Sub-second order forwarding</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-[#0a1110] p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Instagram Delivery</span>
                    <span className="text-[#baff00] font-bold">Normal (0-15m)</span>
                  </div>
                  <p className="mt-1 text-slate-500">Followers, Likes &amp; Views</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-[#0a1110] p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">TikTok Views &amp; Likes</span>
                    <span className="text-[#baff00] font-bold">Instant Start</span>
                  </div>
                  <p className="mt-1 text-slate-500">High speed auto execution</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-[#0a1110] p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">YouTube Services</span>
                    <span className="text-[#baff00] font-bold">Stable &amp; Verified</span>
                  </div>
                  <p className="mt-1 text-slate-500">Watchtime &amp; Subscribers active</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- 11. DIRECT WHATSAPP & TELEGRAM CTA BANNER ---------------- */}
        <section className="w-full px-[clamp(1rem,4vw,2.5rem)] pb-[clamp(3rem,6vw,5rem)]">
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-3xl border border-[#25d366]/30 bg-gradient-to-r from-[#0d2218] to-[#10191b] p-[clamp(1.5rem,4vw,3rem)]">
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#25d366]">
                    <Icon name="whatsapp" size={16} />
                    Direct Human Support
                  </span>
                  <h3 className="mt-2 text-fluid-h3 font-black text-white">
                    Need Custom Bulk Pricing or Instant Deposit Approval?
                  </h3>
                  <p className="mt-2 text-sm text-slate-300 max-w-xl">
                    Message <strong>VEXARO SMM Admin</strong> directly on WhatsApp or Telegram. We verify bank receipts in minutes and configure custom reseller discounts.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <a
                    href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-[#25d366] bg-[#25d366]/20 px-5 py-3.5 text-sm font-black text-[#25d366] shadow-[0_0_24px_rgba(37,211,102,0.25)] transition hover:bg-[#25d366] hover:text-[#07100f]"
                  >
                    <Icon name="whatsapp" size={18} />
                    <span>WhatsApp Channel</span>
                  </a>
                  <a
                    href="https://wa.me/923176437013"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#25d366] px-5 py-3.5 text-sm font-black text-[#07100f] shadow-[0_0_24px_rgba(37,211,102,0.3)] transition hover:bg-[#20ba5a]"
                  >
                    <Icon name="whatsapp" size={18} />
                    <span>Chat on WhatsApp (+92 317 6437013)</span>
                  </a>
                  <a
                    href="https://t.me/VexaroSMMAdmin"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#229ed9] px-5 py-3.5 text-sm font-black text-white shadow-[0_0_24px_rgba(34,158,217,0.3)] transition hover:bg-[#1f8ec4]"
                  >
                    <Icon name="telegram" size={18} />
                    <span>Telegram</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------- 13. FOOTER ---------------- */}
      <footer className="w-full border-t border-white/10 bg-[#050a0a] px-[clamp(1rem,4vw,2.5rem)] py-12 text-xs text-slate-400">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <BrandMark />
                <span className="text-xl font-black text-white">VEXARO SMM</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-400 max-w-sm">
                The World&apos;s Leading &amp; Most Affordable SMM Panel.
                Automating social growth for global influencers, agencies, and businesses with instant delivery.
              </p>
              <div className="mt-4 flex items-center gap-2 text-slate-400 text-xs">
                <span>Support:</span>
                <a
                  href="https://t.me/VexaroSMMAdmin"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#229ed9] font-bold hover:underline"
                >
                  @VexaroSMMAdmin
                </a>
                <span>•</span>
                <a
                  href="https://wa.me/923176437013"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#25d366] font-bold hover:underline"
                >
                  WhatsApp
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                SMM Services
              </h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/smm-panel" className="hover:text-[#baff00] transition">
                    Best SMM Panel
                  </Link>
                </li>
                <li>
                  <Link href="/instagram-services" className="hover:text-[#baff00] transition">
                    Instagram SMM Panel
                  </Link>
                </li>
                <li>
                  <Link href="/tiktok-services" className="hover:text-[#baff00] transition">
                    TikTok SMM Panel
                  </Link>
                </li>
                <li>
                  <Link href="/youtube-services" className="hover:text-[#baff00] transition">
                    YouTube SMM Panel
                  </Link>
                </li>
                <li>
                  <Link href="/facebook-services" className="hover:text-[#baff00] transition">
                    Facebook SMM Panel
                  </Link>
                </li>
                <li>
                  <Link href="/telegram-services" className="hover:text-[#baff00] transition">
                    Telegram SMM Panel
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                Resellers &amp; API
              </h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/dashboard" className="hover:text-[#baff00] transition">
                    REST API Documentation
                  </Link>
                </li>
                <li>
                  <a href="#updates" className="hover:text-[#baff00] transition">
                    Live Server Updates
                  </a>
                </li>
                <li>
                  <Link href="/login" className="hover:text-[#baff00] transition">
                    Reseller Sign In
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-[#baff00] transition">
                    Create Free Account
                  </Link>
                </li>
                <li>
                  <a href="#faq" className="hover:text-[#baff00] transition">
                    FAQ &amp; Guarantees
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                Support &amp; Updates
              </h4>
              <div className="mt-3 space-y-2 text-xs leading-relaxed">
                <div>
                  <span className="text-slate-400">WhatsApp Channel:</span>{" "}
                  <a
                    href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#25d366] font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <Icon name="whatsapp" size={13} />
                    <span>Follow for Updates</span>
                  </a>
                </div>
                <div>
                  <span className="text-slate-400">WhatsApp Admin:</span>{" "}
                  <a
                    href="https://wa.me/923176437013"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#25d366] font-bold hover:underline"
                  >
                    +92 317 6437013
                  </a>
                </div>
                <div>
                  <span className="text-slate-400">Telegram Admin:</span>{" "}
                  <a
                    href="https://t.me/VexaroSMMAdmin"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#229ed9] font-bold hover:underline"
                  >
                    @VexaroSMMAdmin
                  </a>
                </div>
                <div>
                  <span className="text-slate-400">Live Website:</span>{" "}
                  <a
                    href="https://vexarosmm.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-lime-400 font-mono text-[11px] font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <Icon name="globe" size={12} />
                    <span>vexarosmm.com</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-6 text-[11px]">
            <div className="flex flex-wrap items-center gap-2">
              <p>© 2026 VEXARO SMM. All rights reserved.</p>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <a
                href="https://vexarosmm.com/"
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-[#baff00] inline-flex items-center gap-1 font-mono text-[11px] transition"
              >
                <Icon name="globe" size={12} className="text-[#baff00]" />
                <span>vexarosmm.com</span>
              </a>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="hover:text-[#baff00] transition">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-[#baff00] transition">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-[#baff00] transition">
                Refund Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
      {/* Dynamic Announcement Modal */}
      {announcementModalOpen && selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-3xl border border-lime-400/40 bg-[#0e1819] p-6 sm:p-8 shadow-2xl shadow-black">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#baff00] text-lg font-black text-[#07100f] shadow-[0_0_15px_rgba(186,255,0,0.35)]">
                  📢
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#baff00]">
                    Official Announcement
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    {selectedAnnouncement.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setAnnouncementModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1 text-xs sm:text-sm text-slate-200 leading-relaxed space-y-1">
              {renderFormattedAnnouncement(selectedAnnouncement.message)}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <span className="text-[11px] text-slate-500 font-mono">
                Published: {new Date(selectedAnnouncement.createdAt).toLocaleDateString()}
              </span>
              <div className="flex gap-2.5">
                {extractFirstAnnouncementUrl(selectedAnnouncement.message) && (
                  <a
                    href={extractFirstAnnouncementUrl(selectedAnnouncement.message)!}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-xl bg-[#baff00] px-4 py-2 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] transition"
                  >
                    <span>Open Channel / Link</span>
                    <span>↗</span>
                  </a>
                )}
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setAnnouncementModalOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
