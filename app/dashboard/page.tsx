"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MassOrderPage } from "./mass-order";
import { SubscriptionsPage } from "./subscriptions";

type RizviService = {
  service: number;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: number;
  max: number;
  desc?: string;
  refill?: boolean;
  dripfeed?: boolean;
  cancel?: boolean;
  average_time?: string;
  popular?: boolean;
  rate_multiplier?: number;
};

type Service = {
  id: number;
  platform: string;
  icon: string;
  name: string;
  type?: string;
  description: string;
  price: string;
  rate_usd?: number;
  rate_pkr?: number;
  base_rate_usd?: number;
  min: string;
  max: string;
  category: string;
  refill: boolean;
  is_guaranteed?: boolean;
  popular?: boolean;
};

function isPackageService(service?: { type?: string; min?: string | number; max?: string | number } | null): boolean {
  if (!service) return false;
  return (
    service.type?.toLowerCase() === "package" ||
    (Number(service.min) === 1 && Number(service.max) === 1)
  );
}

type VexoOrder = {
  localId: string;
  orderId?: string;
  serviceId: number;
  service: string;
  platform: string;
  link: string;
  quantity: number;
  rate: number;
  charge: number;
  status: string;
  createdAt: string;
};

type VexoRefill = {
  id: string;
  orderId: string;
  providerOrderId: string | null;
  refillId: string | null;
  serviceName: string;
  link: string;
  quantity: number;
  charge: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type VexoRefund = {
  id: string;
  orderId: string;
  providerOrderId: string | null;
  serviceName: string;
  platform: string;
  link: string;
  quantity: number | null;
  amount: number;
  reason: string;
  status: string;
  createdAt: string;
};

type VexoDeposit = {
  id: string;
  method: string;
  amount: number;
  transactionId: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
};

type CurrentUser = {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
};

type VexoAnnouncement = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
};

function renderAnnouncementMessage(text: string) {
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
                className="font-bold text-[#baff00] underline decoration-[#baff00]/50 hover:decoration-[#baff00] hover:text-[#d2ff5a] transition break-all inline-flex items-center gap-1"
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

function extractAnnouncementUrl(text: string): string | null {
  const match = text.match(/(https?:\/\/[^\s]+)/);
  return match ? match[0] : null;
}


function Icon({ name, size = 20, strokeWidth = 1.9, className = "" }: { name: string; size?: number; strokeWidth?: number; className?: string }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className };
  switch (name) {
    case "home": return <svg {...common}><path d="m3 10 9-7 9 7"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>;
    case "plus": return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case "layers": return <svg {...common}><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></svg>;
    case "history": return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></svg>;
    case "wallet": return <svg {...common}><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H20v14H5.5A2.5 2.5 0 0 1 3 16.5v-9Z"/><path d="M20 9h-4a2 2 0 0 0 0 4h4"/><path d="M17 11h.01"/></svg>;
    case "headset": return <svg {...common}><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v5H5.5A1.5 1.5 0 0 1 4 17.5V14Z"/><path d="M20 14h-3v5h1.5a1.5 1.5 0 0 0 1.5-1.5V14Z"/><path d="M17 19c-1 1.3-2.6 2-5 2"/></svg>;
    case "user": return <svg {...common}><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>;
    case "settings": return <svg {...common}><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"/><path d="m19.4 15 .1.1a2 2 0 0 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4V19a2 2 0 0 1-4 0v-.2a2 2 0 0 0-3.4-1.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A2 2 0 0 0 3.6 11H3.5a2 2 0 0 1 0-4h.1A2 2 0 0 0 5 3.6l-.1-.1A2 2 0 1 1 7.7.7l.1.1A2 2 0 0 0 11.2 0H12a2 2 0 0 1 2 2v.2a2 2 0 0 0 3.4 1.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A2 2 0 0 0 21.6 10h.1a2 2 0 0 1 0 4h-.1a2 2 0 0 0-2.2 1Z"/></svg>;
    case "code": return <svg {...common}><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/></svg>;
    case "refund": return <svg {...common}><path d="M4 7v5h5"/><path d="M4.7 12A8 8 0 1 0 7 5.2"/><path d="M12 8v4l3 2"/></svg>;
    case "referral": return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="16" r="3"/><path d="m11.5 10.5 3 3"/><path d="M4 20c.7-2.2 2.3-3.5 5-3.5"/></svg>;
    case "search": return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>;
    case "bell": return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;
    case "logout": return <svg {...common}><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 4h5v16h-5"/></svg>;
    case "calendar": return <svg {...common}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18"/></svg>;
    case "cart": return <svg {...common}><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6"/></svg>;
    case "clock": return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case "star": return <svg {...common}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>;
    case "rocket": return <svg {...common}><path d="M14 4c2.8-.8 5.3-.7 6.8-.1.6 1.5.7 4-.1 6.8-1.2 4.2-4.5 7.4-8.7 8.7l-3.3-3.3c1.3-4.2 4.5-7.5 8.7-8.7Z"/><path d="m8.7 16.1-4.4.7.7-4.4"/><circle cx="15.8" cy="8.2" r="1.7"/><path d="M7.4 19.4 4.6 22"/></svg>;
    case "check": return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>;
    case "x": return <svg {...common}><path d="m6 6 12 12M18 6 6 18"/></svg>;
    case "menu": return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
    case "chevron": return <svg {...common}><path d="m7 10 5 5 5-5"/></svg>;
    case "chevronLeft": return <svg {...common}><path d="m15 18-6-6 6-6"/></svg>;
    case "chevronRight": return <svg {...common}><path d="m9 18 6-6-6-6"/></svg>;
    case "arrow": return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case "spark": return <svg {...common}><path d="m12 3 1.3 5.7L19 10l-5.7 1.3L12 17l-1.3-5.7L5 10l5.7-1.3L12 3Z"/><path d="m19 16 .5 2.5L22 19l-2.5.5L19 22l-.5-2.5L16 19l2.5-.5L19 16Z"/></svg>;
    case "heart": return <svg {...common}><path d="M20.8 8.7c0 5.1-8.8 10.2-8.8 10.2S3.2 13.8 3.2 8.7A4.7 4.7 0 0 1 12 6.3a4.7 4.7 0 0 1 8.8 2.4Z"/></svg>;
    case "shield": return <svg {...common}><path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>;
    case "more": return <svg {...common}><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></svg>;
    case "instagram": return <svg {...common}><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>;
    case "youtube": return <svg {...common} fill="currentColor" stroke="none"><rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="m10 9 5 3-5 3V9Z" fill="#07100f"/></svg>;
    case "tiktok": return <svg {...common}><path d="M14.5 4v9.2a4.5 4.5 0 1 1-3.5-4.4"/><path d="M14.5 4c1 2.5 2.7 4 5 4.2"/><path d="M11 8.8c.7-.2 1.5-.2 2.2.1"/></svg>;
    case "facebook": return <svg {...common} fill="currentColor" stroke="none"><circle cx="12" cy="12" r="9.5"/><path d="M13.5 20v-6h2l.4-2.4h-2.4V10c0-.8.2-1.4 1.5-1.4H16V6.4c-.5-.1-1.2-.2-2-.2-2 0-3.4 1.2-3.4 3.5v1.9H8.5V14h2.1v6h2.9Z" fill="#07100f"/></svg>;
    case "whatsapp": return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M8.4 7.8c.4-.4 1-.4 1.4.1l1 1.3c.3.4.3.8 0 1.2l-.5.6c.8 1.5 1.7 2.4 3.2 3.2l.6-.5c.4-.3.8-.3 1.2 0l1.3 1c.5.4.5 1 .1 1.4l-.6.6c-.5.5-1.3.7-2 .4-3.4-1.3-5.9-3.8-7.2-7.2-.3-.7-.1-1.5.4-2l.6-.6Z"/></svg>;
    case "telegram": return <svg {...common} fill="currentColor" stroke="none"><path d="m21.5 4.5-3 14.2c-.2 1-1 1.3-1.8.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2l-11 6.9-4.7-1.5c-1-.3-1-1 .2-1.5L20 3.2c.8-.3 1.7.2 1.5 1.3Z"/></svg>;
    case "globe": return <svg {...common}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
    case "x-social": return <svg {...common} strokeWidth={2.1}><path d="M5 4h4.1l3.1 4.7L16.4 4H19l-5.6 6.3L19.5 20h-4.1l-3.6-5.4L7.2 20H4.5l6-6.9L5 4Z"/></svg>;
    default: return <svg {...common}><circle cx="12" cy="12" r="8"/></svg>;
  }
}

function getPlatformIconClass(platform: string) {
  switch (platform) {
    case "Instagram":
      return "text-[#ff4fd8]";
    case "YouTube":
      return "text-[#ff2b2b]";
    case "TikTok":
      return "text-[#25f4ee]";
    case "Facebook":
      return "text-[#4f8cff]";
    case "WhatsApp":
      return "text-[#25d366]";
    case "Telegram":
      return "text-[#2aa8e8]";
    case "X / Twitter":
      return "text-white";
    default:
      return "text-[#baff00]";
  }
}

function getPlatform(category: string, name: string) {
  const text = `${category} ${name}`.toLowerCase();

  if (text.includes("instagram")) {
    return { platform: "Instagram", icon: "instagram" };
  }

  if (text.includes("youtube")) {
    return { platform: "YouTube", icon: "youtube" };
  }

  if (text.includes("tiktok")) {
    return { platform: "TikTok", icon: "tiktok" };
  }

  if (text.includes("facebook") || /\bfb\b/.test(text)) {
    return { platform: "Facebook", icon: "facebook" };
  }

  if (text.includes("whatsapp")) {
    return { platform: "WhatsApp", icon: "whatsapp" };
  }

  if (text.includes("telegram")) {
    return { platform: "Telegram", icon: "telegram" };
  }

  if (text.includes("twitter") || text.includes("x ")) {
    return { platform: "X / Twitter", icon: "x-social" };
  }

  return { platform: "Other", icon: "spark" };
}

// ===============================
// VEXO PRICING
// ===============================

// Rizvi API rate is treated as USD per 1,000.
// VEXO converts USD → PKR and then adds 7% markup.

const VEXO_MARKUP = 0.07;

// USD → PKR conversion rate used by VEXO.
// Update this value when you want to refresh the exchange rate.
const USD_TO_PKR = 278.0;

function getVexoRate(rizviRate: string | number): number {
  const usdRate = Number(rizviRate);

  if (!Number.isFinite(usdRate) || usdRate < 0) {
    return 0;
  }

  // Convert Rizvi USD rate to PKR.
  const pkrRate = usdRate * USD_TO_PKR;

  // Add VEXO's 5% markup.
  const vexoRate = pkrRate * (1 + VEXO_MARKUP);

  return vexoRate;
}

function formatRate(value: string | number): string {
  return getVexoRate(value).toFixed(4);
}

function convertRizviService(item: RizviService): Service {
  const { platform, icon } = getPlatform(item.category, item.name);
  const rawPlatform = (item as any).platform || platform;
  const normalizedPlatform = rawPlatform === "X (Twitter)" ? "X / Twitter" : rawPlatform;
  const mult = Number((item as any).rate_multiplier || (1 + VEXO_MARKUP));
  const baseUsd = Number((item as any).base_rate_usd || item.rate || 0);
  const retailUsd = (item as any).rate_usd != null ? Number((item as any).rate_usd) : Math.round(baseUsd * mult * 10000) / 10000;
  const retailPkr = (item as any).rate_pkr != null ? Number((item as any).rate_pkr) : getVexoRate(item.rate);

  return {
    id: item.service,
    platform: normalizedPlatform,
    icon,
    name: item.name,
    type: item.type,
    description:
      item.desc ||
      `${item.type} service • ${item.average_time || "Fast delivery"}`,
    price: retailPkr.toFixed(4),
    rate_usd: retailUsd,
    rate_pkr: retailPkr,
    base_rate_usd: baseUsd,
    min: String(item.min),
    max: String(item.max),
    category: item.category,
    refill: Boolean(item.refill),
    is_guaranteed: Boolean((item as any).is_guaranteed || item.refill),
    popular: Boolean(item.popular),
  };
}


const DEFAULT_WALLET_BALANCE_PKR = 0.00;

const CURRENCY_OPTIONS = [
  ["PKR", "Pakistani Rupee", "₨"],
  ["USD", "US Dollar", "$"],
  ["AED", "UAE Dirham", "د.إ"],
  ["SAR", "Saudi Riyal", "﷼"],
  ["INR", "Indian Rupee", "₹"],
  ["EUR", "Euro", "€"],
  ["GBP", "British Pound", "£"],
  ["CAD", "Canadian Dollar", "$"],
  ["AUD", "Australian Dollar", "$"],
  ["CNY", "Chinese Yuan", "¥"],
  ["JPY", "Japanese Yen", "¥"],
  ["QAR", "Qatari Riyal", "﷼"],
  ["KWD", "Kuwaiti Dinar", "د.ك"],
  ["BHD", "Bahraini Dinar", ".د.ب"],
  ["OMR", "Omani Rial", "﷼"],
  ["TRY", "Turkish Lira", "₺"],
  ["MYR", "Malaysian Ringgit", "RM"],
  ["SGD", "Singapore Dollar", "$"],
  ["THB", "Thai Baht", "฿"],
  ["IDR", "Indonesian Rupiah", "Rp"],
  ["EGP", "Egyptian Pound", "E£"],
  ["ZAR", "South African Rand", "R"],
  ["NZD", "New Zealand Dollar", "$"],
  ["CHF", "Swiss Franc", "CHF"],
  ["SEK", "Swedish Krona", "kr"],
  ["NOK", "Norwegian Krone", "kr"],
  ["DKK", "Danish Krone", "kr"],
  ["RUB", "Russian Ruble", "₽"],
  ["KRW", "South Korean Won", "₩"],
  ["BRL", "Brazilian Real", "R$"],
] as const;

function currencyInfo(code: string) {
  return CURRENCY_OPTIONS.find((item) => item[0] === code) || CURRENCY_OPTIONS[0];
}

function formatWalletBalance(code: string, rates: Record<string, number>, walletBalancePkr: number) {
  if (code === "PKR") return `₨${walletBalancePkr.toFixed(2)}`;
  const pkrPerUnit = rates[code];
  if (!Number.isFinite(pkrPerUnit) || pkrPerUnit <= 0) return "—";
  const value = walletBalancePkr / pkrPerUnit;
  return `${currencyInfo(code)[2]}${value.toFixed(value < 1 ? 4 : 2)}`;
}

function formatServicePrice(service: Service, code: string, rates: Record<string, number>) {
  if (code === "PKR") {
    return `₨${Number(service.price).toFixed(2)}`;
  }
  if (code === "USD" && service.rate_usd != null && service.rate_usd > 0) {
    return `$${Number(service.rate_usd).toFixed(4)}`;
  }
  return formatWalletBalance(code, rates, Number(service.price));
}

export default function Home() {
  const [activePage, setActivePage] = useState("New Order");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") || params.get("page");
      if (tab) {
        if (tab.toLowerCase() === "new-order" || tab.toLowerCase() === "new order") {
          setActivePage("New Order");
        } else {
          setActivePage(tab);
        }
      }
    }
  }, []);

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState("");
  const [orders, setOrders] = useState<VexoOrder[]>([]);
  const [walletBalancePkr, setWalletBalancePkr] = useState(DEFAULT_WALLET_BALANCE_PKR);
  const [sadaPayNumber, setSadaPayNumber] = useState("03197008275");
  const [sadaPayTitle, setSadaPayTitle] = useState("Saeed Bashir");
  const [deposits, setDeposits] = useState<VexoDeposit[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState("PKR");
  const [currencyRates, setCurrencyRates] = useState<Record<string, number>>({});
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [announcements, setAnnouncements] = useState<VexoAnnouncement[]>([]);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Record<string, boolean>>({});
  const [expandedMobileAnnouncement, setExpandedMobileAnnouncement] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnnouncements() {
      try {
        const response = await fetch("/api/announcements", { cache: "no-store" });
        const data = await response.json().catch(() => null);
        if (response.ok && data?.success && Array.isArray(data.announcements)) {
          setAnnouncements(data.announcements);
        }
      } catch (error) {
        console.error("VEXARO ANNOUNCEMENTS LOAD ERROR:", error);
      }
    }
    loadAnnouncements();
    try {
      const stored = localStorage.getItem("vexo_dismissed_announcements");
      if (stored) setDismissedAnnouncements(JSON.parse(stored));
    } catch {}
  }, []);

  function dismissAnnouncement(id: string) {
    const updated = { ...dismissedAnnouncements, [id]: true };
    setDismissedAnnouncements(updated);
    try {
      localStorage.setItem("vexo_dismissed_announcements", JSON.stringify(updated));
    } catch {}
  }


  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });
        const data = await response.json().catch(() => null);
        if (response.ok && data?.success && data?.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser({
            id: 1,
            name: "Demo Account",
            email: "demo@vexarosmm.com",
            is_admin: false,
          });
        }
      } catch {
        setCurrentUser({
          id: 1,
          name: "Demo Account",
          email: "demo@vexarosmm.com",
          is_admin: false,
        });
      }
    }
    loadUser();
  }, []);
  useEffect(() => {
    try {
      const savedCurrency = localStorage.getItem("vexo_currency");
      if (savedCurrency && CURRENCY_OPTIONS.some((item) => item[0] === savedCurrency)) {
        setSelectedCurrency(savedCurrency);
      }
    } catch (error) {
      console.error("VEXO CURRENCY LOAD ERROR:", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("vexo_currency", selectedCurrency);
    } catch (error) {
      console.error("VEXO CURRENCY SAVE ERROR:", error);
    }
  }, [selectedCurrency]);

  useEffect(() => {
    async function loadCurrencyRates() {
      try {
        const response = await fetch("/api/rates", { cache: "no-store" });
        const data = await response.json();
        if (response.ok && data.success) setCurrencyRates(data.rates || {});
      } catch (error) {
        console.error("VEXO CURRENCY RATES ERROR:", error);
      }
    }
    loadCurrencyRates();
  }, []);

  async function loadOrders() {
    try {
      const response = await fetch("/api/orders", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error("VEXO ORDERS LOAD ERROR:", error);
    }
  }

  useEffect(() => {
    loadOrders();
    const interval = window.setInterval(loadOrders, 15000);
    return () => window.clearInterval(interval);
  }, []);

  async function loadWallet() {
    try {
      const response = await fetch("/api/wallet", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Unable to load wallet.");
      }

      setWalletBalancePkr(Number(data.balancePkr || 0));
      if (data.sadaPayNumber) setSadaPayNumber(String(data.sadaPayNumber));
      if (data.sadaPayTitle) setSadaPayTitle(String(data.sadaPayTitle));
      setDeposits(Array.isArray(data.deposits) ? data.deposits : []);
    } catch (error) {
      console.error("VEXO WALLET LOAD ERROR:", error);
    }
  }

  useEffect(() => {
    loadWallet();
    const interval = window.setInterval(loadWallet, 10000);
    return () => window.clearInterval(interval);
  }, []);

  function handleOrderCreated(order: VexoOrder) {
    setOrders((current) => [order, ...current]);
    loadOrders();
    loadWallet();
  }

  function handleOrdersUpdated(updated: VexoOrder[]) {
    setOrders(updated);
  }

  async function loadServices() {
    try {
      setLoadingServices(true);
      setServicesError("");

      const response = await fetch("/api/services", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load services");
      }

      const converted = (data.services as RizviService[]).map(
        convertRizviService
      );

      setServices(converted);
    } catch (error) {
      console.error("VEXO SERVICES ERROR:", error);

      setServicesError(
        error instanceof Error ? error.message : "Unable to load services"
      );
    } finally {
      setLoadingServices(false);
    }
  }

  useEffect(() => {
    loadServices();

    const interval = setInterval(loadServices, 60_000);
    const handleFocus = () => loadServices();

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const filteredServices = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return [...services].sort((a, b) => Number(a.price) - Number(b.price));

    return services.filter((service) => {
      const text =
        `${service.name} ${service.platform} ${service.description} ${service.category}`.toLowerCase();

      return text.includes(query);
    }).sort((a, b) => Number(a.price) - Number(b.price));
  }, [services, search]);

  const menu = [
    { name: "New Order", icon: "plus" },
    { name: "Dashboard", icon: "home" },
    { name: "Mass Order", icon: "cart" },
    { name: "Subscriptions & Tools", icon: "spark" },
    { name: "Orders", icon: "layers" },
    { name: "Services", icon: "layers" },
    { name: "Add Funds", icon: "wallet" },
    { name: "Account", icon: "user" },
    { name: "Refer & Earn", icon: "referral" },
    { name: "API", icon: "code" },
    { name: "Support", icon: "headset" },
  ];

  function navigate(page: string) {
    setActivePage(page);
    setSidebarOpen(false);
  }

  function handleOrderService(serviceId: number | string) {
    setSelectedServiceId(String(serviceId));
    setActivePage("New Order");
    setSidebarOpen(false);
  }

  return (
    <main className="vexo-shell min-h-screen w-full max-w-full overflow-x-hidden antigravity-space-bg text-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar - Floating Antigravity Vertical Dock */}
      <aside
        className={`fixed z-50 flex flex-col text-white transition-all duration-300 ${
          sidebarOpen ? "inset-y-3 left-3 w-[260px] translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:left-4 lg:top-4 lg:bottom-4 lg:h-[calc(100vh-2rem)] lg:w-[260px] rounded-[28px] antigravity-dock overflow-hidden`}
      >
        {/* Logo */}
        <div className="flex h-20 items-center border-b border-white/[0.08] px-6 bg-white/[0.02]">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#baff00] text-lg font-black text-[#07100f] shadow-[0_0_20px_rgba(186,255,0,0.4)]">
            V
          </div>

          <div className="ml-3">
            <div className="text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
              <span>VEXARO</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#baff00] shadow-[0_0_8px_#baff00]" />
            </div>
            <div className="text-[9px] font-bold tracking-[0.25em] text-[#baff00]/80 uppercase">
              ANTIGRAVITY SMM
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3.5 py-5 no-scrollbar">
          <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
            Main Menu
          </p>

          <nav className="space-y-1.5">
            {menu.map((item) => {
              const active = activePage === item.name;

              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.name)}
                  className={`group relative flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 ${
                    active
                      ? "bg-[#baff00] text-[#07100f] font-black shadow-[0_4px_25px_rgba(186,255,0,0.4)]"
                      : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none transition-transform group-hover:scale-110 ${active ? "text-[#07100f]" : "text-slate-400 group-hover:text-[#baff00]"}`}>
                    <Icon name={item.icon} size={19} />
                  </span>

                  <span className="min-w-0 flex-1 text-left">{item.name}</span>

                  {item.name === "New Order" && (
                    <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black ${active ? "bg-[#07100f] text-[#baff00]" : "bg-[#baff00]/20 text-[#baff00] border border-[#baff00]/30"}`}>
                      NEW
                    </span>
                  )}

                  {item.name === "Subscriptions & Tools" && (
                    <span className="ml-auto shrink-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-sm">
                      AI TOOLS
                    </span>
                  )}
                </button>
              );
            })}
            {/* Link to Public Website & WhatsApp Channel */}
            <div className="mt-3 flex flex-col gap-1.5">
              <a
                href="https://vexo-smm-panel-7sln.vercel.app/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-3.5 py-2.5 text-xs font-bold text-slate-300 transition hover:border-[#baff00]/30 hover:bg-[#baff00]/5 hover:text-[#baff00]"
                title="Open Live Website: vexo-smm-panel-7sln.vercel.app"
              >
                <div className="flex items-center gap-2.5">
                  <Icon name="globe" size={16} className="text-[#baff00]" />
                  <span>vexo-smm-panel...</span>
                </div>
                <span className="rounded bg-[#baff00]/10 border border-[#baff00]/20 px-1.5 py-0.5 text-[9px] font-black text-[#baff00]">LIVE</span>
              </a>

              <a
                href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-2xl border border-[#25d366]/20 bg-[#25d366]/5 px-3.5 py-2.5 text-xs font-bold text-[#25d366] transition hover:border-[#25d366]/40 hover:bg-[#25d366]/15"
                title="Follow WhatsApp Channel for service alerts"
              >
                <div className="flex items-center gap-2.5">
                  <Icon name="whatsapp" size={16} />
                  <span>WhatsApp Channel</span>
                </div>
                <span className="text-[10px]">↗</span>
              </a>
            </div>
          </nav>
        </div>

        {/* User */}
        <div className="border-t border-white/[0.08] p-3.5 bg-white/[0.02]">
          <div className="flex items-center rounded-2xl bg-white/[0.04] p-2.5 border border-white/[0.06]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#baff00] font-black text-[#07100f] shadow-[0_0_12px_rgba(186,255,0,0.3)] text-xs">
              {currentUser?.name ? currentUser.name.trim().charAt(0).toUpperCase() : "U"}
            </div>

            <div className="ml-2.5 min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">{currentUser?.name || "Loading..."}</p>
              <p className="truncate text-[10px] text-slate-400">
                {currentUser?.is_admin ? "Administrator" : currentUser?.email || "User Account"}
              </p>
            </div>

            <button
              onClick={async () => {
                try {
                  const response = await fetch("/api/auth/logout", {
                    method: "POST",
                    credentials: "include",
                    cache: "no-store",
                  });
                  const data = await response.json();
                  if (!response.ok || !data.success) {
                    throw new Error(data.error || "Logout failed");
                  }
                  window.location.replace("/");
                } catch (error) {
                  console.error("VEXO LOGOUT ERROR:", error);
                  alert(error instanceof Error ? error.message : "Logout failed");
                }
              }}
              className="ml-1.5 text-slate-400 hover:text-[#baff00] transition p-1"
              title="Logout"
            >
              <Icon name="logout" size={18} />
            </button>
          </div>

          {currentUser?.is_admin && (
            <a
              href="/admin"
              className="mt-2.5 flex items-center justify-center gap-1.5 rounded-xl border border-[#baff00]/30 bg-[#baff00]/10 px-3 py-1.5 text-[11px] font-black text-[#cfff62] transition hover:bg-[#baff00] hover:text-[#07100f]"
            >
              ⚙ Admin Control Center →
            </a>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="min-w-0 w-full max-w-full overflow-x-hidden lg:ml-[284px] lg:w-[calc(100%-284px)] lg:pr-4 lg:py-4">
        {/* Header */}
        <header className="sticky top-3 lg:top-4 z-30 mx-3 lg:mx-0 mb-4 lg:mb-6 flex h-16 sm:h-18 items-center justify-between rounded-2xl border border-white/10 bg-[#091215]/90 px-3 sm:px-6 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(186,255,0,0.03)]">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 mr-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 lg:hidden"
              aria-label="Toggle navigation menu"
            >
              <Icon name="menu" size={20} />
            </button>
            <div className="relative hidden w-full max-w-[470px] md:block">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><Icon name="search" size={19} /></span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services..."
                className="h-11 w-full rounded-xl border border-white/10 bg-[#172126] pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#baff00]/50 focus:ring-2 focus:ring-[#baff00]/10"
              />
            </div>
            <div className="min-w-0 flex-1 md:hidden">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">VEXARO</p>
              <h1 className="text-sm sm:text-base font-black text-white truncate leading-tight">{activePage}</h1>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 sm:gap-2.5">
            {/* Mobile Balance Pill */}
            <button
              onClick={() => navigate("Add Funds")}
              className="flex items-center gap-1 rounded-xl border border-[#baff00]/25 bg-[#baff00]/10 px-2 py-1 text-xs font-bold text-[#baff00] transition hover:bg-[#baff00] hover:text-[#07100f] sm:hidden shrink-0"
              title="Add Funds / View Wallet"
            >
              <Icon name="wallet" size={13} />
              <span className="font-mono">{formatWalletBalance(selectedCurrency, currencyRates, walletBalancePkr)}</span>
            </button>

            <button
              onClick={() => navigate("Add Funds")}
              className="hidden rounded-xl bg-white/5 px-4 py-2 text-right transition hover:bg-[#baff00] hover:text-[#07100f] sm:block shrink-0"
              title="Change wallet currency"
            >
              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                Balance • {selectedCurrency}
              </p>
              <p className="font-bold">{formatWalletBalance(selectedCurrency, currencyRates, walletBalancePkr)}</p>
            </button>

            <div className="relative shrink-0">
              <button
                onClick={() => setAnnouncementsOpen(!announcementsOpen)}
                className="relative rounded-xl border border-white/10 bg-white/5 p-2 sm:p-2.5 text-slate-200 transition hover:border-[#baff00]/30 hover:text-[#baff00] shrink-0"
                title="View Announcements & Updates"
                aria-label="Announcements"
              >
                <Icon name="bell" size={17} />
                {announcements.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-[#baff00] text-[9px] sm:text-[10px] font-black text-[#07100f] ring-2 ring-[#0b1418] animate-pulse">
                    {announcements.length}
                  </span>
                )}
              </button>

              {announcementsOpen && (
                <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 top-20 sm:top-full sm:mt-2 w-auto sm:w-[clamp(18rem,88vw,24rem)] z-50 rounded-2xl border border-white/15 bg-[#0f191b] p-4 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📢</span>
                      <h4 className="text-sm font-black text-white">Announcements</h4>
                      {announcements.length > 0 && (
                        <span className="rounded-full bg-[#baff00]/15 px-2 py-0.5 text-[10px] font-bold text-[#baff00]">
                          {announcements.length} Total
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setAnnouncementsOpen(false)}
                      className="text-xs text-slate-400 hover:text-white"
                      aria-label="Close announcements"
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </div>

                  <div className="mt-3 max-h-[65vh] overflow-y-auto space-y-3 pr-1">
                    {announcements.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No active announcements right now.
                      </div>
                    ) : (
                      announcements.map((a) => (
                        <div
                          key={a.id}
                          className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 transition hover:border-lime-400/40"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="font-bold text-sm text-white">{a.title}</h5>
                            <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                              {new Date(a.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {renderAnnouncementMessage(a.message)}
                          </div>
                          {extractAnnouncementUrl(a.message) && (
                            <a
                              href={extractAnnouncementUrl(a.message)!}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#baff00] px-3 py-1.5 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] transition"
                            >
                              <span>Open Channel / Link</span>
                              <span>↗</span>
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <a
              href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-[#25d366]/40 bg-[#25d366]/10 px-2.5 sm:px-3 py-2 text-xs font-bold text-[#25d366] transition hover:bg-[#25d366]/20 shrink-0"
              title="Official WhatsApp Channel — Restocks & News"
            >
              <Icon name="whatsapp" size={15} />
              <span className="hidden md:inline">Channel</span>
            </a>

            <a
              href="https://vexo-smm-panel-7sln.vercel.app/"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-[#baff00]/40 hover:text-[#baff00] shrink-0"
              title="Open Live Website (vexo-smm-panel-7sln.vercel.app)"
            >
              <Icon name="globe" size={14} className="text-[#baff00]" />
              <span>Live Site</span>
            </a>

            <button
              onClick={() => navigate("Account")}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1 sm:px-3 sm:py-1.5 transition hover:border-[#baff00]/40 shrink-0"
              title="My Account"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#baff00]/60 bg-[#baff00]/10 text-xs font-black text-[#baff00]">
                {currentUser?.name ? currentUser.name.trim().charAt(0).toUpperCase() : "U"}
              </div>
              <span className="hidden text-sm font-bold text-white lg:block">
                {currentUser?.name ? currentUser.name.split(" ")[0] : "Account"}
              </span>
            </button>
          </div>
        </header>

        

        {/* Content */}
        <section className="vexo-page-enter p-4 sm:p-6 lg:p-7 pb-28 lg:pb-7">
          <h1 className="sr-only">
            VEXARO SMM Panel | Best &amp; Cheapest SMM Panel in Pakistan for Instagram, TikTok, YouTube &amp; Facebook with SadaPay, Easypaisa &amp; JazzCash
          </h1>

          {/* Active Broadcast Announcements Banner */}
          {announcements.filter((a) => !dismissedAnnouncements[a.id]).length > 0 && (
            <div className="mb-4 sm:mb-6 space-y-3">
              {announcements
                .filter((a) => !dismissedAnnouncements[a.id])
                .map((a) => {
                  const isExpanded = expandedMobileAnnouncement === a.id;
                  const url = extractAnnouncementUrl(a.message);
                  return (
                    <div
                      key={a.id}
                      className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#baff00]/40 bg-gradient-to-r from-[#0e241b] via-[#102220] to-[#0e241b] shadow-[0_0_25px_rgba(186,255,0,0.1)] animate-in fade-in slide-in-from-top-3 duration-300"
                    >
                      {/* Mobile compact non-intrusive bar (sm:hidden) */}
                      <div className="sm:hidden p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#baff00] text-[#07100f] text-xs font-black">
                              📢
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white truncate">
                                {a.title}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg bg-[#baff00] px-2 py-1 text-[10px] font-black text-[#07100f] hover:bg-[#d2ff5a] transition"
                              >
                                Link ↗
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => setExpandedMobileAnnouncement(isExpanded ? null : a.id)}
                              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-300 hover:text-white"
                            >
                              {isExpanded ? "Less ▲" : "View ▼"}
                            </button>
                            <button
                              type="button"
                              onClick={() => dismissAnnouncement(a.id)}
                              className="rounded-lg p-1 text-slate-400 hover:text-white"
                              title="Dismiss announcement"
                              aria-label="Dismiss Announcement"
                            >
                              <Icon name="x" size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Collapsible details on mobile */}
                        {isExpanded && (
                          <div className="mt-2.5 pt-2.5 border-t border-white/10 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap animate-in fade-in duration-200">
                            {renderAnnouncementMessage(a.message)}
                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(a.createdAt).toLocaleDateString()}
                              </span>
                              <button
                                type="button"
                                onClick={() => dismissAnnouncement(a.id)}
                                className="text-[10px] font-bold text-rose-400 hover:underline"
                              >
                                Dismiss Notice
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Desktop rich card view (hidden sm:block) */}
                      <div className="hidden sm:block p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#baff00] text-[#07100f] shadow-[0_0_15px_rgba(186,255,0,0.35)]">
                              <span className="text-xl">📢</span>
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-lime-400/30 bg-lime-400/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#baff00]">
                                  OFFICIAL ANNOUNCEMENT
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {new Date(a.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <h3 className="mt-1 text-lg sm:text-xl font-black text-white">
                                {a.title}
                              </h3>
                            </div>
                          </div>

                          <button
                            onClick={() => dismissAnnouncement(a.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition shrink-0"
                            title="Dismiss announcement from banner"
                            aria-label="Dismiss Announcement"
                          >
                            <Icon name="x" size={18} />
                          </button>
                        </div>

                        <div className="mt-3 text-xs sm:text-sm text-slate-200 leading-relaxed max-w-4xl whitespace-pre-wrap">
                          {renderAnnouncementMessage(a.message)}
                        </div>

                        {url && (
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl bg-[#baff00] px-5 py-2.5 text-xs sm:text-sm font-black text-[#07100f] shadow-[0_0_20px_rgba(186,255,0,0.3)] hover:bg-[#d2ff5a] transition"
                            >
                              <span>Open Channel / Link</span>
                              <span>↗</span>
                            </a>
                            <button
                              onClick={() => dismissAnnouncement(a.id)}
                              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition"
                            >
                              Dismiss Notice
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
          {activePage === "Dashboard" && (
            <Dashboard
              navigate={navigate}
              services={services}
              orders={orders}
              selectedCurrency={selectedCurrency}
              currencyRates={currencyRates}
              walletBalancePkr={walletBalancePkr}
              currentUser={currentUser}
              onOrderService={handleOrderService}
            />
          )}

          {activePage === "Services" && (
            <ServicesPage
              search={search}
              setSearch={setSearch}
              services={filteredServices}
              navigate={navigate}
              loading={loadingServices}
              error={servicesError}
              onRefresh={loadServices}
              selectedCurrency={selectedCurrency}
              currencyRates={currencyRates}
              onOrderService={handleOrderService}
            />
          )}

          {activePage === "New Order" && (
            <NewOrder
              services={services}
              selectedServiceId={selectedServiceId}
              onSelectServiceId={setSelectedServiceId}
              onOrderCreated={handleOrderCreated}
              walletBalancePkr={walletBalancePkr}
              selectedCurrency={selectedCurrency}
              currencyRates={currencyRates}
              navigate={navigate}
            />
          )}

          {activePage === "Mass Order" && (
            <MassOrderPage
              services={services}
              walletBalancePkr={walletBalancePkr}
              onOrdersCreated={() => {
                loadOrders();
                loadWallet();
              }}
              navigate={navigate}
            />
          )}

          {activePage === "Orders" && (
            <OrdersPage orders={orders} onOrdersUpdated={handleOrdersUpdated} />
          )}

          {activePage === "Subscriptions & Tools" && (
            <SubscriptionsPage
              walletBalancePkr={walletBalancePkr}
              selectedCurrency={selectedCurrency}
              currencyRates={currencyRates}
              formatBalance={formatWalletBalance}
              onBalanceUpdated={loadWallet}
              navigate={navigate}
            />
          )}

          {activePage === "Add Funds" && (
            <AddFundsPage
              currentUser={currentUser}
              selectedCurrency={selectedCurrency}
              setSelectedCurrency={setSelectedCurrency}
              rates={currencyRates}
              walletBalancePkr={walletBalancePkr}
              deposits={deposits}
              sadaPayNumber={sadaPayNumber}
              sadaPayTitle={sadaPayTitle}
              onWalletUpdated={(balancePkr, nextDeposits) => {
                setWalletBalancePkr(balancePkr);
                setDeposits(nextDeposits);
              }}
            />
          )}

          {activePage === "Account" && (
            <AccountPage
              currentUser={currentUser}
              walletBalancePkr={walletBalancePkr}
              ordersCount={orders.length}
              depositsCount={deposits.length}
              selectedCurrency={selectedCurrency}
              currencyRates={currencyRates}
            />
          )}

          {activePage === "Refer & Earn" && (
            <ReferAndEarnPage
              currentUser={currentUser}
              walletBalancePkr={walletBalancePkr}
              selectedCurrency={selectedCurrency}
              currencyRates={currencyRates}
            />
          )}

          {activePage === "API" && (
            <ApiPage currentUser={currentUser} />
          )}

          {activePage === "Support" && (
            <SupportPage currentUser={currentUser} orders={orders} />
          )}

          {activePage !== "Dashboard" &&
            activePage !== "Services" &&
            activePage !== "New Order" &&
            activePage !== "Mass Order" &&
            activePage !== "Subscriptions & Tools" &&
            activePage !== "Orders" &&
            activePage !== "Add Funds" &&
            activePage !== "Account" &&
            activePage !== "Refer & Earn" &&
            activePage !== "API" &&
            activePage !== "Support" && (
              <ComingSoon page={activePage} />
            )}
        </section>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/10 bg-[#0b1418]/95 px-2 py-2 backdrop-blur-lg pb-safe lg:hidden"
      >
        <button
          onClick={() => navigate("Dashboard")}
          className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 transition ${
            activePage === "Dashboard"
              ? "text-[#baff00]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Icon name="home" size={20} />
          <span className="text-[10px] font-semibold">Home</span>
        </button>

        <button
          onClick={() => navigate("Services")}
          className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 transition ${
            activePage === "Services"
              ? "text-[#baff00]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Icon name="layers" size={20} />
          <span className="text-[10px] font-semibold">Services</span>
        </button>

        <button
          onClick={() => navigate("New Order")}
          className="relative -top-3 flex flex-col items-center"
          title="Place New Order"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#baff00] text-[#07100f] shadow-lg shadow-[#baff00]/25 transition active:scale-95">
            <Icon name="plus" size={22} strokeWidth={2.5} />
          </div>
          <span className="mt-0.5 text-[10px] font-bold text-white">Order</span>
        </button>

        <button
          onClick={() => navigate("Orders")}
          className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 transition ${
            activePage === "Orders"
              ? "text-[#baff00]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Icon name="cart" size={20} />
          <span className="text-[10px] font-semibold">Orders</span>
        </button>

        <button
          onClick={() => navigate("Add Funds")}
          className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 transition ${
            activePage === "Add Funds"
              ? "text-[#baff00]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Icon name="wallet" size={20} />
          <span className="text-[10px] font-semibold">Funds</span>
        </button>

        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-slate-400 transition hover:text-white"
          title="Open Menu"
        >
          <Icon name="menu" size={20} />
          <span className="text-[10px] font-semibold">Menu</span>
        </button>
      </nav>
    </main>
  );
}

/* ---------------- DASHBOARD ---------------- */

function Dashboard({
  navigate,
  services,
  orders,
  selectedCurrency,
  currencyRates,
  walletBalancePkr,
  currentUser,
  onOrderService,
}: {
  navigate: (page: string) => void;
  services: Service[];
  orders: VexoOrder[];
  selectedCurrency: string;
  currencyRates: Record<string, number>;
  walletBalancePkr: number;
  currentUser: CurrentUser | null;
  onOrderService: (serviceId: number | string) => void;
}) {
  const [todayLabel, setTodayLabel] = useState("");

  useEffect(() => {
    setTodayLabel(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
  }, []);

  const completed = orders.filter((order) => order.status.toLowerCase() === "completed").length;
  const active = orders.filter((order) =>
    ["pending", "in progress", "processing", "partial"].includes(order.status.toLowerCase())
  ).length;
  const cancelled = orders.filter((order) => ["cancelled", "canceled"].includes(order.status.toLowerCase())).length;
  const totalSpent = orders
    .filter((order) => order.status.toLowerCase() === "completed")
    .reduce((sum, order) => sum + (Number(order.charge) || 0), 0);

  const popularServices = [
    services.find((s) => s.platform === "Instagram" && s.category.toLowerCase().includes("follower")),
    services.find((s) => s.platform === "TikTok" && s.category.toLowerCase().includes("view")),
    services.find((s) => s.platform === "YouTube" && s.category.toLowerCase().includes("view")),
  ].filter(Boolean) as Service[];

  const recentOrders = orders.slice(0, 6);

  return (
    <div className="mx-auto max-w-[1280px] space-y-7">
      {/* 1. Clean Dashboard Welcome Card */}
      <div className="antigravity-card rounded-xl p-5 sm:p-6 relative overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Welcome back, {currentUser?.name ? currentUser.name.split(" ")[0] : "Commander"} 👋
            </h2>
            <p className="mt-1 text-xs text-slate-400 font-medium">
              Monitor real-time queue status, wallet balance, and direct dispatch below.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-slate-300">
              <span className="text-[#baff00]"><Icon name="calendar" size={15} /></span>
              <span>{todayLabel || "Live"}</span>
            </div>

            <button
              type="button"
              onClick={() => navigate("New Order")}
              className="flex items-center gap-2 rounded-xl bg-[#baff00] px-5 py-2.5 text-xs sm:text-sm font-black text-[#07100f] shadow-[0_4px_20px_rgba(186,255,0,0.3)] hover:opacity-90 transition-all cursor-pointer"
            >
              <Icon name="bolt" size={15} />
              <span>Place New Order</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top 4 Antigravity Floating Telemetry Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <Stat
          title="Total Orders"
          value={String(orders.length)}
          subtitle="Lifetime automated dispatches"
          icon="cart"
        />
        <Stat
          title="Wallet Balance"
          value={formatWalletBalance(selectedCurrency, currencyRates, walletBalancePkr)}
          subtitle={`₨${walletBalancePkr.toLocaleString()} PKR available to spend`}
          icon="wallet"
        />
        <Stat
          title="In Queue / Active"
          value={String(active)}
          subtitle="Processing &amp; in-transit orders"
          icon="clock"
        />
        <Stat
          title="Total Spent"
          value={`₨${totalSpent.toFixed(2)}`}
          subtitle="Completed purchases value"
          icon="star"
        />
      </div>

      {/* 3. Main Two-Column Layout */}
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_340px] items-start">
        {/* Left Column: Command Actions & Recent Orders */}
        <div className="min-w-0 space-y-7">
          {/* Quick Command Center */}
          <div className="antigravity-card rounded-xl p-5 sm:p-6 relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">
                  Fast Command Center
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  One-tap instant telemetry shortcuts
                </p>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#baff00] bg-[#baff00]/10 border border-[#baff00]/25 rounded-full px-3 py-1">
                4 Operations
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: "bolt", label: "New Order", desc: "Instant Dispatch", target: "New Order", primary: true },
                { icon: "layers", label: "Services", desc: "400+ Active APIs", target: "Services", primary: false },
                { icon: "wallet", label: "Add Funds", desc: "0% Fee Gateways", target: "Add Funds", primary: false },
                { icon: "headset", label: "Support", desc: "24/7 Human Admin", target: "Support", primary: false },
              ].map((cmd) => (
                <button
                  key={cmd.label}
                  type="button"
                  onClick={() => navigate(cmd.target)}
                  className={`group rounded-xl p-4 text-left transition-all duration-200 cursor-pointer border relative overflow-hidden ${
                    cmd.primary
                      ? "bg-gradient-to-b from-[#baff00]/15 to-white/[0.03] border-[#baff00]/50 shadow-[0_4px_20px_rgba(186,255,0,0.18)] hover:border-[#baff00]"
                      : "bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/20"
                  }`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                    cmd.primary
                      ? "bg-[#baff00] text-[#07100f]"
                      : "bg-white/[0.05] border border-white/10 text-slate-300 group-hover:text-[#baff00]"
                  }`}>
                    <Icon name={cmd.icon} size={18} />
                  </span>
                  <p className="mt-3 text-xs font-black text-white group-hover:text-[#baff00] transition-colors">
                    {cmd.label}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">
                    {cmd.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Orders Telemetry Matrix */}
          <div className="antigravity-card rounded-xl p-5 sm:p-6 relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#baff00] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#baff00]" />
                </span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">
                    Recent Orders Telemetry
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Latest automated social growth dispatches
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("Orders")}
                className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-[#baff00] hover:bg-[#baff00] hover:text-[#07100f] hover:border-[#baff00] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>View All Orders</span>
                <Icon name="arrow" size={13} />
              </button>
            </div>

            <div className="mt-4 overflow-x-auto -mx-6 px-6 no-scrollbar">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] font-black uppercase tracking-[0.18em] text-[#baff00]">
                    <th className="pb-3 pr-4">Order ID</th>
                    <th className="pb-3 pr-4">Service</th>
                    <th className="pb-3 pr-4">Target Link</th>
                    <th className="pb-3 pr-4">Quantity</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 text-right">Charge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {recentOrders.map((order) => (
                    <tr
                      key={order.localId}
                      className="group transition hover:bg-white/[0.025]"
                    >
                      <td className="py-3.5 pr-4 font-mono font-bold text-slate-300 group-hover:text-white">
                        {order.orderId ? `#${order.orderId}` : `#${order.localId}`}
                      </td>
                      <td className="py-3.5 pr-4 max-w-[220px]">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#baff00]/10 text-[#baff00]">
                            <Icon name="layers" size={13} />
                          </span>
                          <span className="truncate font-bold text-white group-hover:text-[#baff00] transition-colors">
                            {order.service}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 max-w-[140px] truncate text-slate-400 font-mono text-[11px]">
                        {order.link}
                      </td>
                      <td className="py-3.5 pr-4 font-black text-white">
                        {order.quantity.toLocaleString()}
                      </td>
                      <td className="py-3.5 pr-4">
                        <StatusPill status={order.status} />
                      </td>
                      <td className="py-3.5 text-right font-black text-[#baff00]">
                        ₨{order.charge.toFixed(4)}
                      </td>
                    </tr>
                  ))}

                  {recentOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="mx-auto max-w-sm space-y-3">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 text-slate-500">
                            <Icon name="cart" size={24} />
                          </div>
                          <p className="text-sm font-bold text-slate-300">
                            No telemetry records yet
                          </p>
                          <p className="text-xs text-slate-500">
                            Dispatch your first order to track live delivery, speed, and status here.
                          </p>
                          <button
                            type="button"
                            onClick={() => navigate("New Order")}
                            className="inline-flex items-center gap-2 rounded-full bg-[#baff00] px-5 py-2.5 text-xs font-black text-[#07100f] shadow-[0_4px_20px_rgba(186,255,0,0.3)] hover:scale-105 transition-all cursor-pointer"
                          >
                            <span>⚡ Place First Order</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Rail: Floating Widgets */}
        <aside className="space-y-6">
          {/* Live Space Wallet Card */}
          <div className="antigravity-card rounded-[32px] p-6 space-y-5 relative overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.8),0_10px_35px_rgba(186,255,0,0.08)]">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-[#baff00] shadow-[0_0_8px_#baff00] animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                  Live Wallet
                </h3>
              </div>
              <span className="text-[10px] font-bold text-[#baff00] bg-[#baff00]/10 px-2.5 py-0.5 rounded-full border border-[#baff00]/25">
                Instant Top-Up
              </span>
            </div>

            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4.5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Icon name="wallet" size={14} className="text-[#baff00]" />
                Available Balance
              </span>
              <p className="text-3xl sm:text-4xl font-black text-white tracking-tight pt-1">
                {formatWalletBalance(selectedCurrency, currencyRates, walletBalancePkr)}
              </p>
              <p className="text-[11px] text-slate-400 pt-0.5">
                ₨{walletBalancePkr.toLocaleString()} PKR verified balance
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("Add Funds")}
              className="w-full rounded-full py-4 text-xs sm:text-sm font-black bg-[#baff00] text-[#07100f] shadow-[0_10px_30px_rgba(186,255,0,0.35)] hover:shadow-[0_15px_40px_rgba(186,255,0,0.55)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Icon name="wallet" size={17} />
              <span>+ Add Funds (SadaPay / JazzCash)</span>
            </button>
          </div>

          {/* Direct Support Card */}
          <div className="antigravity-card rounded-[30px] p-6 relative">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#25d366]/15 text-[#25d366]">
                <Icon name="whatsapp" size={18} />
              </span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.18em] text-white">
                  Direct Admin Support
                </h3>
                <p className="text-[10px] text-slate-400">
                  Instant response for orders &amp; balance
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Need immediate balance approval or have custom reseller orders? Chat directly with VEXARO Admin:
            </p>

            <div className="mt-4 space-y-2">
              <a
                href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-lime-400/40 bg-lime-400/10 py-2.5 text-xs font-bold text-[#baff00] transition hover:bg-[#baff00] hover:text-[#07100f]"
              >
                <Icon name="whatsapp" size={15} />
                <span>WhatsApp Channel (News)</span>
              </a>

              <a
                href="https://wa.me/923176437013"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl border border-[#25d366]/30 bg-[#25d366]/10 py-3 text-xs font-bold text-[#25d366] transition hover:bg-[#25d366] hover:text-[#07100f] hover:shadow-[0_0_20px_rgba(37,211,102,0.3)]"
              >
                <Icon name="whatsapp" size={15} />
                <span>WhatsApp (+92 317 6437013)</span>
              </a>

              <a
                href="https://t.me/VexaroSMMAdmin"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-[#2aa8e8]/30 bg-[#2aa8e8]/10 py-2.5 text-xs font-bold text-[#2aa8e8] transition hover:bg-[#2aa8e8] hover:text-white"
              >
                <Icon name="telegram" size={15} />
                <span>Telegram (@VexaroSMMAdmin)</span>
              </a>
            </div>
          </div>

          {/* Order Summary Telemetry */}
          <div className="antigravity-card rounded-xl p-5 relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-white">
                <span className="text-[#baff00]"><Icon name="spark" size={15} /></span>
                <span>Telemetry Status</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-400">
                {orders.length} Dispatches
              </span>
            </div>

            <div className="space-y-2.5">
              <MiniStat icon="cart" label="Total Orders" value={String(orders.length)} />
              <MiniStat icon="check" label="Completed" value={String(completed)} />
              <MiniStat icon="clock" label="In Progress" value={String(active)} />
              <MiniStat icon="x" label="Cancelled" value={String(cancelled)} />
            </div>
          </div>
        </aside>
      </div>

      {/* 4. Popular Fast-Dispatch Services Grid */}
      <div className="antigravity-card rounded-xl p-5 sm:p-6 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-lime-400/20 bg-lime-400/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#baff00] mb-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#baff00]" />
              <span>Highest Demand Services</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Popular Fast-Dispatch Services
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              One-click instant dispatch for high-speed engagement.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("Services")}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-[#baff00] hover:bg-[#baff00] hover:text-[#07100f] hover:border-[#baff00] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Explore 400+ Services</span>
            <Icon name="arrow" size={13} />
          </button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {popularServices.map((service) => (
            <Popular
              key={service.id}
              icon={service.icon}
              platform={service.platform}
              service={service.name}
              price={Number(service.price).toFixed(4)}
              onClick={() => onOrderService(service.id)}
            />
          ))}
        </div>
      </div>

      {/* Futuristic Footer */}
      <footer className="pt-6 pb-4 flex flex-col items-center justify-center gap-2 text-center text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#baff00] text-xs font-black text-[#07100f]">
            V
          </span>
          <span className="font-bold tracking-wider text-white">VEXARO SMM ANTIGRAVITY</span>
        </div>
        <p className="text-[11px]">© 2026 VEXARO SMM. All rights reserved.</p>
      </footer>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const completed = normalized === "completed";
  const processing = ["pending", "in progress", "processing", "partial"].includes(normalized);
  const cancelled = ["cancelled", "canceled"].includes(normalized);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
        completed
          ? "bg-[#baff00]/15 text-[#baff00] border border-[#baff00]/35 shadow-[0_0_12px_rgba(186,255,0,0.2)]"
          : processing
          ? "bg-amber-400/15 text-amber-300 border border-amber-400/35 shadow-[0_0_12px_rgba(251,191,36,0.15)]"
          : cancelled
          ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
          : "bg-white/10 text-slate-300 border border-white/10"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          completed
            ? "bg-[#baff00] shadow-[0_0_6px_#baff00]"
            : processing
            ? "bg-amber-400 animate-pulse"
            : cancelled
            ? "bg-rose-400"
            : "bg-slate-400"
        }`}
      />
      <span>{status}</span>
    </span>
  );
}

function MiniStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] border border-white/5 p-3 hover:bg-white/[0.05] transition-colors">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#baff00]/10 text-[#baff00]">
          <Icon name={icon} size={15} />
        </span>
        <span className="text-xs text-slate-400 font-medium">{label}</span>
      </div>
      <span className="text-xs font-black text-white">{value}</span>
    </div>
  );
}

/* ---------------- SERVICES ---------------- */

function ServicesPage({
  search,
  setSearch,
  services,
  navigate,
  loading,
  error,
  onRefresh,
  selectedCurrency,
  currencyRates,
  onOrderService,
}: {
  search: string;
  setSearch: (value: string) => void;
  services: Service[];
  navigate: (page: string) => void;
  loading: boolean;
  error: string;
  onRefresh: () => Promise<void>;
  selectedCurrency: string;
  currencyRates: Record<string, number>;
  onOrderService: (serviceId: number | string) => void;
}) {
  const [platformFilter, setPlatformFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 30;

  const platforms = ["All", "Instagram", "TikTok", "YouTube", "Facebook", "Telegram", "WhatsApp", "Other"];

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const matchesPlatform = platformFilter === "All" || s.platform.toLowerCase() === platformFilter.toLowerCase();
      const query = search.toLowerCase().trim();
      const matchesSearch = !query || `${s.name} ${s.platform} ${s.description} ${s.category} #${s.id}`.toLowerCase().includes(query);
      return matchesPlatform && matchesSearch;
    });
  }, [services, platformFilter, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [platformFilter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-black text-white">Services Catalog</h2>
          <p className="mt-2 text-sm text-slate-400">
            Browse and filter live services with transparent rates, limits, and 1-click ordering.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#121b1d] p-1">
          <button
            onClick={() => setViewMode("table")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${viewMode === "table" ? "bg-[#baff00] text-[#07100f]" : "text-slate-400 hover:text-white"}`}
          >
            ☰ Table View
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${viewMode === "cards" ? "bg-[#baff00] text-[#07100f]" : "text-slate-400 hover:text-white"}`}
          >
            ☷ Cards View
          </button>
        </div>
      </div>

      {/* Platform Filter Pills */}
      <div
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
        className="mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:flex-wrap"
      >
        {platforms.map((p) => {
          const isActive = platformFilter === p;
          return (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                isActive
                  ? "bg-[#baff00] text-[#07100f] shadow-[0_4px_16px_rgba(186,255,0,0.18)]"
                  : "border border-white/10 bg-[#121b1d] text-slate-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-[#121b1d] p-3">
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-3 text-slate-500">
            <Icon name="search" size={18} />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, or category (e.g. Followers, Views, Likes)..."
            className="w-full rounded-xl border border-white/10 bg-[#0a1110] pl-10 pr-4 py-2.5 text-base sm:text-sm text-white outline-none transition focus:border-[#baff00]"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          <span>{error}</span>
          <button onClick={onRefresh} className="font-semibold text-white underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-[#121b1d] p-8 text-center text-sm text-slate-400">
          Loading live services...
        </div>
      )}

      {/* Table View (Standard for Human SMM Panels) */}
      {viewMode === "table" && (
        <div className="space-y-3">
          {/* Mobile Cards (md:hidden) */}
          <div className="space-y-3 md:hidden">
            {paginatedServices.map((service) => (
              <div
                key={service.id}
                className="vexo-deferred-render rounded-2xl border border-white/10 bg-[#121b1d] p-4 transition active:border-[#baff00]/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`shrink-0 ${getPlatformIconClass(service.platform)}`}>
                      <Icon name={service.icon} size={18} />
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      #{service.id} • {service.platform}
                    </span>
                  </div>
                  {service.refill ? (
                    <span className="rounded-full bg-lime-400/15 px-2 py-0.5 text-[10px] font-bold text-[#baff00]">
                      ✓ Refill
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      Standard
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm font-semibold leading-5 text-white">{service.name}</p>
                <p className="mt-1 line-clamp-1 text-xs text-slate-400">{service.category}</p>

                <div className="mt-3 flex items-center justify-between rounded-xl bg-[#0a1110] px-3 py-2 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400">
                      {isPackageService(service) ? "Price:" : "Per 1K:"}
                    </span>
                    <span className="ml-1.5 font-bold text-[#baff00]">
                      ₨{Number(service.price).toFixed(2)}
                    </span>
                    {selectedCurrency !== "PKR" && (
                      <span className="ml-1 text-[10px] text-slate-400">
                        ({formatServicePrice(service, selectedCurrency, currencyRates)})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Min: {Number(service.min).toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() => onOrderService(service.id)}
                  className="mt-3 w-full rounded-xl bg-[#baff00] py-2.5 text-xs font-bold text-[#07100f] transition active:scale-[0.98]"
                >
                  Order Service →
                </button>
              </div>
            ))}
          </div>

          {/* Desktop Table View (hidden md:block) */}
          <div className="hidden overflow-x-auto rounded-2xl border border-white/10 bg-[#121b1d] md:block">
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="bg-[#0b1316] text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">ID</th>
                  <th className="px-4 py-3.5">Service Name</th>
                  <th className="px-4 py-3.5">Rate / Price</th>
                  <th className="px-4 py-3.5">Min / Max</th>
                  <th className="px-4 py-3.5">Guarantee</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedServices.map((service) => (
                  <tr key={service.id} className="border-t border-white/5 text-slate-300 transition hover:bg-white/[0.025]">
                    <td className="px-4 py-3.5 font-bold text-slate-400">#{service.id}</td>
                    <td className="max-w-[340px] px-4 py-3.5">
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-0.5 shrink-0 ${getPlatformIconClass(service.platform)}`}>
                          <Icon name={service.icon} size={17} />
                        </span>
                        <div>
                          <p className="font-semibold text-white leading-5">{service.name}</p>
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{service.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-200">
                      <div>₨{Number(service.price).toFixed(2)}</div>
                      <div className="text-[10px] font-normal text-slate-400">
                        {isPackageService(service) ? "per package" : "per 1K"}
                      </div>
                      {selectedCurrency !== "PKR" && (
                        <div className="text-[10px] text-slate-400">
                          {formatServicePrice(service, selectedCurrency, currencyRates)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400">
                      {Number(service.min).toLocaleString()} / {Number(service.max).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      {service.refill ? (
                        <span className="rounded-full bg-lime-400/15 px-2.5 py-0.5 text-[10px] font-bold text-[#baff00]">
                          ✓ Refill
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-slate-400">
                          Standard
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => onOrderService(service.id)}
                        className="rounded-lg bg-[#baff00] px-3.5 py-1.5 text-xs font-bold text-[#07100f] transition hover:bg-[#d2ff5a]"
                      >
                        Order
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && !loading && (
            <div className="rounded-2xl border border-white/10 bg-[#121b1d] px-6 py-12 text-center text-sm text-slate-500">
              No services found matching your criteria. Try another filter or search.
            </div>
          )}
        </div>
      )}

      {/* Cards View */}
      {viewMode === "cards" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {paginatedServices.map((service) => (
            <div
              key={service.id}
              className="vexo-deferred-render rounded-2xl border border-white/10 bg-[#121b1d] p-5 transition hover:-translate-y-1 hover:border-white/20"
            >
              <div className="flex items-start justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 font-bold ${getPlatformIconClass(service.platform)}`}>
                  <Icon name={service.icon} size={22} strokeWidth={2} />
                </div>
                <span className="shrink-0 rounded-lg bg-[#070d0d] px-2.5 py-1 text-[10px] font-bold text-slate-400">
                  ID #{service.id}
                </span>
              </div>

              <h3 className="mt-4 break-words font-bold leading-6 text-white">{service.name}</h3>
              <p className="mt-1 text-xs text-slate-400 line-clamp-2">{service.description}</p>

              <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-[#0a1110] p-3">
                  <p className="text-slate-400">{isPackageService(service) ? "Rate / Package" : "Rate / 1K"}</p>
                  <p className="mt-1 font-bold text-white">₨{Number(service.price).toFixed(2)}</p>
                </div>
                <div className="rounded-xl bg-[#0a1110] p-3">
                  <p className="text-slate-400">Min / Max</p>
                  <p className="mt-1 font-bold text-white">{service.min} - {service.max}</p>
                </div>
              </div>

              <button
                onClick={() => onOrderService(service.id)}
                className="mt-4 w-full rounded-xl bg-[#baff00] py-2.5 text-sm font-bold text-[#07100f] transition hover:bg-[#d2ff5a]"
              >
                Order Now
              </button>
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="col-span-full rounded-2xl border border-dashed border-white/15 bg-[#121b1d] p-12 text-center text-sm text-slate-400">
              No services found matching your criteria.
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {filtered.length > PAGE_SIZE && (
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#121b1d] p-4 sm:flex-row">
          <p className="text-xs text-slate-400">
            Showing <span className="font-bold text-white">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{" "}
            <span className="font-bold text-white">{Math.min(currentPage * PAGE_SIZE, filtered.length)}</span> of{" "}
            <span className="font-bold text-white">{filtered.length}</span> services
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={currentPage === 1}
              className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="px-2 text-xs font-bold text-[#baff00]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={currentPage === totalPages}
              className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- NEW ORDER (EASY, CLEAN & INTUITIVE) ---------------- */

function cleanServiceName(name: string, platform: string) {
  let clean = name
    .replace(/\|\s*Max\s*[\d,]+K?\s*/gi, "")
    .replace(/\[\s*Max\s*[\d,]+K?\s*\]/gi, "")
    .replace(/\|\s*Instant Start\s*/gi, "")
    .replace(/\|\s*Complete In .*?Minute[s]?\s*/gi, "")
    .replace(/\|\s*Random Mix\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (platform === "WhatsApp") {
    clean = clean
      .replace(/Whatsapp/gi, "WhatsApp")
      .replace(
        /WhatsApp Channel Post Emoji Reactions/gi,
        "WhatsApp Post Reaction"
      );
  }

  return clean;
}

function getServiceLinkPlaceholder(platform: string, actionType?: string) {
  if (platform === "WhatsApp") {
    if (actionType === "wa_voice_calls") {
      return "Phone number or target contact (e.g. +923001234567)";
    }
    if (actionType === "wa_reactions" || actionType === "wa_poll_votes") {
      return "https://whatsapp.com/channel/... (Link to channel post or poll update)";
    }
    return "https://whatsapp.com/channel/... or group invite link";
  }
  switch (platform) {
    case "Instagram":
      return "https://www.instagram.com/username or post/reel link";
    case "TikTok":
      return "https://www.tiktok.com/@username or video link";
    case "YouTube":
      return "https://www.youtube.com/watch?v=... or channel link";
    case "Facebook":
      return "https://www.facebook.com/page or post link";
    case "Telegram":
      return "https://t.me/channel_or_group or post link";
    case "X / Twitter":
      return "https://x.com/username or post link";
    default:
      return "https://...";
  }
}

function isServiceGuaranteed(service: Service): boolean {
  if (service.is_guaranteed === true || service.refill === true) return true;
  const text = `${service.name} ${service.category || ""}`.toLowerCase();
  const noRefill = /no refill|no-refill|without refill|no guarantee|non-guaranteed|drop 100%|drop: 100%/i;
  if (noRefill.test(text)) return false;
  const guaranteed = /refill|guarantee|guaranteed|non-drop|non drop|r30|r60|r90|r365|lifetime|permanent/i;
  return guaranteed.test(text);
}

function detectServiceAction(service: Service): string {
  const text = `${service.name} ${service.category || ""}`.toLowerCase();
  const plat = (service.platform || "").toLowerCase();

  // WhatsApp
  if (plat.includes("whatsapp")) {
    if (/voice\s*call/.test(text)) return "wa_voice_calls";
    if (/react|emoji|reaction/.test(text)) return "wa_reactions";
    if (/poll|vote/.test(text)) return "wa_poll_votes";
    if (/channel.*(?:follower|sub|member)|follower.*channel|whatsapp followers/.test(text)) return "wa_channel_followers";
    if (/member|group|community/.test(text)) return "wa_members";
    return "wa_other";
  }

  // Instagram
  if (plat.includes("instagram")) {
    if (/follower|subscriber/.test(text)) return "followers";
    if (/like/.test(text)) return "likes";
    if (/story/.test(text)) return "story_views";
    if (/reel/.test(text)) return "reels_views";
    if (/view|impression/.test(text)) return "views";
    if (/comment|reply/.test(text)) return "comments";
    if (/save|share/.test(text)) return "saves_shares";
    return "other";
  }

  // TikTok
  if (plat.includes("tiktok")) {
    if (/follower/.test(text)) return "followers";
    if (/like|heart/.test(text)) return "likes";
    if (/view/.test(text)) return "views";
    if (/comment/.test(text)) return "comments";
    if (/share|save|repost/.test(text)) return "shares";
    return "other";
  }

  // YouTube
  if (plat.includes("youtube")) {
    if (/sub/.test(text)) return "subscribers";
    if (/watch.*(?:time|hour)|hour/.test(text)) return "watch_hours";
    if (/view/.test(text)) return "views";
    if (/like/.test(text)) return "likes";
    if (/comment/.test(text)) return "comments";
    return "other";
  }

  // Facebook
  if (plat.includes("facebook")) {
    if (/follower|page like/.test(text)) return "followers";
    if (/like|reaction/.test(text)) return "likes";
    if (/view|video/.test(text)) return "views";
    if (/comment/.test(text)) return "comments";
    if (/share/.test(text)) return "shares";
    if (/member|group/.test(text)) return "members";
    return "other";
  }

  // Telegram
  if (plat.includes("telegram")) {
    if (/member|subscriber|channel/.test(text)) return "members";
    if (/view/.test(text)) return "views";
    if (/reaction/.test(text)) return "reactions";
    if (/vote|poll/.test(text)) return "votes";
    return "other";
  }

  // X / Twitter
  if (plat.includes("twitter") || plat.includes("x ") || plat === "x / twitter") {
    if (/follower/.test(text)) return "followers";
    if (/like|favorite/.test(text)) return "likes";
    if (/retweet|repost|share/.test(text)) return "retweets";
    if (/view|impression/.test(text)) return "views";
    return "other";
  }

  // Generic fallback
  if (/voice\s*call/.test(text)) return "wa_voice_calls";
  if (/poll|vote/.test(text)) return "votes";
  if (/react|emoji/.test(text)) return "reactions";
  if (/follower|subscriber|sub\b/.test(text)) return "followers";
  if (/like|heart/.test(text)) return "likes";
  if (/view|impression|traffic/.test(text)) return "views";
  if (/comment|reply/.test(text)) return "comments";
  if (/member/.test(text)) return "members";
  if (/share|save|repost/.test(text)) return "shares";
  return "other";
}

type ActionOption = {
  id: string;
  label: string;
  icon: string;
  count: number;
};

function getActionOptionsForPlatform(
  platform: string,
  platformServices: Service[]
): ActionOption[] {
  const plat = platform.toLowerCase();

  const counts: Record<string, number> = {};
  for (const s of platformServices) {
    const act = detectServiceAction(s);
    counts[act] = (counts[act] || 0) + 1;
  }

  let baseList: { id: string; label: string; icon: string }[] = [];

  if (plat.includes("whatsapp")) {
    baseList = [
      { id: "all", label: "All WhatsApp Options", icon: "whatsapp" },
      { id: "wa_voice_calls", label: "Voice Call Marketing", icon: "spark" },
      { id: "wa_reactions", label: "Post Emoji Reactions", icon: "heart" },
      { id: "wa_channel_followers", label: "Channel Followers", icon: "user" },
      { id: "wa_poll_votes", label: "Poll Votes", icon: "check" },
      { id: "wa_members", label: "Group Members", icon: "layers" },
      { id: "wa_other", label: "Other Services", icon: "spark" },
    ];
  } else if (plat.includes("instagram")) {
    baseList = [
      { id: "all", label: "All Instagram Options", icon: "instagram" },
      { id: "followers", label: "Followers", icon: "user" },
      { id: "likes", label: "Likes", icon: "heart" },
      { id: "views", label: "Views & Impressions", icon: "rocket" },
      { id: "reels_views", label: "Reels Views", icon: "rocket" },
      { id: "story_views", label: "Story Views", icon: "clock" },
      { id: "comments", label: "Comments", icon: "more" },
      { id: "saves_shares", label: "Saves & Shares", icon: "star" },
      { id: "other", label: "Other", icon: "spark" },
    ];
  } else if (plat.includes("tiktok")) {
    baseList = [
      { id: "all", label: "All TikTok Options", icon: "tiktok" },
      { id: "followers", label: "Followers", icon: "user" },
      { id: "likes", label: "Likes & Hearts", icon: "heart" },
      { id: "views", label: "Video Views", icon: "rocket" },
      { id: "comments", label: "Comments", icon: "more" },
      { id: "shares", label: "Shares & Saves", icon: "star" },
      { id: "other", label: "Other", icon: "spark" },
    ];
  } else if (plat.includes("youtube")) {
    baseList = [
      { id: "all", label: "All YouTube Options", icon: "youtube" },
      { id: "subscribers", label: "Subscribers", icon: "user" },
      { id: "views", label: "Views", icon: "rocket" },
      { id: "watch_hours", label: "Watch Time Hours", icon: "clock" },
      { id: "likes", label: "Likes", icon: "heart" },
      { id: "comments", label: "Comments", icon: "more" },
      { id: "other", label: "Other", icon: "spark" },
    ];
  } else if (plat.includes("facebook")) {
    baseList = [
      { id: "all", label: "All Facebook Options", icon: "facebook" },
      { id: "followers", label: "Page Followers & Likes", icon: "user" },
      { id: "likes", label: "Post Likes & Reactions", icon: "heart" },
      { id: "views", label: "Video Views", icon: "rocket" },
      { id: "members", label: "Group Members", icon: "layers" },
      { id: "comments", label: "Comments", icon: "more" },
      { id: "shares", label: "Shares", icon: "star" },
      { id: "other", label: "Other", icon: "spark" },
    ];
  } else if (plat.includes("telegram")) {
    baseList = [
      { id: "all", label: "All Telegram Options", icon: "telegram" },
      { id: "members", label: "Members & Subscribers", icon: "user" },
      { id: "views", label: "Post Views", icon: "rocket" },
      { id: "reactions", label: "Reactions", icon: "heart" },
      { id: "votes", label: "Poll Votes", icon: "check" },
      { id: "other", label: "Other", icon: "spark" },
    ];
  } else if (plat.includes("twitter") || plat.includes("x ") || plat === "x / twitter") {
    baseList = [
      { id: "all", label: "All X / Twitter Options", icon: "x-social" },
      { id: "followers", label: "Followers", icon: "user" },
      { id: "likes", label: "Likes", icon: "heart" },
      { id: "retweets", label: "Retweets & Reposts", icon: "star" },
      { id: "views", label: "Impressions & Views", icon: "rocket" },
      { id: "other", label: "Other", icon: "spark" },
    ];
  } else {
    baseList = [
      { id: "all", label: "All Options", icon: "spark" },
      { id: "followers", label: "Followers", icon: "user" },
      { id: "likes", label: "Likes", icon: "heart" },
      { id: "views", label: "Views", icon: "rocket" },
      { id: "subscribers", label: "Subscribers", icon: "user" },
      { id: "members", label: "Members", icon: "layers" },
      { id: "comments", label: "Comments", icon: "more" },
      { id: "wa_voice_calls", label: "Voice Calls", icon: "spark" },
      { id: "wa_reactions", label: "Reactions", icon: "heart" },
      { id: "wa_poll_votes", label: "Poll Votes", icon: "check" },
      { id: "watch_hours", label: "Watch Time", icon: "clock" },
      { id: "shares", label: "Shares", icon: "star" },
      { id: "other", label: "Other", icon: "spark" },
    ];
  }

  return baseList
    .map((opt) => ({
      ...opt,
      count: opt.id === "all" ? platformServices.length : counts[opt.id] || 0,
    }))
    .filter((opt) => opt.id === "all" || opt.count > 0);
}

function NewOrder({
  services,
  selectedServiceId,
  onSelectServiceId,
  onOrderCreated,
  walletBalancePkr,
  selectedCurrency,
  currencyRates,
  navigate,
}: {
  services: Service[];
  selectedServiceId: string;
  onSelectServiceId: (id: string) => void;
  onOrderCreated: (order: VexoOrder) => void;
  walletBalancePkr: number;
  selectedCurrency: string;
  currencyRates: Record<string, number>;
  navigate: (page: string) => void;
}) {
  const [platform, setPlatform] = useState<string>("All");
  const [actionType, setActionType] = useState<string>("all");
  const [guaranteeFilter, setGuaranteeFilter] = useState<"all" | "guaranteed" | "standard">("all");
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [comboboxSearch, setComboboxSearch] = useState<string>("");
  const [comboboxOpen, setComboboxOpen] = useState<boolean>(false);
  const [serviceAccordionOpen, setServiceAccordionOpen] = useState<boolean>(false);
  const [link, setLink] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1000");
  const [placingOrder, setPlacingOrder] = useState<boolean>(false);
  const [orderMessage, setOrderMessage] = useState<string>("");
  const [orderError, setOrderError] = useState<string>("");

  const comboboxRef = useRef<HTMLDivElement>(null);
  const platformScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(true);

  const checkPlatformScroll = useCallback(() => {
    const el = platformScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  }, []);

  useEffect(() => {
    checkPlatformScroll();
    window.addEventListener("resize", checkPlatformScroll);
    return () => window.removeEventListener("resize", checkPlatformScroll);
  }, [checkPlatformScroll]);

  const scrollPlatforms = (direction: "left" | "right") => {
    if (!platformScrollRef.current) return;
    const offset = direction === "left" ? -280 : 280;
    platformScrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    setTimeout(checkPlatformScroll, 320);
  };

  // Mouse drag-to-scroll implementation
  const isPointerDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);

  const handlePointerDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isPointerDownRef.current = true;
    startXRef.current = e.pageX - (platformScrollRef.current?.offsetLeft || 0);
    scrollLeftStartRef.current = platformScrollRef.current?.scrollLeft || 0;
  };
  const handlePointerUpOrLeave = () => {
    isPointerDownRef.current = false;
  };
  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || !platformScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - (platformScrollRef.current.offsetLeft || 0);
    const walk = (x - startXRef.current) * 1.3;
    platformScrollRef.current.scrollLeft = scrollLeftStartRef.current - walk;
    checkPlatformScroll();
  };

  // Close combobox when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setComboboxOpen(false);
      }
    }
    if (comboboxOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [comboboxOpen]);

  // Platform list definitions with clean floating icons
  const platformList = useMemo(() => [
    { name: "All", label: "All Platforms", icon: "spark" },
    { name: "WhatsApp", label: "WhatsApp", icon: "whatsapp" },
    { name: "Instagram", label: "Instagram", icon: "instagram" },
    { name: "TikTok", label: "TikTok", icon: "tiktok" },
    { name: "YouTube", label: "YouTube", icon: "youtube" },
    { name: "Facebook", label: "Facebook", icon: "facebook" },
    { name: "Telegram", label: "Telegram", icon: "telegram" },
    { name: "X / Twitter", label: "X / Twitter", icon: "x-social" },
    { name: "Other", label: "Other", icon: "spark" },
  ], []);

  // Compute live service count per platform
  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = { All: services.length };
    for (const s of services) {
      const p = s.platform || "Other";
      counts[p] = (counts[p] || 0) + 1;
    }
    return counts;
  }, [services]);

  // Filter: Services by platform
  const servicesByPlatform = useMemo(() => {
    if (platform === "All") return services;
    return services.filter((s) => s.platform?.toLowerCase() === platform.toLowerCase());
  }, [services, platform]);

  // Action options for the selected platform
  const actionOptions = useMemo(() => {
    return getActionOptionsForPlatform(platform, servicesByPlatform);
  }, [platform, servicesByPlatform]);

  // Filter: Services by action type
  const servicesByAction = useMemo(() => {
    if (actionType === "all") return servicesByPlatform;
    return servicesByPlatform.filter((s) => detectServiceAction(s) === actionType);
  }, [servicesByPlatform, actionType]);

  // Count guaranteed vs standard in the active action slice
  const guaranteeCounts = useMemo(() => {
    let guaranteed = 0;
    let standard = 0;
    for (const s of servicesByAction) {
      if (isServiceGuaranteed(s)) guaranteed++;
      else standard++;
    }
    return {
      all: servicesByAction.length,
      guaranteed,
      standard,
    };
  }, [servicesByAction]);

  // Filter by Guarantee & Refill option
  const servicesByGuarantee = useMemo(() => {
    if (guaranteeFilter === "all") return servicesByAction;
    if (guaranteeFilter === "guaranteed") {
      return servicesByAction.filter(isServiceGuaranteed);
    }
    return servicesByAction.filter((s) => !isServiceGuaranteed(s));
  }, [servicesByAction, guaranteeFilter]);

  // Final filtered services list, sorted by price
  const finalServices = useMemo(() => {
    let list = servicesByGuarantee;
    const q = globalSearch.trim().toLowerCase();
    if (q) {
      list = services.filter((s) => {
        const text = `${s.id} ${s.name} ${s.platform} ${s.category} ${s.description}`.toLowerCase();
        return text.includes(q);
      });
    }
    return [...list].sort((a, b) => Number(a.price) - Number(b.price));
  }, [servicesByGuarantee, globalSearch, services]);

  // Filtered services inside the Combobox search
  const comboboxFilteredServices = useMemo(() => {
    const q = comboboxSearch.trim().toLowerCase();
    let list = servicesByPlatform;

    if (actionType !== "all") {
      list = list.filter((s) => detectServiceAction(s) === actionType);
    }
    if (guaranteeFilter === "guaranteed") {
      list = list.filter(isServiceGuaranteed);
    } else if (guaranteeFilter === "standard") {
      list = list.filter((s) => !isServiceGuaranteed(s));
    }

    if (q) {
      const inPlatform = list.filter((s) => {
        const text = `${s.id} ${s.name} ${s.platform} ${s.category} ${s.description}`.toLowerCase();
        return text.includes(q);
      });
      if (inPlatform.length > 0) {
        list = inPlatform;
      } else {
        list = services.filter((s) => {
          const text = `${s.id} ${s.name} ${s.platform} ${s.category} ${s.description}`.toLowerCase();
          return text.includes(q);
        });
      }
    }

    return [...list].sort((a, b) => Number(a.price) - Number(b.price));
  }, [comboboxSearch, servicesByPlatform, actionType, guaranteeFilter, services]);

  // Active Service Selection: strictly derived from selectedServiceId or first service
  const service = useMemo(() => {
    if (selectedServiceId) {
      const found = services.find((s) => String(s.id) === String(selectedServiceId));
      if (found) return found;
    }
    return services[0] || null;
  }, [services, selectedServiceId]);

  // If no service selected initially, auto-select the first one
  useEffect(() => {
    if (!selectedServiceId && services.length > 0) {
      onSelectServiceId(String(services[0].id));
    }
  }, [selectedServiceId, services, onSelectServiceId]);

  // Align platform with selected service when external selection changes
  useEffect(() => {
    if (!service) return;
    if (service.platform && (platform === "All" || !selectedServiceId)) {
      setPlatform(service.platform);
      setActionType(detectServiceAction(service));
    }
  }, [service, platform, selectedServiceId]);

  const handleSelectPlatform = (p: string) => {
    setPlatform(p);
    setActionType("all");
    setGuaranteeFilter("all");
    setGlobalSearch("");
    setComboboxSearch("");

    // If active service does not belong to this platform, switch to the first service of this platform
    if (p !== "All") {
      if (!service || service.platform?.toLowerCase() !== p.toLowerCase()) {
        const matching = services.find((s) => s.platform?.toLowerCase() === p.toLowerCase());
        if (matching) {
          onSelectServiceId(String(matching.id));
        }
      }
    }
  };

  const handleSelectAction = (actId: string) => {
    setActionType(actId);
    setGlobalSearch("");
  };

  const handleSelectComboboxService = (s: Service) => {
    onSelectServiceId(String(s.id));
    setPlatform(s.platform || "All");
    setActionType(detectServiceAction(s));
    setGuaranteeFilter(isServiceGuaranteed(s) ? "guaranteed" : "all");
    setComboboxOpen(false);
    setComboboxSearch("");
  };

  const isPackage = isPackageService(service);

  // Automatically adjust quantity when service changes
  useEffect(() => {
    if (!service) return;
    if (isPackage) {
      setQuantity("1");
    } else {
      const cur = Number(quantity);
      const minVal = Number(service.min) || 1;
      const maxVal = Number(service.max) || 1000000;
      if (cur < minVal || cur > maxVal || !quantity || (cur === 1 && minVal > 1)) {
        setQuantity(String(minVal));
      }
    }
  }, [service?.id, isPackage]);

  // Float-safe exact charge calculation
  const numericQuantity = Math.max(0, Number(quantity) || 0);
  const charge =
    service && numericQuantity > 0
      ? isPackage
        ? Math.round((Number(service.price) * numericQuantity + Number.EPSILON) * 100) / 100
        : Math.round(((Number(service.price) / 1000) * numericQuantity + Number.EPSILON) * 100) / 100
      : 0;
  const isInsufficient = walletBalancePkr < charge;

  async function placeOrder() {
    setOrderMessage("");
    setOrderError("");

    if (!service) {
      setOrderError("Please select a service first.");
      return;
    }

    if (!link.trim()) {
      setOrderError("Please enter your target profile, post, or channel link.");
      return;
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      setOrderError("Quantity must be a positive whole number.");
      return;
    }

    const min = Number(service.min);
    const max = Number(service.max);
    if (qty < min || qty > max) {
      setOrderError(`Quantity must be between ${min.toLocaleString()} and ${max.toLocaleString()}.`);
      return;
    }

    if (isInsufficient) {
      setOrderError("Insufficient wallet balance. Please add funds to your wallet before placing this order.");
      return;
    }

    try {
      setPlacingOrder(true);
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `vexo-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: String(service.id),
          link: link.trim(),
          quantity: String(qty),
          idempotencyKey,
          platform: service.platform,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to place order.");
      }

      const createdOrder: VexoOrder = {
        localId: `VEXO-${Date.now()}`,
        orderId: data.orderId ? String(data.orderId) : undefined,
        serviceId: service.id,
        service: cleanServiceName(service.name, service.platform),
        platform: service.platform,
        link: link.trim(),
        quantity: qty,
        rate: Number(data.rate ?? service.price),
        charge: Number(data.charge ?? charge),
        status: "Pending",
        createdAt: new Date().toISOString(),
      };

      onOrderCreated(createdOrder);
      setOrderMessage(
        data.orderId
          ? `Order #${data.orderId} placed successfully! Tracking live updates in Orders.`
          : "Order placed successfully! Dispatched to provider queue."
      );
      setLink("");
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : "Unable to place order.");
    } finally {
      setPlacingOrder(false);
    }
  }

  return (
    <div className="w-full max-w-6xl min-w-0 mx-auto space-y-6">
      {/* Clean, Minimal Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Place New Order
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Select a service, provide link and quantity, then dispatch directly.
          </p>
        </div>

        {/* Quick Reset Filter Pill */}
        {(platform !== "All" || actionType !== "all" || guaranteeFilter !== "all" || globalSearch) && (
          <button
            type="button"
            onClick={() => {
              setPlatform("All");
              setActionType("all");
              setGuaranteeFilter("all");
              setGlobalSearch("");
              setComboboxSearch("");
            }}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white hover:border-[#baff00]/40 hover:bg-[#baff00]/10 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Icon name="refresh" size={13} />
            Reset Filters
          </button>
        )}
      </div>

      {/* Main 3-Step Flow: Left Form Card (Step 1 & 2) + Right Sticky Checkout Dock (Step 3) */}
      <div className="grid w-full min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        {/* Left Column: Form Card with 10-12px Rounded Corners */}
        <div className="min-w-0 w-full antigravity-card rounded-xl p-5 sm:p-7 space-y-6 relative overflow-hidden">
          
          {/* STEP 1: Category & Service Selector */}
          <div className="space-y-4 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#baff00]">
                Step 1 • Select Category &amp; Service
              </label>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400 font-medium">
                  {platformList.length} Networks
                </span>
              </div>
            </div>

            {/* Platform Horizontal Strip with Permanent Inline Navigation Buttons */}
            <div className="flex items-center gap-2 w-full min-w-0">
              <button
                type="button"
                onClick={() => scrollPlatforms("left")}
                className="shrink-0 flex h-10 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/[0.05] text-slate-300 hover:border-[#baff00] hover:bg-[#baff00] hover:text-[#07100f] transition-all cursor-pointer shadow-md"
                title="Previous platforms"
                aria-label="Previous platforms"
              >
                <Icon name="chevronLeft" size={16} />
              </button>

              <div
                ref={platformScrollRef}
                onScroll={checkPlatformScroll}
                onWheel={(e) => {
                  if (e.deltaY !== 0) {
                    e.currentTarget.scrollLeft += e.deltaY;
                    checkPlatformScroll();
                  }
                }}
                onMouseDown={handlePointerDown}
                onMouseLeave={handlePointerUpOrLeave}
                onMouseUp={handlePointerUpOrLeave}
                onMouseMove={handlePointerMove}
                className="flex-1 min-w-0 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#baff00]/50 hover:scrollbar-thumb-[#baff00] scrollbar-track-white/5 select-none cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center gap-2 min-w-max px-1">
                  {platformList.map((p) => {
                    const isActive = platform.toLowerCase() === p.name.toLowerCase();
                    const count = platformCounts[p.name] ?? (p.name === "Other" ? platformCounts["Other"] || 0 : 0);
                    if (p.name !== "All" && count === 0) return null;

                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => handleSelectPlatform(p.name)}
                        className={`group flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-left transition-all duration-200 cursor-pointer border shrink-0 ${
                          isActive
                            ? "bg-white/[0.12] border-[#baff00] text-white shadow-[0_0_15px_rgba(186,255,0,0.25)]"
                            : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.06] hover:text-white hover:border-white/20"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                            isActive
                              ? "bg-[#baff00] text-[#07100f]"
                              : "bg-white/[0.05] text-slate-300 group-hover:text-white"
                          }`}
                        >
                          <Icon name={p.icon} size={16} />
                        </div>

                        <div className="min-w-0 pr-0.5">
                          <div className="text-xs font-bold text-white flex items-center gap-1">
                            <span>{p.label || p.name}</span>
                            {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#baff00]" />}
                          </div>
                          <div className="text-[10px] font-medium text-slate-400">
                            {count} services
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => scrollPlatforms("right")}
                className="shrink-0 flex h-10 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/[0.05] text-slate-300 hover:border-[#baff00] hover:bg-[#baff00] hover:text-[#07100f] transition-all cursor-pointer shadow-md"
                title="Next platforms"
                aria-label="Next platforms"
              >
                <Icon name="chevronRight" size={16} />
              </button>
            </div>

            {/* Searchable Service Combobox (10-12px rounded corners) */}
            <div className="relative" ref={comboboxRef}>
              <button
                type="button"
                onClick={() => setComboboxOpen(!comboboxOpen)}
                className={`w-full text-left rounded-xl border transition-all p-4 cursor-pointer group ${
                  comboboxOpen
                    ? "border-[#baff00] bg-[#091316] shadow-[0_0_20px_rgba(186,255,0,0.12)]"
                    : "border-white/10 bg-[#070e10]/80 hover:border-white/25 hover:bg-[#091316]/90"
                }`}
              >
                {service ? (
                  <div className="flex items-center justify-between gap-3 min-w-0 w-full">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="rounded-md bg-[#baff00]/15 px-2 py-0.5 font-mono text-[10px] font-black text-[#baff00] border border-[#baff00]/30">
                          #{service.id}
                        </span>
                        <span className="rounded-md bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                          {service.platform}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            isServiceGuaranteed(service)
                              ? "bg-[#baff00]/10 text-[#baff00] border border-[#baff00]/25"
                              : "bg-amber-400/10 text-amber-400 border border-amber-400/25"
                          }`}
                        >
                          {isServiceGuaranteed(service) ? "🛡️ Guaranteed Refill" : "⚡ Standard"}
                        </span>
                      </div>

                      <p className="font-bold text-white text-sm sm:text-base truncate group-hover:text-[#baff00] transition-colors">
                        {cleanServiceName(service.name, service.platform)}
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        Min: <span className="text-slate-300 font-semibold">{isPackage ? "1 unit" : Number(service.min).toLocaleString()}</span> • Max:{" "}
                        <span className="text-slate-300 font-semibold">{isPackage ? "1 unit" : Number(service.max).toLocaleString()}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right whitespace-nowrap">
                        <div className="text-base sm:text-lg font-black text-[#baff00]">
                          ₨{Number(service.price).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          per {isPackage ? "package" : "1,000"}
                        </div>
                      </div>

                      <div
                        className={`h-8 w-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-300 group-hover:text-[#baff00] group-hover:border-[#baff00]/40 transition-all shrink-0 ${
                          comboboxOpen ? "rotate-180 text-[#baff00] border-[#baff00]" : ""
                        }`}
                      >
                        <Icon name="chevron" size={14} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-slate-400 py-1 text-sm">
                    <span>Click to search and choose service...</span>
                    <Icon name="chevron" size={14} />
                  </div>
                )}
              </button>

              {/* Combobox Popover */}
              {comboboxOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-white/15 bg-[#081114]/95 backdrop-blur-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] space-y-3.5">
                  {/* Instant Search Input */}
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Icon name="search" size={15} />
                    </span>
                    <input
                      type="text"
                      value={comboboxSearch}
                      onChange={(e) => setComboboxSearch(e.target.value)}
                      placeholder="Search by ID, name, or keywords (e.g. 1108, followers, non drop)..."
                      className="w-full rounded-lg border border-white/10 bg-[#050a0c] pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white outline-none focus:border-[#baff00] focus:ring-1 focus:ring-[#baff00]/20 placeholder:text-slate-500 transition-all"
                    />
                    {comboboxSearch && (
                      <button
                        type="button"
                        onClick={() => setComboboxSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Sub-Filters: Quick Action Pills & Guarantee Toggle */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
                    <div
                      onWheel={(e) => {
                        if (e.deltaY !== 0) {
                          e.currentTarget.scrollLeft += e.deltaY;
                        }
                      }}
                      className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar max-w-full"
                    >
                      {actionOptions.slice(0, 7).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectAction(opt.id)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                            actionType === opt.id
                              ? "bg-[#baff00] text-[#07100f]"
                              : "bg-white/[0.05] text-slate-300 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {opt.label} ({opt.count})
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/5 text-[10px] font-bold shrink-0">
                      <button
                        type="button"
                        onClick={() => setGuaranteeFilter("all")}
                        className={`rounded-md px-2 py-0.5 transition cursor-pointer ${
                          guaranteeFilter === "all" ? "bg-white/20 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        All ({guaranteeCounts.all})
                      </button>
                      <button
                        type="button"
                        onClick={() => setGuaranteeFilter("guaranteed")}
                        className={`rounded-md px-2 py-0.5 transition cursor-pointer ${
                          guaranteeFilter === "guaranteed"
                            ? "bg-[#baff00] text-[#07100f] font-black"
                            : "text-[#baff00]/80 hover:text-[#baff00]"
                        }`}
                      >
                        🛡️ Refill ({guaranteeCounts.guaranteed})
                      </button>
                      <button
                        type="button"
                        onClick={() => setGuaranteeFilter("standard")}
                        className={`rounded-md px-2 py-0.5 transition cursor-pointer ${
                          guaranteeFilter === "standard"
                            ? "bg-amber-400 text-[#07100f] font-black"
                            : "text-amber-400/80 hover:text-amber-400"
                        }`}
                      >
                        ⚡ Standard ({guaranteeCounts.standard})
                      </button>
                    </div>
                  </div>

                  {/* Matched Services List */}
                  <div className="max-h-[280px] overflow-y-auto space-y-1.5 pr-1">
                    {comboboxFilteredServices.length > 0 ? (
                      comboboxFilteredServices.map((s) => {
                        const isSelected = service?.id === s.id;
                        const isG = isServiceGuaranteed(s);
                        const isPkg = isPackageService(s);

                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSelectComboboxService(s)}
                            className={`w-full text-left rounded-xl p-3 transition-all flex items-center justify-between gap-3 border cursor-pointer ${
                              isSelected
                                ? "bg-[#baff00]/15 border-[#baff00] text-white shadow-[0_0_15px_rgba(186,255,0,0.1)]"
                                : "bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.06] hover:border-white/15"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-mono text-[10px] font-bold text-slate-400">#{s.id}</span>
                                <span className="text-[10px] text-slate-500">•</span>
                                <span className="text-[10px] font-semibold text-slate-300">{s.platform}</span>
                                <span
                                  className={`text-[10px] font-bold ml-1 ${
                                    isG ? "text-[#baff00]" : "text-amber-400"
                                  }`}
                                >
                                  {isG ? "🛡️ Guaranteed" : "⚡ Standard"}
                                </span>
                                {isSelected && (
                                  <span className="rounded bg-[#baff00] px-1.5 py-0.5 text-[9px] font-black text-[#07100f] ml-auto">
                                    Selected
                                  </span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm font-semibold text-white truncate">
                                {cleanServiceName(s.name, s.platform)}
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-xs sm:text-sm font-black text-[#baff00]">
                                ₨{Number(s.price).toFixed(2)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                /{isPkg ? "pkg" : "1k"}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-400">
                        <p>No services match your search query.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setGuaranteeFilter("all");
                            setActionType("all");
                            setComboboxSearch("");
                          }}
                          className="mt-2 text-xs font-bold text-[#baff00] hover:underline"
                        >
                          Reset filters to view all
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Accordion: Full Service Details & Specifications */}
            {service && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setServiceAccordionOpen(!serviceAccordionOpen)}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#baff00]/15 text-[#baff00]">
                      <Icon name="spark" size={14} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-white">
                          Service Details &amp; Specifications
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black tracking-wide ${
                            isServiceGuaranteed(service)
                              ? "bg-[#baff00]/15 text-[#baff00] border border-[#baff00]/30"
                              : "bg-amber-400/15 text-amber-400 border border-amber-400/30"
                          }`}
                        >
                          {isServiceGuaranteed(service) ? "🛡️ Guaranteed Refill" : "⚡ Standard"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Min, Max, Speed, Refill Guarantee, and Link Instructions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="text-[11px] font-medium hidden sm:inline">{serviceAccordionOpen ? "Hide" : "View"}</span>
                    <div className={`transition-transform duration-200 ${serviceAccordionOpen ? "rotate-180 text-[#baff00]" : ""}`}>
                      <Icon name="chevron" size={14} />
                    </div>
                  </div>
                </button>

                {serviceAccordionOpen && (
                  <div className="border-t border-white/[0.06] p-4 pt-3.5 space-y-3.5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Rate</span>
                        <span className="text-xs sm:text-sm font-black text-[#baff00]">
                          ₨{Number(service.price).toFixed(2)}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                            /{isPackage ? "pkg" : "1k"}
                          </span>
                        </span>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Capacity</span>
                        <span className="text-xs sm:text-sm font-bold text-white">
                          {isPackage ? "1 Unit" : `${Number(service.min).toLocaleString()} - ${Number(service.max).toLocaleString()}`}
                        </span>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Refill / Drop</span>
                        <span className={`text-xs sm:text-sm font-bold truncate block ${isServiceGuaranteed(service) ? "text-[#baff00]" : "text-amber-400"}`}>
                          {isServiceGuaranteed(service) ? "🛡️ 30-Day Refill" : "⚡ Standard / Non-Drop"}
                        </span>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Start Speed</span>
                        <span className="text-xs sm:text-sm font-bold text-slate-200">
                          0 - 15 Mins
                        </span>
                      </div>
                    </div>

                    {service.description && (
                      <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5 text-[11px] leading-relaxed text-slate-300">
                        <p className="font-bold text-white mb-1">Service Instructions &amp; Provider Notes:</p>
                        <p className="whitespace-pre-line text-slate-300">{service.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: Target Link & Quantity with Quick Chips */}
          <div className="space-y-4">
            {/* Input 1: Target Link */}
            <div className="antigravity-input-wrap rounded-xl p-4 sm:p-5">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#baff00]">
                Step 2 • Target Link or Profile URL
              </label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder={
                  service
                    ? getServiceLinkPlaceholder(service.platform, detectServiceAction(service))
                    : "https://..."
                }
                className="w-full bg-transparent border-0 outline-none text-white text-sm sm:text-base pt-2 pb-0 placeholder:text-slate-500 focus:ring-0"
              />
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/[0.04] pt-2">
                <span>Ensure target profile, post, or channel is set to public.</span>
                {service && (
                  <span className="hidden sm:inline font-medium text-slate-400">
                    Platform: <strong className="text-[#baff00]">{service.platform}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Input 2: Quantity with Quick Chips */}
            <div className="antigravity-input-wrap rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#baff00]">
                  Quantity {isPackage && "(Fixed Package Unit)"}
                </label>
                {service && (
                  <span className="text-xs text-slate-400 font-medium">
                    {isPackage ? (
                      <strong className="text-[#baff00]">1 unit per order</strong>
                    ) : (
                      <>
                        Min: <strong className="text-white">{Number(service.min).toLocaleString()}</strong> • Max:{" "}
                        <strong className="text-white">{Number(service.max).toLocaleString()}</strong>
                      </>
                    )}
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <input
                  type="number"
                  min={service ? service.min : "1"}
                  max={service ? service.max : "1000000"}
                  value={quantity}
                  readOnly={isPackage}
                  onChange={(e) => {
                    if (!isPackage) setQuantity(e.target.value);
                  }}
                  placeholder={isPackage ? "1" : "1000"}
                  className="w-full bg-transparent border-0 outline-none text-white text-2xl sm:text-3xl font-black placeholder:text-slate-500 focus:ring-0"
                />

                {/* Quick Fill Preset Chips */}
                {!isPackage && service && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setQuantity("500")}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-bold text-slate-300 hover:border-[#baff00]/50 hover:bg-[#baff00] hover:text-[#07100f] transition-all cursor-pointer"
                    >
                      500
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuantity("1000")}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-bold text-slate-300 hover:border-[#baff00]/50 hover:bg-[#baff00] hover:text-[#07100f] transition-all cursor-pointer"
                    >
                      1,000
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuantity("5000")}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-bold text-slate-300 hover:border-[#baff00]/50 hover:bg-[#baff00] hover:text-[#07100f] transition-all cursor-pointer"
                    >
                      5,000
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuantity(String(service.max))}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-bold text-slate-300 hover:border-[#baff00]/50 hover:bg-[#baff00] hover:text-[#07100f] transition-all cursor-pointer"
                    >
                      Max
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Non-intrusive Inline Validation Feedback */}
          {orderError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs font-medium text-red-300 flex items-start gap-2.5">
              <span className="text-red-400 font-bold shrink-0">⚠️</span>
              <span>{orderError}</span>
            </div>
          )}

          {orderMessage && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-medium text-emerald-300 flex items-start gap-2.5">
              <span className="text-emerald-400 font-bold shrink-0">✓</span>
              <span>{orderMessage}</span>
            </div>
          )}
        </div>

        {/* STEP 3: Minimal Live Checkout Dock (Sticky Floating Summary Widget) */}
        <div className="lg:sticky lg:top-6 space-y-4">
          <div className="rounded-xl antigravity-card p-5 sm:p-6 relative overflow-hidden space-y-5 shadow-xl">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#baff00] shadow-[0_0_8px_#baff00]" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                  Step 3 • Checkout Dock
                </h3>
              </div>
              <span className="text-[10px] font-bold text-[#baff00] bg-[#baff00]/10 px-2.5 py-0.5 rounded-full border border-[#baff00]/25">
                Live Pricing
              </span>
            </div>

            {/* Wallet Snapshot Card */}
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Icon name="wallet" size={14} className="text-[#baff00]" />
                  Your Wallet
                </span>
                <button
                  type="button"
                  onClick={() => navigate("Add Funds")}
                  className="rounded-lg bg-[#baff00]/10 border border-[#baff00]/30 px-2 py-0.5 text-[10px] font-black text-[#baff00] hover:bg-[#baff00] hover:text-[#07100f] transition-all cursor-pointer"
                >
                  + Add Funds
                </button>
              </div>

              <div className="mt-2">
                <p className="text-2xl font-black text-white">
                  ₨{walletBalancePkr.toFixed(2)}
                </p>
                {selectedCurrency !== "PKR" && (
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    ≈ {formatWalletBalance(selectedCurrency, currencyRates, walletBalancePkr)}
                  </p>
                )}
              </div>

              {/* Dynamic Balance Calculation */}
              <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Order Cost</span>
                  <span className="font-bold text-white">₨{charge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Balance After Order</span>
                  <span className={`font-bold ${isInsufficient ? "text-red-400" : "text-[#baff00]"}`}>
                    ₨{Math.max(0, walletBalancePkr - charge).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Selected Service Specs */}
            {service ? (
              <div className="space-y-2 text-xs text-slate-300 pt-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Platform</span>
                  <span className="font-bold text-white">{service.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Service #</span>
                  <span className="font-mono font-bold text-[#baff00]">#{service.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rate</span>
                  <span className="font-bold text-white">
                    ₨{Number(service.price).toFixed(2)} {isPackage ? "/ pkg" : "/ 1k"}
                    {selectedCurrency !== "PKR" && (
                      <span className="ml-1.5 text-xs text-slate-400 font-normal">
                        ({formatServicePrice(service, selectedCurrency, currencyRates)})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Quantity</span>
                  <span className="font-bold text-white">{numericQuantity.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No service selected yet.</p>
            )}

            {/* Total Due & CTA Button */}
            <div className="pt-3.5 border-t border-white/[0.08] space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Due
                </span>
                <div className="text-right">
                  <span className="text-2xl font-black text-[#baff00]">
                    ₨{charge.toFixed(2)}
                  </span>
                  {selectedCurrency !== "PKR" && (
                    <div className="text-[11px] text-slate-400 font-semibold">
                      ≈ {formatWalletBalance(selectedCurrency, currencyRates, charge)}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={placeOrder}
                disabled={placingOrder || isInsufficient}
                className="w-full rounded-xl py-3.5 text-sm font-black bg-[#baff00] text-[#07100f] shadow-[0_4px_25px_rgba(186,255,0,0.3)] hover:shadow-[0_6px_35px_rgba(186,255,0,0.5)] hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                {placingOrder ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#07100f] border-t-transparent" />
                    <span>Submitting Order...</span>
                  </>
                ) : isInsufficient ? (
                  <span>⚠️ Insufficient Balance</span>
                ) : (
                  <>
                    <Icon name="rocket" size={17} />
                    <span>Place Order Now</span>
                  </>
                )}
              </button>

              {isInsufficient && (
                <button
                  type="button"
                  onClick={() => navigate("Add Funds")}
                  className="w-full rounded-xl py-2.5 text-xs font-black bg-amber-400 text-[#07100f] hover:bg-amber-300 transition-all text-center cursor-pointer"
                >
                  Add Funds to Wallet (₨{(charge - walletBalancePkr).toFixed(2)} needed)
                </button>
              )}
            </div>

            {/* Direct Dispatch Indicator */}
            <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-center gap-2">
              <Icon name="shield" size={13} className="text-[#baff00]" />
              <span>Automated Least-Cost Intelligent Dispatch</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



/* ---------------- ORDERS, REFILL & REFUNDS ---------------- */

type OrderSubTab = "All Orders" | "Active" | "Completed" | "Refills" | "Refunds";

function OrdersPage({
  orders,
  onOrdersUpdated,
}: {
  orders: VexoOrder[];
  onOrdersUpdated: (orders: VexoOrder[]) => void;
}) {
  const [activeSubTab, setActiveSubTab] = useState<OrderSubTab>("All Orders");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Refills state
  const [refills, setRefills] = useState<VexoRefill[]>([]);
  const [loadingRefills, setLoadingRefills] = useState(false);
  const [refillSubmittingId, setRefillSubmittingId] = useState<string | null>(null);

  // Refunds state
  const [refunds, setRefunds] = useState<VexoRefund[]>([]);
  const [loadingRefunds, setLoadingRefunds] = useState(false);

  // Load refills
  async function loadRefills(sync = false) {
    setLoadingRefills(true);
    try {
      const response = await fetch(`/api/orders/refill?sync=${sync ? "true" : "false"}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.refills)) {
        setRefills(data.refills);
      }
    } catch (err) {
      console.error("VEXO LOAD REFILLS ERROR:", err);
    } finally {
      setLoadingRefills(false);
    }
  }

  // Load refunds
  async function loadRefunds() {
    setLoadingRefunds(true);
    try {
      const response = await fetch("/api/orders/refunds", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.refunds)) {
        setRefunds(data.refunds);
      }
    } catch (err) {
      console.error("VEXO LOAD REFUNDS ERROR:", err);
    } finally {
      setLoadingRefunds(false);
    }
  }

  useEffect(() => {
    loadRefills(false);
    loadRefunds();
  }, []);

  async function refreshStatuses() {
    setRefreshing(true);
    setError("");
    setToast(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to refresh order statuses.");
      }

      if (Array.isArray(data.orders)) {
        onOrdersUpdated(data.orders);
      }

      // Also refresh refills if on that tab
      if (activeSubTab === "Refills") {
        await loadRefills(true);
      }
      // Also refresh refunds if on that tab
      if (activeSubTab === "Refunds") {
        await loadRefunds();
      }

      setToast({ type: "success", message: "Order statuses synchronized successfully!" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to refresh order statuses."
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRequestRefill(targetOrder: VexoOrder) {
    const orderIdentifier = targetOrder.orderId || targetOrder.localId;
    setRefillSubmittingId(orderIdentifier);
    setError("");
    setToast(null);

    try {
      const response = await fetch("/api/orders/refill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId: orderIdentifier }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to submit refill request.");
      }

      setToast({
        type: "success",
        message: data.message || `Refill requested! Refill ID: #${data.refill?.refillId || data.refill?.id}`,
      });

      await loadRefills(false);
      setActiveSubTab("Refills");
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to request refill.",
      });
    } finally {
      setRefillSubmittingId(null);
    }
  }

  // Filter orders by active subtab
  const activeOrdersCount = useMemo(
    () =>
      orders.filter((o) =>
        ["pending", "processing", "in progress", "in_progress"].includes(
          o.status.toLowerCase()
        )
      ).length,
    [orders]
  );

  const completedOrdersCount = useMemo(
    () => orders.filter((o) => o.status.toLowerCase() === "completed").length,
    [orders]
  );

  const displayedOrders = useMemo(() => {
    if (activeSubTab === "Active") {
      return orders.filter((o) =>
        ["pending", "processing", "in progress", "in_progress"].includes(
          o.status.toLowerCase()
        )
      );
    }
    if (activeSubTab === "Completed") {
      return orders.filter((o) => o.status.toLowerCase() === "completed");
    }
    return orders;
  }, [orders, activeSubTab]);

  const totalRefundedPKR = useMemo(
    () => refunds.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [refunds]
  );

  // Set of order IDs that have a pending or in-progress refill
  const pendingRefillOrderIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of refills) {
      if (["pending", "in progress", "in_progress"].includes(r.status.toLowerCase())) {
        ids.add(r.orderId);
        if (r.providerOrderId) ids.add(r.providerOrderId);
      }
    }
    return ids;
  }, [refills]);

  const subTabs: { id: OrderSubTab; label: string; count: number }[] = [
    { id: "All Orders", label: "All Orders", count: orders.length },
    { id: "Active", label: "Active", count: activeOrdersCount },
    { id: "Completed", label: "Completed", count: completedOrdersCount },
    { id: "Refills", label: "Refills", count: refills.length },
    { id: "Refunds", label: "Refunds", count: refunds.length },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-black">Orders Management</h2>
          <p className="mt-2 text-sm text-slate-500">
            Track orders, request automatic refills, and audit wallet refunds all in one place.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeSubTab === "Refills" ? (
            <button
              onClick={() => loadRefills(true)}
              disabled={loadingRefills}
              className="rounded-xl bg-[#070d0d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1a2527] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingRefills ? "Syncing Refills..." : "↻ Sync Refills"}
            </button>
          ) : activeSubTab === "Refunds" ? (
            <button
              onClick={() => loadRefunds()}
              disabled={loadingRefunds}
              className="rounded-xl bg-[#070d0d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1a2527] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingRefunds ? "Refreshing..." : "↻ Refresh Refunds"}
            </button>
          ) : (
            <button
              onClick={refreshStatuses}
              disabled={refreshing || orders.length === 0}
              className="rounded-xl bg-[#070d0d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1a2527] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "↻ Refresh Status"}
            </button>
          )}
        </div>
      </div>

      {/* Notifications / Feedback */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {toast && (
        <div
          className={`mb-5 flex items-center justify-between rounded-xl border p-4 text-sm ${
            toast.type === "success"
              ? "border-lime-500/30 bg-lime-500/10 text-[#baff00]"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-4 font-bold opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sub-tabs Navigation */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-white/10 pb-4 sm:flex-wrap">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`shrink-0 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
                isActive
                  ? "bg-[#baff00] text-[#07100f] shadow-[0_4px_20px_rgba(186,255,0,0.18)]"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                  isActive
                    ? "bg-black/20 text-[#07100f]"
                    : "bg-white/10 text-slate-300"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* View: Standard Orders (All, Active, Completed) */}
      {(activeSubTab === "All Orders" ||
        activeSubTab === "Active" ||
        activeSubTab === "Completed") && (
        <div className="space-y-3">
          {/* Mobile Orders Card View (md:hidden) */}
          <div className="space-y-3 md:hidden">
            {displayedOrders.map((order) => {
              const orderKey = order.orderId || order.localId;
              const isCompleted = order.status.toLowerCase() === "completed";
              const isPartial = order.status.toLowerCase() === "partial";
              const isRefunded =
                order.status.toLowerCase().includes("refund") ||
                order.status.toLowerCase().includes("cancel");
              const isRefilling = refillSubmittingId === orderKey;
              const hasPendingRefill =
                pendingRefillOrderIds.has(order.localId) ||
                (order.orderId ? pendingRefillOrderIds.has(order.orderId) : false);

              let statusColor = "bg-white/5 text-slate-300";
              if (isCompleted) statusColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
              else if (isRefunded) statusColor = "bg-purple-500/10 text-purple-300 border border-purple-500/20";
              else if (["in progress", "processing"].includes(order.status.toLowerCase()))
                statusColor = "bg-sky-500/10 text-sky-400 border border-sky-500/20";
              else if (order.status.toLowerCase() === "pending")
                statusColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";

              return (
                <div
                  key={order.localId}
                  className="vexo-deferred-render rounded-2xl border border-white/10 bg-[#121b1d] p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#baff00]">
                      {order.orderId ? `#${order.orderId}` : `#${order.localId.slice(0, 8)}`}
                    </span>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusColor}`}>
                      {order.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-semibold text-white leading-snug">{order.service}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{order.platform}</p>

                  <div className="mt-3 rounded-xl bg-[#0a1110] p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Target:</span>
                      <span className="max-w-[200px] truncate text-slate-200 font-mono" title={order.link}>
                        {order.link}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Quantity:</span>
                      <span className="font-bold text-white">{order.quantity.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Charge:</span>
                      <span className="font-bold text-[#baff00]">₨{order.charge.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Date:</span>
                      <span className="text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {(isCompleted || isPartial || isRefunded) && (
                    <div className="mt-3 pt-2 border-t border-white/5">
                      {(isCompleted || isPartial) && (
                        <button
                          onClick={() => handleRequestRefill(order)}
                          disabled={isRefilling || hasPendingRefill}
                          className="w-full rounded-xl border border-[#baff00]/30 bg-[#baff00]/10 py-2 text-xs font-bold text-[#baff00] transition active:bg-[#baff00] active:text-[#07100f] disabled:opacity-40"
                        >
                          {isRefilling
                            ? "Requesting..."
                            : hasPendingRefill
                            ? "Refill Active"
                            : "↻ Request Refill"}
                        </button>
                      )}
                      {isRefunded && (
                        <button
                          onClick={() => setActiveSubTab("Refunds")}
                          className="w-full rounded-xl border border-purple-500/30 bg-purple-500/10 py-2 text-xs font-bold text-purple-300 transition active:bg-purple-500 active:text-white"
                        >
                          View Refund Details
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (hidden md:block) */}
          <div className="hidden overflow-x-auto rounded-2xl border border-white/10 bg-[#121b1d] md:block">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-[#0a1110] text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Order</th>
                  <th className="px-5 py-4">Service</th>
                  <th className="px-5 py-4">Link</th>
                  <th className="px-5 py-4">Quantity</th>
                  <th className="px-5 py-4">Charge</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {displayedOrders.map((order) => {
                  const orderKey = order.orderId || order.localId;
                  const isCompleted = order.status.toLowerCase() === "completed";
                  const isPartial = order.status.toLowerCase() === "partial";
                  const isRefunded =
                    order.status.toLowerCase().includes("refund") ||
                    order.status.toLowerCase().includes("cancel");
                  const isRefilling = refillSubmittingId === orderKey;
                  const hasPendingRefill =
                    pendingRefillOrderIds.has(order.localId) ||
                    (order.orderId ? pendingRefillOrderIds.has(order.orderId) : false);

                  let statusColor = "bg-white/5 text-slate-300";
                  if (isCompleted) statusColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                  else if (isRefunded) statusColor = "bg-purple-500/10 text-purple-300 border border-purple-500/20";
                  else if (["in progress", "processing"].includes(order.status.toLowerCase()))
                    statusColor = "bg-sky-500/10 text-sky-400 border border-sky-500/20";
                  else if (order.status.toLowerCase() === "pending")
                    statusColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";

                  return (
                    <tr key={order.localId} className="border-t border-white/10 hover:bg-white/[0.02]">
                      <td className="px-5 py-4 font-bold">
                        {order.orderId ? `#${order.orderId}` : order.localId.slice(0, 8)}
                      </td>
                      <td className="max-w-[260px] px-5 py-4">
                        <p className="break-words font-semibold">{order.service}</p>
                        <p className="mt-1 text-xs text-slate-500">{order.platform}</p>
                      </td>
                      <td className="max-w-[220px] px-5 py-4">
                        <p className="truncate text-slate-400" title={order.link}>
                          {order.link}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {order.quantity.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-200">
                        ₨{order.charge.toFixed(4)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        {(isCompleted || isPartial) && (
                          <button
                            onClick={() => handleRequestRefill(order)}
                            disabled={isRefilling || hasPendingRefill}
                            className="rounded-lg border border-[#baff00]/30 bg-[#baff00]/10 px-3 py-1.5 text-xs font-bold text-[#baff00] transition hover:bg-[#baff00] hover:text-[#07100f] disabled:cursor-not-allowed disabled:opacity-40"
                            title={hasPendingRefill ? "Refill already requested" : "Request engagement drop refill"}
                          >
                            {isRefilling
                              ? "Requesting..."
                              : hasPendingRefill
                              ? "Refill Active"
                              : "↻ Refill"}
                          </button>
                        )}
                        {isRefunded && (
                          <button
                            onClick={() => setActiveSubTab("Refunds")}
                            className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-300 transition hover:bg-purple-500 hover:text-white"
                          >
                            View Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {displayedOrders.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#121b1d] px-5 py-16 text-center">
              <p className="font-semibold text-slate-300">
                {activeSubTab === "Active"
                  ? "No active orders right now."
                  : activeSubTab === "Completed"
                  ? "No completed orders yet."
                  : "No orders placed yet."}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                New orders placed will be tracked and displayed here in real time.
              </p>
            </div>
          )}
        </div>
      )}

      {/* View: Refills Tab */}
      {activeSubTab === "Refills" && (
        <div>
          <div className="mb-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-xs text-sky-300">
            <span className="font-bold">About Refills:</span> If your followers or engagement drops on refill-eligible services, you can request a refill from the &ldquo;Completed&rdquo; orders list. The provider will re-deliver the missing quantity.
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#121b1d]">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-[#0a1110] text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Refill ID</th>
                  <th className="px-5 py-4">Original Order</th>
                  <th className="px-5 py-4">Service</th>
                  <th className="px-5 py-4">Link</th>
                  <th className="px-5 py-4">Quantity</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Requested Date</th>
                </tr>
              </thead>

              <tbody>
                {refills.map((refill) => {
                  let badgeColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                  const lowerStatus = refill.status.toLowerCase();
                  if (lowerStatus === "completed") {
                    badgeColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                  } else if (lowerStatus === "in progress" || lowerStatus === "in_progress") {
                    badgeColor = "bg-sky-500/10 text-sky-400 border border-sky-500/20";
                  } else if (lowerStatus === "rejected" || lowerStatus === "error") {
                    badgeColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                  }

                  return (
                    <tr key={refill.id} className="border-t border-white/10 hover:bg-white/[0.02]">
                      <td className="px-5 py-4 font-bold text-[#baff00]">
                        {refill.refillId ? `#${refill.refillId}` : `#${refill.id.slice(0, 8)}`}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-300">
                        {refill.providerOrderId ? `#${refill.providerOrderId}` : refill.orderId.slice(0, 8)}
                      </td>
                      <td className="max-w-[240px] px-5 py-4">
                        <p className="break-words font-semibold">{refill.serviceName}</p>
                      </td>
                      <td className="max-w-[200px] px-5 py-4">
                        <p className="truncate text-slate-400" title={refill.link}>
                          {refill.link}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {refill.quantity ? refill.quantity.toLocaleString() : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeColor}`}>
                          {refill.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                        {new Date(refill.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}

                {refills.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <p className="font-semibold text-slate-300">No refill requests yet.</p>
                      <p className="mt-1 text-sm text-slate-500">
                        To request a refill, navigate to the &ldquo;Completed&rdquo; tab and click the &ldquo;↻ Refill&rdquo; button on any completed order.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View: Refunds Tab */}
      {activeSubTab === "Refunds" && (
        <div>
          {/* Summary Box */}
          <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs uppercase tracking-wider text-purple-300 font-bold">
                Wallet Refund Ledger
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Whenever an order cannot be completed by providers or is cancelled, 100% of the charge is credited directly into your VEXARO wallet.
              </p>
            </div>
            <div className="rounded-xl border border-purple-400/20 bg-[#070d0d] px-5 py-3 text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Refunded</p>
              <p className="text-xl font-black text-[#baff00]">₨{totalRefundedPKR.toFixed(2)}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#121b1d]">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-[#0a1110] text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Refund ID</th>
                  <th className="px-5 py-4">Order Ref</th>
                  <th className="px-5 py-4">Service / Description</th>
                  <th className="px-5 py-4">Refund Amount</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Date</th>
                </tr>
              </thead>

              <tbody>
                {refunds.map((refund) => (
                  <tr key={refund.id} className="border-t border-white/10 hover:bg-white/[0.02]">
                    <td className="px-5 py-4 font-bold text-purple-300">
                      #{refund.id.slice(0, 8)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-300">
                      {refund.providerOrderId ? `#${refund.providerOrderId}` : refund.orderId ? `#${refund.orderId.slice(0, 8)}` : "Direct Credit"}
                    </td>
                    <td className="max-w-[280px] px-5 py-4">
                      <p className="break-words font-semibold">{refund.serviceName}</p>
                      <p className="mt-1 text-xs text-slate-400">{refund.reason}</p>
                    </td>
                    <td className="px-5 py-4 font-bold text-[#baff00]">
                      +₨{refund.amount.toFixed(2)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                        <span>✓</span>
                        <span>{refund.status}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                      {new Date(refund.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {refunds.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <p className="font-semibold text-slate-300">No refunds recorded.</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Any failed, unfulfilled, or cancelled orders are automatically refunded to your wallet balance.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Orders, refills, and refund transactions are permanently saved and synchronized with your VEXARO database.
      </p>
    </div>
  );
}

/* ---------------- CURRENCY / WALLET ---------------- */

function AddFundsPage({
  currentUser,
  selectedCurrency,
  setSelectedCurrency,
  rates,
  walletBalancePkr,
  deposits,
  sadaPayNumber = "03197008275",
  sadaPayTitle = "Saeed Bashir",
  onWalletUpdated,
}: {
  currentUser?: CurrentUser | null;
  selectedCurrency: string;
  setSelectedCurrency: (code: string) => void;
  rates: Record<string, number>;
  walletBalancePkr: number;
  deposits: VexoDeposit[];
  sadaPayNumber?: string;
  sadaPayTitle?: string;
  onWalletUpdated: (balancePkr: number, deposits: VexoDeposit[]) => void;
}) {
  const [openCurrency, setOpenCurrency] = useState(false);
  const [searchCurrency, setSearchCurrency] = useState("");
  const [method, setMethod] = useState("SadaPay");
  const [amount, setAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState<string>("");
  const [screenshotName, setScreenshotName] = useState<string>("");
  const [screenshotError, setScreenshotError] = useState<string>("");
  const [copiedNum, setCopiedNum] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [activeGuide, setActiveGuide] = useState<"easypaisa" | "jazzcash" | "sadapay">("easypaisa");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selected = currencyInfo(selectedCurrency);
  const filtered = CURRENCY_OPTIONS.filter(([code, name]) =>
    `${code} ${name}`.toLowerCase().includes(searchCurrency.toLowerCase().trim())
  );

  const numericAmount = Number(amount);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setScreenshotError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setScreenshotError("Please select an image file (PNG, JPG, or WebP).");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setScreenshotError("Image size must be under 8MB.");
      return;
    }

    setScreenshotName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;

      // Compress large images in browser using canvas
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1280;
        const maxHeight = 1280;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.8);
          setScreenshot(compressed);
        } else {
          setScreenshot(result);
        }
      };
      img.onerror = () => {
        setScreenshot(result);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }

  function handleCopyAccount(num: string) {
    navigator.clipboard.writeText(num);
    setCopiedNum(true);
    setTimeout(() => setCopiedNum(false), 2000);
  }

  function handleCopyTitle(title: string) {
    navigator.clipboard.writeText(title);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 2000);
  }

  async function submitDeposit() {
    setError("");
    setMessage("");

    if (!Number.isFinite(numericAmount) || numericAmount < 100) {
      setError("Minimum deposit amount is ₨100.");
      return;
    }

    if (numericAmount > 500000) {
      setError("Maximum deposit amount is ₨500,000 per request.");
      return;
    }

    if (transactionId.trim().length < 4) {
      setError("Please enter the transaction ID/reference from your payment receipt.");
      return;
    }

    if (!screenshot) {
      setError("Please upload a screenshot of your payment receipt for verification.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/wallet/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          method,
          amount: numericAmount,
          transactionId: transactionId.trim(),
          screenshot,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Unable to submit deposit request.");
      }

      const nextDeposits = [data.deposit, ...deposits.filter((item) => item.id !== data.deposit.id)];
      onWalletUpdated(walletBalancePkr, nextDeposits);
      setAmount("");
      setTransactionId("");
      setScreenshot("");
      setScreenshotName("");
      setMessage(`Deposit request ${data.deposit.id} submitted successfully! Your wallet balance will update immediately after admin verification. Screenshot will be automatically deleted.`);
    } catch (error) {
      console.error("VEXO DEPOSIT SUBMIT ERROR:", error);
      setError(error instanceof Error ? error.message : "Unable to submit deposit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="mb-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#baff00]">Wallet &amp; Payments</p>
        <h2 className="mt-2 text-3xl font-black text-white">Add Funds</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Transfer money via SadaPay, Easypaisa, JazzCash, or Bank, then submit your transaction reference with a receipt screenshot.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-6">
          {/* Wallet Balance Card */}
          <div className="rounded-xl bg-[#070d0d] p-5 text-white shadow-xl sm:p-7 border border-white/10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Available Wallet Balance</p>
                <p className="mt-3 text-4xl font-black tracking-tight text-[#baff00]">
                  {formatWalletBalance(selectedCurrency, rates, walletBalancePkr)}
                </p>
                <p className="mt-2 text-sm text-slate-400">Spendable on any service instantly</p>
              </div>
              <button
                type="button"
                onClick={() => setOpenCurrency(true)}
                className="rounded-xl bg-[#121b1d] border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-[#baff00] hover:text-[#07100f]"
              >
                {selected[2]} {selectedCurrency} · Change Currency
              </button>
            </div>
          </div>

          {/* OFFICIAL RECEIVING SADAPAY ACCOUNT BOX */}
          <div className="relative overflow-hidden rounded-xl border border-[#ff6060]/30 bg-gradient-to-br from-[#1c1212] via-[#1a0e0e] to-[#251010] p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ff6060]/10 text-xl font-black text-[#ff6060] ring-1 ring-[#ff6060]/30">
                  ⚡
                </div>
                <div>
                  <span className="rounded-full bg-[#ff6060]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#ff7575]">
                    Official Payment Receiver
                  </span>
                  <h3 className="text-lg font-black text-white">SadaPay Account Details</h3>
                </div>
              </div>

              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                ● 0% Fee • Instant Receipt
              </span>
            </div>

            {/* Account Details with 1-Tap Copy */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Account Number */}
              <div className="rounded-xl border border-white/10 bg-[#0c0808] p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  SadaPay Mobile / Account Number
                </span>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-xl font-black tracking-wider text-white">
                    {sadaPayNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyAccount(sadaPayNumber)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-[#baff00] transition hover:bg-[#baff00] hover:text-[#07100f] cursor-pointer"
                  >
                    {copiedNum ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Account Title */}
              <div className="rounded-xl border border-white/10 bg-[#0c0808] p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Account Title / Beneficiary Name
                </span>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-lg font-black text-white">
                    {sadaPayTitle}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyTitle(sadaPayTitle)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-[#baff00] transition hover:bg-[#baff00] hover:text-[#07100f] cursor-pointer"
                  >
                    {copiedTitle ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>

            {/* Streamlined 3-Step Deposit Guide */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#ff7575] block">
                Quick 3-Step Deposit Process:
              </span>
              <div className="grid gap-2 sm:grid-cols-3 text-xs text-slate-300">
                <div className="rounded-lg bg-black/30 p-2.5 border border-white/5">
                  <span className="font-black text-[#ff6060] mr-1.5">Step 1:</span>
                  Transfer to <strong className="text-white">{sadaPayNumber}</strong> ({sadaPayTitle}) via any bank/wallet app.
                </div>
                <div className="rounded-lg bg-black/30 p-2.5 border border-white/5">
                  <span className="font-black text-[#ff6060] mr-1.5">Step 2:</span>
                  Enter the <strong className="text-white">Transaction ID (TID)</strong> and amount in the form below.
                </div>
                <div className="rounded-lg bg-black/30 p-2.5 border border-white/5">
                  <span className="font-black text-[#ff6060] mr-1.5">Step 3:</span>
                  Click <strong className="text-white">Submit Deposit</strong> for automatic wallet credit.
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              💡 Always verify that the recipient account title shows <strong className="text-white">{sadaPayTitle} ({sadaPayNumber})</strong> before confirming your transfer.
            </p>
          </div>

          {/* STEP BY STEP TRANSFER GUIDES */}
          <div className="rounded-xl border border-white/10 bg-[#111a1d] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white">How to Transfer to SadaPay</h3>
                <p className="text-xs text-slate-400">Select your app to view simple step-by-step instructions</p>
              </div>
            </div>

            {/* Guide Tabs */}
            <div className="mt-4 flex flex-wrap gap-2 border-b border-white/10 pb-4">
              <button
                type="button"
                onClick={() => setActiveGuide("easypaisa")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  activeGuide === "easypaisa"
                    ? "bg-[#25d366] text-[#07100f]"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                Easypaisa → SadaPay
              </button>
              <button
                type="button"
                onClick={() => setActiveGuide("jazzcash")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  activeGuide === "jazzcash"
                    ? "bg-[#ff9900] text-[#07100f]"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                JazzCash → SadaPay
              </button>
              <button
                type="button"
                onClick={() => setActiveGuide("sadapay")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  activeGuide === "sadapay"
                    ? "bg-[#ff6060] text-white"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                SadaPay / Bank → SadaPay
              </button>
            </div>

            {/* Guide Content: Easypaisa to SadaPay */}
            {activeGuide === "easypaisa" && (
              <div className="mt-4 space-y-2.5 text-xs leading-relaxed text-slate-300">
                <div className="flex gap-3 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366]/20 font-black text-[#25d366] text-[11px]">1</span>
                  <p>Open your <strong className="text-white">Easypaisa App</strong> and tap on <strong className="text-[#25d366]">Bank Transfer</strong>.</p>
                </div>
                <div className="flex gap-3 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366]/20 font-black text-[#25d366] text-[11px]">2</span>
                  <p>In the bank list search bar, type <strong className="text-white">SadaPay</strong> and tap on it.</p>
                </div>
                <div className="flex gap-3 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366]/20 font-black text-[#25d366] text-[11px]">3</span>
                  <p>Enter the account number: <code className="rounded bg-black/40 px-2 py-0.5 font-bold text-white">03197008275</code> and select purpose (e.g. Online Purchase).</p>
                </div>
                <div className="flex gap-3 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366]/20 font-black text-[#25d366] text-[11px]">4</span>
                  <p>Confirm the receiver title matches <strong className="text-[#baff00]">Saeed Bashir</strong> and tap <strong className="text-white">Send Now</strong>.</p>
                </div>
                <div className="flex gap-3 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366]/20 font-black text-[#25d366] text-[11px]">5</span>
                  <p><strong className="text-white">Save the payment screenshot</strong> and copy the <strong className="text-[#baff00]">Transaction ID (TID)</strong> to paste below.</p>
                </div>
              </div>
            )}

            {/* Guide Content: JazzCash to SadaPay */}
            {activeGuide === "jazzcash" && (
              <div className="mt-4 space-y-2.5 text-xs leading-relaxed text-slate-300">
                <div className="flex gap-3 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff9900]/20 font-black text-[#ff9900] text-[11px]">1</span>
                  <p>Open your <strong className="text-white">JazzCash App</strong> and select <strong className="text-[#ff9900]">Money Transfer</strong>.</p>
                </div>
                <div className="flex gap-3 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff9900]/20 font-black text-[#ff9900] text-[11px]">2</span>
                  <p>Select <strong className="text-white">Bank Transfer</strong> and search for <strong className="text-[#ff9900]">SadaPay</strong>.</p>
                </div>
                <div className="flex gap-3 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff9900]/20 font-black text-[#ff9900] text-[11px]">3</span>
                  <p>Enter the account number: <code className="rounded bg-black/40 px-2 py-0.5 font-bold text-white">03197008275</code> and enter your deposit amount.</p>
                </div>
                <div className="flex gap-3 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff9900]/20 font-black text-[#ff9900] text-[11px]">4</span>
                  <p>Verify that the beneficiary name is <strong className="text-[#baff00]">Saeed Bashir</strong> and authorize the transfer with your MPIN/Fingerprint.</p>
                </div>
                <div className="flex gap-3 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff9900]/20 font-black text-[#ff9900] text-[11px]">5</span>
                  <p><strong className="text-white">Take a screenshot</strong> of the successful receipt and copy your <strong className="text-[#baff00]">TID number</strong>.</p>
                </div>
              </div>
            )}

            {/* Guide Content: SadaPay to SadaPay */}
            {activeGuide === "sadapay" && (
              <div className="mt-4 space-y-2.5 text-xs leading-relaxed text-slate-300">
                <div className="flex gap-3 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff6060]/20 font-black text-[#ff6060] text-[11px]">1</span>
                  <p>Open <strong className="text-white">SadaPay</strong> or any banking app (Meezan, HBL, Nayapay, UBL, etc.) and tap <strong className="text-white">Send Money</strong>.</p>
                </div>
                <div className="flex gap-3 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff6060]/20 font-black text-[#ff6060] text-[11px]">2</span>
                  <p>Select <strong className="text-white">SadaPay</strong> as the destination and enter <code className="rounded bg-black/40 px-2 py-0.5 font-bold text-white">03197008275</code>.</p>
                </div>
                <div className="flex gap-3 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff6060]/20 font-black text-[#ff6060] text-[11px]">3</span>
                  <p>Confirm title <strong className="text-[#baff00]">Saeed Bashir</strong>, send the funds, take a receipt screenshot, and note the transaction reference.</p>
                </div>
              </div>
            )}
          </div>

          {/* DEPOSIT SUBMISSION FORM */}
          <div className="rounded-xl border border-white/10 bg-[#111a1d] p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#baff00]/10 text-[#baff00]">
                <Icon name="wallet" size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Confirm Your Deposit</h3>
                <p className="text-xs text-slate-400">Fill in your transaction details and attach payment proof</p>
              </div>
            </div>

            {/* Method selector */}
            <div className="mt-5">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Payment Channel Used
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                {["SadaPay", "Easypaisa", "JazzCash", "Bank Transfer"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMethod(item)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition cursor-pointer ${
                      method === item
                        ? "border-[#baff00]/60 bg-[#baff00]/10 text-white shadow-sm"
                        : "border-white/10 bg-[#0b1418] text-slate-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold">{item}</span>
                      {method === item && <Icon name="check" size={15} className="text-[#baff00]" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount & TID inputs */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-400">
                  <span>Amount (PKR)</span>
                  <span className="text-slate-500 font-normal">Min: ₨100</span>
                </div>
                <input
                  type="number"
                  min="100"
                  max="500000"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 1000"
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#0b1418] px-4 text-base sm:text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-[#baff00]/50 focus:ring-2 focus:ring-[#baff00]/10"
                />
              </label>

              <label className="block">
                <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-400">
                  <span>Transaction ID (TID)</span>
                  <span className="text-slate-500 font-normal">From SMS / Receipt</span>
                </div>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. 3738920194 or 12-digit ref"
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#0b1418] px-4 text-base sm:text-sm text-white font-mono outline-none placeholder:text-slate-600 focus:border-[#baff00]/50 focus:ring-2 focus:ring-[#baff00]/10"
                />
              </label>
            </div>

            {/* MANDATORY SCREENSHOT UPLOAD */}
            <div className="mt-5">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                Attach Payment Receipt Screenshot <span className="text-rose-400">*</span>
              </label>

              {!screenshot ? (
                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/15 bg-[#0b1418] p-6 transition hover:border-[#baff00]/40 hover:bg-white/[0.02] cursor-pointer">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#baff00]/10 text-xl font-bold text-[#baff00]">
                    📷
                  </div>
                  <span className="mt-3 text-sm font-bold text-white">Click or tap to upload receipt screenshot</span>
                  <span className="mt-1 text-xs text-slate-500">Supports PNG, JPG, or WebP up to 8MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="rounded-xl border border-[#baff00]/30 bg-[#0b1418] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={screenshot}
                        alt="Receipt Preview"
                        className="h-16 w-16 rounded-xl border border-white/10 object-cover"
                      />
                      <div>
                        <p className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                          {screenshotName || "payment-receipt.jpg"}
                        </p>
                        <p className="text-[11px] text-emerald-400">✓ Screenshot attached &amp; compressed</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setScreenshot("");
                        setScreenshotName("");
                      }}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              )}

              {screenshotError && (
                <p className="mt-2 text-xs font-semibold text-rose-400">{screenshotError}</p>
              )}

              <p className="mt-2 text-[11px] text-slate-500">
                🔒 <strong className="text-slate-400">Zero database clutter:</strong> Once your payment is verified and credited by our team, the uploaded receipt image is automatically deleted from our servers.
              </p>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {message && (
              <div className="mt-4 rounded-xl border border-[#baff00]/20 bg-[#baff00]/10 px-4 py-3 text-sm text-[#d8ff86]">
                {message}
              </div>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={submitDeposit}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#baff00] px-5 text-sm font-black text-[#07100f] transition hover:bg-[#d2ff5a] shadow-[0_4px_25px_rgba(186,255,0,0.25)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Icon name={submitting ? "clock" : "check"} size={18} />
              {submitting ? "Submitting Request..." : "Submit Deposit with Proof"}
            </button>

            {/* Direct WhatsApp Receipt Confirmation */}
            <a
              href={`https://wa.me/923176437013?text=${encodeURIComponent(
                `Hello Saeed Bashir / VEXARO SMM Admin, I have submitted a deposit of PKR ${amount || "..."} via SadaPay. Transaction ID: ${transactionId || "..."}. Account: ${currentUser?.email || currentUser?.name || "Customer"}. Please verify.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#25d366]/40 bg-[#25d366]/10 px-5 text-xs sm:text-sm font-bold text-[#25d366] transition hover:bg-[#25d366] hover:text-[#07100f] shadow-[0_4px_20px_rgba(37,211,102,0.15)] cursor-pointer"
            >
              <Icon name="whatsapp" size={18} />
              <span>Send Receipt on WhatsApp (+92 317 6437013)</span>
            </a>
          </div>
        </div>

        {/* Right column - Deposit history */}
        <div className="space-y-5">
          <div className="rounded-xl border border-white/10 bg-[#111a1d] p-5 sm:p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#baff00]/10 text-[#baff00]">
                <Icon name="history" size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Deposit History</h3>
                <p className="text-xs text-slate-500">Your recent payment requests.</p>
              </div>
            </div>

            {deposits.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-6">No deposits yet.</p>
            ) : (
              <div className="space-y-3">
                {deposits.slice(0, 10).map((deposit) => (
                  <div key={deposit.id} className="rounded-xl border border-white/5 bg-[#0b1418] p-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white">₨{deposit.amount.toLocaleString()}</p>
                        <p className="mt-1 text-xs text-slate-400 font-medium">
                          {deposit.method} • <span className="font-mono text-[11px] text-slate-500">{deposit.transactionId}</span>
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        deposit.status === "Approved" ? "bg-emerald-400/10 text-emerald-300" :
                        deposit.status === "Rejected" ? "bg-red-400/10 text-red-300" :
                        "bg-amber-400/10 text-amber-300"
                      }`}>
                        {deposit.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">{new Date(deposit.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-[#baff00]/20 bg-[#baff00]/5 p-6 sm:p-8">
            <p className="text-sm font-bold text-[#baff00] mb-2">💡 Fast Approval Guarantee</p>
            <p className="text-xs leading-5 text-slate-300">
              Admin team reviews incoming deposits directly against bank receipts. Once approved, your wallet balance updates automatically. Need urgent top-up? Message our WhatsApp support at <strong className="text-[#baff00]">VexaroSMMAdmin</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------- COMING SOON --------------- */

function ComingSoon({ page }: { page: string }) {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-3xl border border-white/10 bg-[#111a1d] p-12 text-center sm:p-16">
        <div className="mb-6 flex justify-center">
          <span className="text-6xl">🚀</span>
        </div>
        <h2 className="text-3xl font-black text-white sm:text-4xl">Coming Soon</h2>
        <p className="mt-3 text-lg text-slate-400">
          The <span className="font-bold text-[#baff00]">{page}</span> page is under development.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          We're working hard to bring you amazing features. Check back soon!
        </p>
      </div>
    </div>
  );
}
function Stat({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
}) {
  return (
    <div className="antigravity-card rounded-xl p-5 sm:p-6 transition-all duration-200 hover:-translate-y-0.5 group relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#baff00]">
            {title}
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-400 font-medium">
            {subtitle}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] border border-white/10 text-[#baff00] shadow-[0_0_15px_rgba(186,255,0,0.15)] group-hover:bg-[#baff00] group-hover:text-[#07100f] transition-all">
          <Icon name={icon} size={20} />
        </div>
      </div>
    </div>
  );
}

function OrderRow({
  id,
  service,
  quantity,
  charge,
  status,
}: {
  id: string;
  service: string;
  quantity: string;
  charge: string;
  status: string;
}) {
  return (
    <tr className="border-t border-white/5 transition hover:bg-white/[0.02]">
      <td className="px-5 py-4 font-mono font-bold text-white">{id}</td>
      <td className="px-5 py-4 font-semibold text-slate-200">{service}</td>
      <td className="px-5 py-4 font-bold text-white">{quantity}</td>
      <td className="px-5 py-4 font-black text-[#baff00]">{charge}</td>
      <td className="px-5 py-4">
        <StatusPill status={status} />
      </td>
    </tr>
  );
}

function Popular({
  icon,
  platform,
  service,
  price,
  onClick,
}: {
  icon: string;
  platform: string;
  service: string;
  price: string;
  onClick: () => void;
}) {
  return (
    <div className="antigravity-card rounded-[28px] p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-[#baff00]/40 group flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.05] border border-white/10 text-white group-hover:border-[#baff00]/50 group-hover:shadow-[0_0_15px_rgba(186,255,0,0.2)] transition-all">
            <Icon name={icon} size={20} />
          </div>

          <span className="rounded-full bg-white/[0.05] border border-white/10 px-3 py-1 text-[11px] font-bold text-slate-300">
            {platform}
          </span>
        </div>

        <h4 className="mt-4 break-words text-sm font-bold leading-relaxed text-white group-hover:text-[#baff00] transition-colors line-clamp-2">
          {service}
        </h4>
      </div>

      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            Starting from
          </p>
          <p className="text-base font-black text-[#baff00]">
            ₨{price}
          </p>
        </div>

        <button
          type="button"
          onClick={onClick}
          className="rounded-full bg-[#baff00] px-4 py-2 text-xs font-black text-[#07100f] shadow-[0_4px_15px_rgba(186,255,0,0.3)] hover:shadow-[0_6px_20px_rgba(186,255,0,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          Order Now →
        </button>
      </div>
    </div>
  );
}

/* ---------------- ACCOUNT / SETTINGS ---------------- */

function AccountPage({
  currentUser,
  walletBalancePkr,
  ordersCount,
  depositsCount,
  selectedCurrency,
  currencyRates,
}: {
  currentUser: CurrentUser | null;
  walletBalancePkr: number;
  ordersCount: number;
  depositsCount: number;
  selectedCurrency: string;
  currencyRates: Record<string, number>;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill out all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    try {
      setBusy(true);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Unable to change password.");
      }

      setMessage(data.message || "Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-3xl font-black text-white">Account & Privacy</h2>
        <p className="mt-2 text-sm text-slate-400">
          Manage your account credentials and view your private platform statistics.
        </p>
      </div>

      {/* Account Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* User Card */}
        <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6 md:col-span-2">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#baff00] text-2xl font-black text-[#07100f]">
              {currentUser?.name ? currentUser.name.trim().charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <h3 className="text-xl font-black text-white">{currentUser?.name || "User"}</h3>
              <p className="text-sm text-slate-400">{currentUser?.email || "—"}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full bg-[#baff00]/10 px-2.5 py-0.5 text-[10px] font-black uppercase text-[#cfff62]">
                  {currentUser?.is_admin ? "Administrator" : "Verified Account"}
                </span>
                <span className="text-xs text-slate-500">Member ID #{currentUser?.id || "—"}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/5 pt-6 text-center">
            <div className="rounded-xl bg-white/[0.02] p-3">
              <p className="text-xs uppercase text-slate-500">Wallet</p>
              <p className="mt-1 text-lg font-black text-[#baff00]">
                {formatWalletBalance(selectedCurrency, currencyRates, walletBalancePkr)}
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.02] p-3">
              <p className="text-xs uppercase text-slate-500">Orders</p>
              <p className="mt-1 text-lg font-black text-white">{ordersCount}</p>
            </div>
            <div className="rounded-xl bg-white/[0.02] p-3">
              <p className="text-xs uppercase text-slate-500">Deposits</p>
              <p className="mt-1 text-lg font-black text-white">{depositsCount}</p>
            </div>
          </div>
        </div>

        {/* Privacy Guarantee Box */}
        <div className="rounded-2xl border border-[#baff00]/20 bg-[#baff00]/5 p-6">
          <div className="flex items-center gap-2 text-[#baff00]">
            <Icon name="shield" size={20} />
            <h4 className="font-bold">Privacy Guarantee</h4>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-300">
            Your orders, payment transactions, and account balance are 100% private to your account.
            Session tokens are cryptographically hashed and verified in PostgreSQL to prevent any cross-account access.
          </p>
        </div>
      </div>

      {/* Change Password Form */}
      <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6 sm:p-8">
        <h3 className="text-lg font-black text-white">Security & Password</h3>
        <p className="mt-1 text-xs text-slate-400">
          Change your password to keep your account safe. Any other open sessions will be automatically logged out.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-xl border border-[#baff00]/20 bg-[#baff00]/10 p-4 text-sm text-[#d8ff86]">
            {message}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="mt-6 max-w-md space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-slate-400">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-[#0a1110] px-4 py-3 text-sm text-white outline-none focus:border-[#baff00]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-slate-400">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-white/10 bg-[#0a1110] px-4 py-3 text-sm text-white outline-none focus:border-[#baff00]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-slate-400">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full rounded-xl border border-white/10 bg-[#0a1110] px-4 py-3 text-sm text-white outline-none focus:border-[#baff00]"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-2 rounded-xl bg-[#baff00] px-6 py-3 text-sm font-black text-[#07100f] transition hover:bg-[#d2ff5a] disabled:opacity-50"
          >
            {busy ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------------- REFER & EARN ---------------- */

type ReferredFriend = {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  ordersCount: number;
  commissionEarned: number;
};

type ReferralWithdrawal = {
  id: string;
  amountPkr: number;
  amountUsd: number;
  method: string;
  accountNumber: string;
  accountTitle: string;
  status: string;
  createdAt: string;
  rejectionReason?: string;
};

function ReferAndEarnPage({
  currentUser,
  walletBalancePkr,
  selectedCurrency,
  currencyRates,
}: {
  currentUser: CurrentUser | null;
  walletBalancePkr: number;
  selectedCurrency: string;
  currencyRates: Record<string, number>;
}) {
  const [referralCode, setReferralCode] = useState("");
  const [commissionRate, setCommissionRate] = useState(5);
  const [totalInvited, setTotalInvited] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [availableBalancePkr, setAvailableBalancePkr] = useState(0);
  const [availableBalanceUsd, setAvailableBalanceUsd] = useState(0);
  const [minWithdrawalUsd, setMinWithdrawalUsd] = useState(3.0);
  const [minWithdrawalPkr, setMinWithdrawalPkr] = useState(834.0);
  const [friends, setFriends] = useState<ReferredFriend[]>([]);
  const [withdrawals, setWithdrawals] = useState<ReferralWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Withdrawal modal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmountPkr, setWithdrawAmountPkr] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("Easypaisa");
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState("");
  const [withdrawAccountTitle, setWithdrawAccountTitle] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");

  async function loadReferralData() {
    try {
      setLoading(true);
      const res = await fetch("/api/referral", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReferralCode(data.referralCode || "");
        setCommissionRate(data.commissionRate || 5);
        setTotalInvited(Number(data.totalInvited || 0));
        setTotalCommission(Number(data.totalCommission || 0));
        setAvailableBalancePkr(Number(data.availableReferralBalancePkr || 0));
        setAvailableBalanceUsd(Number(data.availableReferralBalanceUsd || 0));
        if (data.minWithdrawalUsd) setMinWithdrawalUsd(data.minWithdrawalUsd);
        if (data.minWithdrawalPkr) setMinWithdrawalPkr(data.minWithdrawalPkr);
        setFriends(Array.isArray(data.friends) ? data.friends : []);
        setWithdrawals(Array.isArray(data.withdrawals) ? data.withdrawals : []);
      }
    } catch (err) {
      console.error("Failed to load referral data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReferralData();
  }, []);

  const referralLink =
    typeof window !== "undefined" && referralCode
      ? `${window.location.origin}/signup?ref=${referralCode}`
      : "";

  function handleCopyLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function handleCopyCode() {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function openWithdrawalModal() {
    setWithdrawError("");
    setWithdrawSuccess("");
    // Default to available balance
    setWithdrawAmountPkr(availableBalancePkr > 0 ? availableBalancePkr.toFixed(2) : minWithdrawalPkr.toFixed(2));
    setShowWithdrawModal(true);
  }

  async function handleWithdrawSubmit(e: React.FormEvent) {
    e.preventDefault();
    setWithdrawError("");
    setWithdrawSuccess("");

    const numericAmount = Number(withdrawAmountPkr);
    if (!Number.isFinite(numericAmount) || numericAmount < minWithdrawalPkr) {
      setWithdrawError(`Minimum payout amount is $${minWithdrawalUsd.toFixed(2)} (₨${minWithdrawalPkr.toFixed(2)} PKR).`);
      return;
    }

    if (numericAmount > availableBalancePkr) {
      setWithdrawError(`Amount exceeds your available referral balance of ₨${availableBalancePkr.toFixed(2)}.`);
      return;
    }

    if (withdrawMethod !== "VEXARO Wallet") {
      if (!withdrawAccountNumber.trim() || withdrawAccountNumber.trim().length < 8) {
        setWithdrawError("Please enter a valid mobile or bank account number.");
        return;
      }
      if (!withdrawAccountTitle.trim() || withdrawAccountTitle.trim().length < 3) {
        setWithdrawError("Please enter the account holder title/name.");
        return;
      }
    }

    try {
      setWithdrawing(true);
      const res = await fetch("/api/referral/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amountPkr: numericAmount,
          method: withdrawMethod,
          accountNumber: withdrawAccountNumber.trim(),
          accountTitle: withdrawAccountTitle.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to submit withdrawal request.");
      }

      setWithdrawSuccess(data.message || "Withdrawal processed successfully!");
      await loadReferralData();
      setTimeout(() => {
        setShowWithdrawModal(false);
      }, 2500);
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : "Failed to withdraw.");
    } finally {
      setWithdrawing(false);
    }
  }

  // Progress towards $3 minimum
  const progressPercent = Math.min(100, Math.round((availableBalanceUsd / minWithdrawalUsd) * 100));
  const canWithdraw = availableBalanceUsd >= minWithdrawalUsd;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-lime-400/20 bg-gradient-to-br from-[#121c1a] via-[#101b19] to-[#152716] p-6 sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#baff00]/30 bg-[#baff00]/10 px-3.5 py-1 text-xs font-bold text-[#baff00]">
            <span>🎁</span>
            <span>VEXARO Partner Program</span>
          </div>
          <h2 className="mt-4 text-2xl font-black text-white sm:text-4xl">
            Invite Friends &amp; Earn 5% Cash Back
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
            Share your unique invitation link with friends, clients, or on social media. Whenever anyone signs up through your link and places an order, you instantly receive <span className="font-bold text-[#baff00]">5% commission</span>. Once you reach <span className="font-bold text-[#baff00]">$3.00 (₨834 PKR)</span>, you can withdraw directly to Easypaisa, JazzCash, your Bank, or your VEXARO wallet!
          </p>
        </div>
      </div>

      {/* Stats Cards & Withdrawal Unlock Box */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Available Balance & Withdrawal Trigger */}
        <div className="rounded-3xl border border-[#baff00]/30 bg-[#111a1d] p-6 lg:col-span-2">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Available Referral Commission
              </p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-3xl font-black text-[#baff00] sm:text-4xl">
                  ₨{availableBalancePkr.toFixed(2)}
                </span>
                <span className="text-sm font-bold text-slate-400">
                  ≈ ${availableBalanceUsd.toFixed(2)} USD
                </span>
              </div>
            </div>

            <div>
              {canWithdraw ? (
                <button
                  onClick={openWithdrawalModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#baff00] px-6 py-3.5 text-sm font-black text-[#07100f] shadow-[0_4px_25px_rgba(186,255,0,0.3)] transition hover:bg-[#d2ff5a]"
                >
                  <span>💸</span>
                  <span>Withdraw Earnings</span>
                </button>
              ) : (
                <button
                  onClick={openWithdrawalModal}
                  disabled={!canWithdraw}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-slate-400 disabled:cursor-not-allowed opacity-80"
                  title={`Need $${(minWithdrawalUsd - availableBalanceUsd).toFixed(2)} more to reach $${minWithdrawalUsd.toFixed(2)} threshold`}
                >
                  <span>🔒</span>
                  <span>Minimum $3.00 (₨{minWithdrawalPkr.toFixed(0)}) to Withdraw</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar towards $3 threshold */}
          <div className="mt-5 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">
                Payout Threshold Progress:{" "}
                <strong className={canWithdraw ? "text-[#baff00]" : "text-white"}>
                  ${availableBalanceUsd.toFixed(2)} / ${minWithdrawalUsd.toFixed(2)} USD
                </strong>
              </span>
              <span className="font-bold text-[#baff00]">{progressPercent}%</span>
            </div>

            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#0a1110]">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  canWithdraw
                    ? "bg-gradient-to-r from-emerald-500 to-[#baff00]"
                    : "bg-gradient-to-r from-[#baff00]/60 to-[#baff00]"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="mt-2 text-[11px] text-slate-500">
              {canWithdraw
                ? "🎉 You have reached the $3.00 minimum threshold! You can now withdraw to Easypaisa, JazzCash, Bank, or transfer to your VEXARO wallet."
                : `Accumulate ₨${(minWithdrawalPkr - availableBalancePkr > 0 ? minWithdrawalPkr - availableBalancePkr : 0).toFixed(2)} ($${(minWithdrawalUsd - availableBalanceUsd > 0 ? minWithdrawalUsd - availableBalanceUsd : 0).toFixed(2)}) more from friend orders to request a withdrawal.`}
            </p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-3xl border border-white/10 bg-[#111a1d] p-5">
            <p className="text-xs font-semibold text-slate-400">Friends Invited</p>
            <p className="mt-2 text-2xl font-black text-white">{totalInvited}</p>
            <p className="mt-1 text-[11px] text-slate-500">Active accounts</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#111a1d] p-5">
            <p className="text-xs font-semibold text-slate-400">Commission Rate</p>
            <p className="mt-2 text-2xl font-black text-sky-400">{commissionRate}%</p>
            <p className="mt-1 text-[11px] text-slate-500">Lifetime on every order</p>
          </div>

          <div className="col-span-2 rounded-3xl border border-white/10 bg-[#111a1d] p-5">
            <p className="text-xs font-semibold text-slate-400">Lifetime Commission Earned</p>
            <p className="mt-1 text-2xl font-black text-[#baff00]">₨{totalCommission.toFixed(2)}</p>
            <p className="mt-1 text-[11px] text-slate-500">Total earned since joining VEXARO</p>
          </div>
        </div>
      </div>

      {/* Sharing Box */}
      <div className="rounded-3xl border border-white/10 bg-[#111a1d] p-6 sm:p-8">
        <h3 className="text-lg font-black text-white">Your Personal Referral Tools</h3>
        <p className="mt-1 text-xs text-slate-400">
          Anyone who uses your link or code upon registration will be permanently linked to your account.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {/* Link Box */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Referral Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={loading ? "Generating link..." : referralLink}
                className="w-full rounded-xl border border-white/10 bg-[#0a1110] px-4 py-3 text-xs text-slate-200 outline-none sm:text-sm font-mono"
              />
              <button
                onClick={handleCopyLink}
                disabled={loading || !referralLink}
                className="shrink-0 rounded-xl bg-[#baff00] px-5 py-3 text-xs font-black text-[#07100f] transition hover:bg-[#d2ff5a] disabled:opacity-50"
              >
                {copiedLink ? "✓ Copied!" : "Copy Link"}
              </button>
            </div>
          </div>

          {/* Code Box */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Referral Code
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={loading ? "..." : referralCode}
                className="w-full rounded-xl border border-white/10 bg-[#0a1110] px-4 py-3 text-center text-sm font-black tracking-widest text-[#baff00] outline-none"
              />
              <button
                onClick={handleCopyCode}
                disabled={loading || !referralCode}
                className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                {copiedCode ? "✓ Copied!" : "Copy Code"}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Social Sharing */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Share Directly:
          </span>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
              `Join VEXARO SMM Panel with my referral link for lightning-fast social media growth: ${referralLink}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-[#25d366]/10 border border-[#25d366]/30 px-4 py-2.5 text-xs font-bold text-[#25d366] transition hover:bg-[#25d366] hover:text-white"
          >
            <Icon name="whatsapp" size={16} />
            <span>Share on WhatsApp</span>
          </a>

          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(
              referralLink
            )}&text=${encodeURIComponent("Join VEXARO SMM Panel and grow your social media reach instantly!")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-[#2aa8e8]/10 border border-[#2aa8e8]/30 px-4 py-2.5 text-xs font-bold text-[#2aa8e8] transition hover:bg-[#2aa8e8] hover:text-white"
          >
            <Icon name="telegram" size={16} />
            <span>Share on Telegram</span>
          </a>
        </div>
      </div>

      {/* How it works */}
      <div>
        <h3 className="text-xl font-black text-white">How the Program Works</h3>
        <p className="mt-1 text-xs text-slate-400">Earn passive income with 3 simple steps</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400/10 font-black text-[#baff00]">
              1
            </div>
            <h4 className="mt-4 font-bold text-white">Send Your Link</h4>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Share your custom link with friends, clients, or on social channels. When they register, they are bound to your account.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 font-black text-sky-400">
              2
            </div>
            <h4 className="mt-4 font-bold text-white">Friends Order</h4>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Whenever your referred friends fund their wallet and place orders on Instagram, YouTube, TikTok, or WhatsApp.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111a1d] p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 font-black text-emerald-400">
              3
            </div>
            <h4 className="mt-4 font-bold text-white">Cash Out at $3.00</h4>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              You earn 5% on every order. Once you have at least $3.00 (₨834), withdraw to Easypaisa, JazzCash, your Bank, or your VEXARO wallet!
            </p>
          </div>
        </div>
      </div>

      {/* Payout & Withdrawal History */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-white">Withdrawal &amp; Payout History</h3>
            <p className="mt-1 text-xs text-slate-400">Record of all payouts requested from your referral balance</p>
          </div>
          {canWithdraw && (
            <button
              onClick={openWithdrawalModal}
              className="rounded-xl border border-[#baff00]/30 bg-[#baff00]/10 px-4 py-2 text-xs font-bold text-[#baff00] hover:bg-[#baff00] hover:text-[#07100f] transition"
            >
              + New Withdrawal
            </button>
          )}
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-[#121b1d]">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-[#0a1110] text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Method</th>
                <th className="px-5 py-4">Account / Destination</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w) => {
                let badgeClass = "border-amber-500/20 bg-amber-500/10 text-amber-400";
                if (w.status === "Transferred to Wallet" || w.status === "Approved" || w.status === "Completed") {
                  badgeClass = "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
                } else if (w.status === "Rejected") {
                  badgeClass = "border-rose-500/20 bg-rose-500/10 text-rose-400";
                }

                return (
                  <tr key={w.id} className="border-t border-white/10 hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-400">
                      {new Date(w.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 font-semibold text-white">{w.method}</td>
                    <td className="px-5 py-4 text-xs text-slate-300">
                      <p className="font-mono">{w.accountNumber}</p>
                      {w.accountTitle && <p className="text-slate-500">{w.accountTitle}</p>}
                    </td>
                    <td className="px-5 py-4 font-bold text-[#baff00]">
                      ₨{w.amountPkr.toFixed(2)}{" "}
                      <span className="text-xs font-normal text-slate-400">(${w.amountUsd.toFixed(2)})</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                        {w.status}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {withdrawals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    No withdrawals requested yet. Reach $3.00 in referral earnings to cash out!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Referred Friends Table */}
      <div>
        <h3 className="text-xl font-black text-white">Your Referred Friends</h3>
        <p className="mt-1 text-xs text-slate-400">All registered users that joined via your link</p>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-[#121b1d]">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-[#0a1110] text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Date Joined</th>
                <th className="px-5 py-4">Orders Placed</th>
                <th className="px-5 py-4">Commission Earned</th>
                <th className="px-5 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {friends.map((friend) => (
                <tr key={friend.id} className="border-t border-white/10 hover:bg-white/[0.02]">
                  <td className="px-5 py-4 font-semibold text-white">{friend.name}</td>
                  <td className="px-5 py-4 text-slate-400">{friend.email}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                    {new Date(friend.joinedAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-slate-300">{friend.ordersCount}</td>
                  <td className="px-5 py-4 font-bold text-[#baff00]">
                    +₨{friend.commissionEarned.toFixed(2)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                      Active
                    </span>
                  </td>
                </tr>
              ))}

              {friends.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <p className="font-semibold text-slate-300">No friends referred yet</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Copy your referral link above and share it with others to start earning 5% commission!
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* WITHDRAWAL MODAL */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#111a1d] p-7 shadow-2xl">
            <button
              onClick={() => setShowWithdrawModal(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-400/10 font-bold text-[#baff00]">
                💸
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Withdraw Referral Earnings</h3>
                <p className="text-xs text-slate-400">
                  Available: <span className="font-bold text-[#baff00]">₨{availableBalancePkr.toFixed(2)}</span> (${availableBalanceUsd.toFixed(2)})
                </p>
              </div>
            </div>

            {withdrawSuccess && (
              <div className="mt-5 rounded-xl border border-lime-500/30 bg-lime-500/10 p-4 text-xs font-bold text-[#baff00]">
                {withdrawSuccess}
              </div>
            )}

            {withdrawError && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold text-red-400">
                {withdrawError}
              </div>
            )}

            {!withdrawSuccess && (
              <form onSubmit={handleWithdrawSubmit} className="mt-6 space-y-4">
                {/* Method */}
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase text-slate-400">
                    Payout Method
                  </label>
                  <select
                    value={withdrawMethod}
                    onChange={(e) => setWithdrawMethod(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0a1110] px-4 py-3 text-sm text-white outline-none focus:border-[#baff00]"
                  >
                    <option value="Easypaisa">Easypaisa (Mobile Wallet)</option>
                    <option value="JazzCash">JazzCash (Mobile Wallet)</option>
                    <option value="Bank Transfer">Bank Transfer / Sadapay / Nayapay</option>
                    <option value="VEXARO Wallet">Transfer to VEXARO Wallet (Instant)</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <label className="font-bold uppercase text-slate-400">
                      Amount to Withdraw (PKR)
                    </label>
                    <span className="text-slate-500">
                      Min: ₨{minWithdrawalPkr.toFixed(0)} ($3.00)
                    </span>
                  </div>
                  <input
                    type="number"
                    min={minWithdrawalPkr}
                    max={availableBalancePkr}
                    step="0.01"
                    value={withdrawAmountPkr}
                    onChange={(e) => setWithdrawAmountPkr(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0a1110] px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#baff00]"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    ≈ ${(Number(withdrawAmountPkr) / 278.0).toFixed(2)} USD
                  </p>
                </div>

                {withdrawMethod !== "VEXARO Wallet" ? (
                  <>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase text-slate-400">
                        {withdrawMethod === "Bank Transfer" ? "Bank Name & IBAN / Account Number" : "Mobile Account Number"}
                      </label>
                      <input
                        type="text"
                        placeholder={withdrawMethod === "Bank Transfer" ? "e.g. Meezan Bank / PK35MEZN..." : "e.g. 03001234567"}
                        value={withdrawAccountNumber}
                        onChange={(e) => setWithdrawAccountNumber(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#0a1110] px-4 py-3 text-sm text-white outline-none focus:border-[#baff00]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase text-slate-400">
                        Account Holder Name / Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Muhammad Ali"
                        value={withdrawAccountTitle}
                        onChange={(e) => setWithdrawAccountTitle(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#0a1110] px-4 py-3 text-sm text-white outline-none focus:border-[#baff00]"
                      />
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-lime-500/20 bg-lime-500/5 p-4 text-xs text-lime-300">
                    💡 <strong className="text-white">Instant Credit:</strong> This will instantly transfer the funds to your main VEXARO wallet balance so you can immediately place orders without any approval delay.
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    className="w-1/2 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold text-slate-300 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={withdrawing || !canWithdraw}
                    className="w-1/2 rounded-xl bg-[#baff00] py-3 text-xs font-black text-[#07100f] transition hover:bg-[#d2ff5a] disabled:opacity-50"
                  >
                    {withdrawing ? "Processing..." : "Confirm Payout"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- API DOCUMENTATION & KEYS ---------------- */

function ApiPage({ currentUser }: { currentUser: CurrentUser | null }) {
  const [apiKey, setApiKey] = useState("");
  const [loadingKey, setLoadingKey] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [selectedLang, setSelectedLang] = useState<"cURL" | "Python" | "Node.js" | "PHP">("cURL");
  const [selectedAction, setSelectedAction] = useState<"services" | "balance" | "add" | "status" | "refill">("services");

  const apiUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/v2`
      : "https://yourdomain.com/api/v2";

  useEffect(() => {
    async function loadApiKey() {
      try {
        setLoadingKey(true);
        const res = await fetch("/api/user/api-key", {
          cache: "no-store",
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok && data.success && data.apiKey) {
          setApiKey(data.apiKey);
        }
      } catch (err) {
        console.error("Failed to load API key:", err);
      } finally {
        setLoadingKey(false);
      }
    }
    loadApiKey();
  }, []);

  async function handleRegenerateKey() {
    if (!confirm("Are you sure you want to regenerate your API key? Any existing applications or bots using your old key will be disconnected.")) {
      return;
    }

    try {
      setRegenerating(true);
      const res = await fetch("/api/user/api-key", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success && data.apiKey) {
        setApiKey(data.apiKey);
        alert("Your new API key has been generated successfully.");
      }
    } catch (err) {
      alert("Failed to regenerate API key.");
    } finally {
      setRegenerating(false);
    }
  }

  function handleCopyKey() {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  function handleCopyUrl() {
    navigator.clipboard.writeText(apiUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  // Code snippet generator
  const currentSnippet = useMemo(() => {
    const effectiveKey = apiKey || "YOUR_API_KEY";

    if (selectedAction === "services") {
      if (selectedLang === "cURL") {
        return `curl -X POST "${apiUrl}" \\
  -d "key=${effectiveKey}" \\
  -d "action=services"`;
      }
      if (selectedLang === "Python") {
        return `import requests

url = "${apiUrl}"
payload = {
    "key": "${effectiveKey}",
    "action": "services"
}

response = requests.post(url, data=payload)
print(response.json())`;
      }
      if (selectedLang === "Node.js") {
        return `const response = await fetch("${apiUrl}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    key: "${effectiveKey}",
    action: "services"
  })
});
const services = await response.json();
console.log(services);`;
      }
      if (selectedLang === "PHP") {
        return `<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "${apiUrl}");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'key' => '${effectiveKey}',
    'action' => 'services'
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
print_r(json_decode($response, true));
?>`;
      }
    }

    if (selectedAction === "balance") {
      if (selectedLang === "cURL") {
        return `curl -X POST "${apiUrl}" \\
  -d "key=${effectiveKey}" \\
  -d "action=balance"`;
      }
      if (selectedLang === "Python") {
        return `import requests

response = requests.post("${apiUrl}", data={
    "key": "${effectiveKey}",
    "action": "balance"
})
print(response.json())`;
      }
      if (selectedLang === "Node.js") {
        return `const res = await fetch("${apiUrl}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ key: "${effectiveKey}", action: "balance" })
});
console.log(await res.json());`;
      }
      if (selectedLang === "PHP") {
        return `<?php
$ch = curl_init("${apiUrl}");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'key' => '${effectiveKey}',
    'action' => 'balance'
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
echo curl_exec($ch);
curl_close($ch);
?>`;
      }
    }

    if (selectedAction === "add") {
      if (selectedLang === "cURL") {
        return `curl -X POST "${apiUrl}" \\
  -d "key=${effectiveKey}" \\
  -d "action=add" \\
  -d "service=102" \\
  -d "link=https://instagram.com/p/Cxyz" \\
  -d "quantity=1000"`;
      }
      if (selectedLang === "Python") {
        return `import requests

payload = {
    "key": "${effectiveKey}",
    "action": "add",
    "service": "102",
    "link": "https://instagram.com/p/Cxyz",
    "quantity": 1000
}
response = requests.post("${apiUrl}", data=payload)
print(response.json())`;
      }
      if (selectedLang === "Node.js") {
        return `const res = await fetch("${apiUrl}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    key: "${effectiveKey}",
    action: "add",
    service: "102",
    link: "https://instagram.com/p/Cxyz",
    quantity: 1000
  })
});
console.log(await res.json());`;
      }
      if (selectedLang === "PHP") {
        return `<?php
$ch = curl_init("${apiUrl}");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'key' => '${effectiveKey}',
    'action' => 'add',
    'service' => 102,
    'link' => 'https://instagram.com/p/Cxyz',
    'quantity' => 1000
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
echo curl_exec($ch);
curl_close($ch);
?>`;
      }
    }

    if (selectedAction === "status") {
      if (selectedLang === "cURL") {
        return `curl -X POST "${apiUrl}" \\
  -d "key=${effectiveKey}" \\
  -d "action=status" \\
  -d "order=12345"`;
      }
      if (selectedLang === "Python") {
        return `import requests

response = requests.post("${apiUrl}", data={
    "key": "${effectiveKey}",
    "action": "status",
    "order": 12345
})
print(response.json())`;
      }
      if (selectedLang === "Node.js") {
        return `const res = await fetch("${apiUrl}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ key: "${effectiveKey}", action: "status", order: "12345" })
});
console.log(await res.json());`;
      }
      if (selectedLang === "PHP") {
        return `<?php
$ch = curl_init("${apiUrl}");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'key' => '${effectiveKey}',
    'action' => 'status',
    'order' => 12345
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
echo curl_exec($ch);
curl_close($ch);
?>`;
      }
    }

    if (selectedAction === "refill") {
      if (selectedLang === "cURL") {
        return `curl -X POST "${apiUrl}" \\
  -d "key=${effectiveKey}" \\
  -d "action=refill" \\
  -d "order=12345"`;
      }
      if (selectedLang === "Python") {
        return `import requests

response = requests.post("${apiUrl}", data={
    "key": "${effectiveKey}",
    "action": "refill",
    "order": 12345
})
print(response.json())`;
      }
      if (selectedLang === "Node.js") {
        return `const res = await fetch("${apiUrl}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ key: "${effectiveKey}", action: "refill", order: "12345" })
});
console.log(await res.json());`;
      }
      if (selectedLang === "PHP") {
        return `<?php
$ch = curl_init("${apiUrl}");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'key' => '${effectiveKey}',
    'action' => 'refill',
    'order' => 12345
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
echo curl_exec($ch);
curl_close($ch);
?>`;
      }
    }

    return "";
  }, [selectedAction, selectedLang, apiKey, apiUrl]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-white">API Documentation</h2>
        <p className="mt-2 text-sm text-slate-400">
          Connect your SMM reseller panel, website, or custom scripts directly with VEXARO via standard HTTP POST API.
        </p>
      </div>

      {/* Top Credentials Box */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Endpoint URL */}
        <div className="rounded-3xl border border-white/10 bg-[#111a1d] p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              API Endpoint URL
            </span>
            <span className="rounded-md border border-lime-400/30 bg-lime-400/10 px-2 py-0.5 text-[10px] font-black text-[#baff00]">
              HTTP POST
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={apiUrl}
              className="w-full rounded-xl border border-white/10 bg-[#0a1110] px-4 py-3 text-xs text-slate-200 outline-none sm:text-sm font-mono"
            />
            <button
              onClick={handleCopyUrl}
              className="shrink-0 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-xs font-bold text-white transition hover:bg-white/10"
            >
              {copiedUrl ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Accepts <code className="text-slate-300">application/json</code> or <code className="text-slate-300">application/x-www-form-urlencoded</code>
          </p>
        </div>

        {/* API Key */}
        <div className="rounded-3xl border border-white/10 bg-[#111a1d] p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Your Secret API Key
            </span>
            <button
              onClick={() => setShowKey(!showKey)}
              className="text-xs font-bold text-[#baff00] hover:underline"
            >
              {showKey ? "Hide Key" : "Show Key"}
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              type={showKey ? "text" : "password"}
              readOnly
              value={loadingKey ? "Loading API key..." : apiKey}
              className="w-full rounded-xl border border-white/10 bg-[#0a1110] px-4 py-3 text-xs text-slate-200 outline-none sm:text-sm font-mono"
            />
            <button
              onClick={handleCopyKey}
              disabled={loadingKey || !apiKey}
              className="shrink-0 rounded-xl bg-[#baff00] px-4 py-3 text-xs font-black text-[#07100f] transition hover:bg-[#d2ff5a] disabled:opacity-50"
            >
              {copiedKey ? "✓ Copied" : "Copy"}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">Keep your API key private. Do not share it publicly.</p>
            <button
              onClick={handleRegenerateKey}
              disabled={regenerating}
              className="text-xs font-bold text-rose-400 hover:text-rose-300 hover:underline disabled:opacity-50"
            >
              {regenerating ? "Regenerating..." : "↻ Regenerate Key"}
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Documentation */}
      <div className="rounded-3xl border border-white/10 bg-[#111a1d] p-6 sm:p-8">
        <h3 className="text-xl font-black text-white">API Methods &amp; Actions</h3>
        <p className="mt-1 text-xs text-slate-400">
          Select an action to inspect required parameters and live code snippets.
        </p>

        {/* Action Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-white/10 pb-4">
          {[
            ["services", "Service List"],
            ["balance", "Check Balance"],
            ["add", "Add Order"],
            ["status", "Order Status"],
            ["refill", "Refill Order"],
          ].map(([act, label]) => {
            const isActive = selectedAction === act;
            return (
              <button
                key={act}
                onClick={() => setSelectedAction(act as any)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition sm:text-sm ${
                  isActive
                    ? "bg-[#baff00] text-[#07100f]"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Action Parameter Details */}
        <div className="mt-6">
          <div className="rounded-2xl border border-white/10 bg-[#0a1110] p-4 text-xs">
            <span className="font-bold text-[#baff00]">Action: </span>
            <code className="text-slate-200">{selectedAction}</code>
            {selectedAction === "services" && (
              <p className="mt-1 text-slate-400">Returns list of all active services with rates, min/max limits, and refill eligibility.</p>
            )}
            {selectedAction === "balance" && (
              <p className="mt-1 text-slate-400">Returns your current VEXARO wallet balance in PKR.</p>
            )}
            {selectedAction === "add" && (
              <p className="mt-1 text-slate-400">
                Required parameters: <code className="text-slate-200">service</code> (ID), <code className="text-slate-200">link</code> (URL/handle), <code className="text-slate-200">quantity</code> (int).
              </p>
            )}
            {selectedAction === "status" && (
              <p className="mt-1 text-slate-400">
                Required parameter: <code className="text-slate-200">order</code> (Order ID). Returns status, start count, remains, and charge.
              </p>
            )}
            {selectedAction === "refill" && (
              <p className="mt-1 text-slate-400">
                Required parameter: <code className="text-slate-200">order</code> (Order ID). Submits a refill request to the provider.
              </p>
            )}
          </div>
        </div>

        {/* Code Snippets */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Code Example
            </span>
            <div className="flex gap-2">
              {(["cURL", "Python", "Node.js", "PHP"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    selectedLang === lang
                      ? "bg-white/20 text-white"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mt-3">
            <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-[#070d0d] p-5 font-mono text-xs text-lime-300">
              {currentSnippet}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(currentSnippet);
                alert("Code snippet copied to clipboard!");
              }}
              className="absolute right-3 top-3 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/10"
            >
              Copy Code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 24/7 SUPPORT CENTER ---------------- */

type SupportTicket = {
  id: string;
  subject: string;
  category: string;
  orderId: string | null;
  message: string;
  status: string;
  createdAt: string;
};

function SupportPage({
  currentUser,
  orders,
}: {
  currentUser: CurrentUser | null;
  orders: VexoOrder[];
}) {
  const [activeTab, setActiveTab] = useState<"direct" | "tickets">("direct");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Order Delivery Issue");
  const [orderId, setOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  async function loadTickets() {
    try {
      setLoadingTickets(true);
      const res = await fetch("/api/support/tickets", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.tickets)) {
        setTickets(data.tickets);
      }
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!subject.trim() || subject.trim().length < 3) {
      setFormError("Please enter a subject (at least 3 characters).");
      return;
    }

    if (!message.trim() || message.trim().length < 10) {
      setFormError("Please describe your issue in detail (at least 10 characters).");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          orderId: orderId.trim() || null,
          message: message.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to submit ticket.");
      }

      setFormSuccess(data.message || "Ticket created successfully!");
      setSubject("");
      setOrderId("");
      setMessage("");
      loadTickets();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  const faqs = [
    {
      q: "How fast do social media orders start?",
      a: "Most automated services start within 1 to 15 minutes of placing your order. High-speed or guaranteed services update in real time. If a service experiences network delays, you can check its status in the Orders tab or message our support team.",
    },
    {
      q: "What is a Refill and how do I request one?",
      a: "If followers or engagement experience natural platform drops on refill-eligible services, navigate to the Orders tab -> 'Completed' orders, and click the '↻ Refill' button. Our provider will immediately re-deliver the dropped quantity free of charge.",
    },
    {
      q: "How fast are manual Easypaisa/JazzCash deposits approved?",
      a: "Manual deposit requests submitted via the 'Add Funds' tab are reviewed by administrators typically within 5 to 20 minutes. Once approved, your wallet balance updates automatically.",
    },
    {
      q: "What happens if an order fails or gets cancelled?",
      a: "VEXARO features automatic wallet protection. Whenever an order cannot be completed or is cancelled by providers, 100% of the charge is automatically credited back to your VEXARO wallet balance. You can review all refund details in the 'Refunds' sub-tab.",
    },
    {
      q: "Can I resell VEXARO services through my own panel or bot?",
      a: "Yes! VEXARO provides a standard v2 SMM Reseller API. You can generate your personal API Key from the 'API' tab and integrate VEXARO into your own website, script, or Telegram bot with full automation.",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-white">24/7 Support Center</h2>
        <p className="mt-2 text-sm text-slate-400">
          Get help directly from our team via Telegram, WhatsApp, or through our ticket tracking system.
        </p>
      </div>

      {/* Fast Direct Connect Cards */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Telegram Card */}
        <div className="relative overflow-hidden rounded-3xl border border-[#2aa8e8]/30 bg-gradient-to-br from-[#0c1820] to-[#122633] p-7 transition duration-300 hover:border-[#2aa8e8]/60">
          <div className="flex items-start justify-between">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2aa8e8]/10 text-[#2aa8e8] ring-1 ring-[#2aa8e8]/30">
              <Icon name="telegram" size={30} />
            </div>

            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span>Online • &lt; 5 min response</span>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Telegram Direct Chat</p>
            <h3 className="mt-1 text-2xl font-black text-white">@VexaroSMMAdmin</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Connect directly with our official management on Telegram. Fastest channel for immediate order acceleration, refill checks, and custom solutions.
            </p>
          </div>

          <div className="mt-6">
            <a
              href="https://t.me/VexaroSMMAdmin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2aa8e8] py-3.5 text-center text-sm font-black text-white transition hover:bg-[#2297d2] shadow-[0_4px_20px_rgba(42,168,232,0.25)]"
            >
              <Icon name="telegram" size={18} />
              <span>Open Telegram Chat (@VexaroSMMAdmin)</span>
            </a>
          </div>
        </div>

        {/* WhatsApp Direct Card */}
        <div className="relative overflow-hidden rounded-3xl border border-[#25d366]/30 bg-gradient-to-br from-[#0c1c15] to-[#132d20] p-7 transition duration-300 hover:border-[#25d366]/60">
          <div className="flex items-start justify-between">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25d366]/10 text-[#25d366] ring-1 ring-[#25d366]/30">
              <Icon name="whatsapp" size={30} />
            </div>

            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span>Online • &lt; 15 min response</span>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase font-bold tracking-wider text-slate-400">WhatsApp Business Support</p>
            <h3 className="mt-1 text-2xl font-black text-white">+92 317 6437013</h3>
            <p className="text-xs text-[#25d366] font-medium mt-0.5">Username: @VexaroSMMAdmin</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Message VEXARO SMM Admin directly on WhatsApp for instant deposit verifications, order acceleration, custom bulk packages, and 24/7 dedicated support.
            </p>
          </div>

          <div className="mt-6">
            <a
              href="https://wa.me/923176437013"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25d366] py-3.5 text-center text-sm font-black text-[#07100f] transition hover:bg-[#20bd5a] shadow-[0_4px_20px_rgba(37,211,102,0.25)]"
            >
              <Icon name="whatsapp" size={18} />
              <span>Chat on WhatsApp (+92 317 6437013)</span>
            </a>
          </div>
        </div>

        {/* WhatsApp Channel Card */}
        <div className="relative overflow-hidden rounded-3xl border border-lime-400/30 bg-gradient-to-br from-[#0c1f15] to-[#122e1b] p-7 transition duration-300 hover:border-lime-400/60">
          <div className="flex items-start justify-between">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-400/10 text-[#baff00] ring-1 ring-lime-400/30">
              <Icon name="whatsapp" size={30} />
            </div>

            <div className="flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-xs font-bold text-[#baff00]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#baff00]" />
              <span>Broadcast • 24/7 Alerts</span>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Official Updates Channel</p>
            <h3 className="mt-1 text-2xl font-black text-white">VEXARO Channel</h3>
            <p className="text-xs text-[#baff00] font-medium mt-0.5">WhatsApp Official Broadcast</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Follow our WhatsApp Channel for instant service restock notices, price drop alerts, flash discount coupon codes, and live maintenance updates.
            </p>
          </div>

          <div className="mt-6">
            <a
              href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#baff00] py-3.5 text-center text-sm font-black text-[#07100f] transition hover:bg-[#d2ff5a] shadow-[0_4px_20px_rgba(186,255,0,0.25)]"
            >
              <Icon name="whatsapp" size={18} />
              <span>Follow WhatsApp Channel</span>
            </a>
          </div>
        </div>
      </div>

      {/* Ticket Management Section */}
      <div className="rounded-3xl border border-white/10 bg-[#111a1d] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h3 className="text-xl font-black text-white">In-App Support Tickets</h3>
            <p className="mt-1 text-xs text-slate-400">
              Submit a support ticket and track administrative updates.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("direct")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "direct"
                  ? "bg-[#baff00] text-[#07100f]"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              Submit Ticket
            </button>
            <button
              onClick={() => setActiveTab("tickets")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "tickets"
                  ? "bg-[#baff00] text-[#07100f]"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>My Tickets</span>
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px]">
                {tickets.length}
              </span>
            </button>
          </div>
        </div>

        {/* Tab 1: Submit Form */}
        {activeTab === "direct" && (
          <form onSubmit={handleCreateTicket} className="mt-6 max-w-2xl space-y-4">
            {formSuccess && (
              <div className="rounded-xl border border-lime-500/30 bg-lime-500/10 p-4 text-xs font-bold text-[#baff00]">
                {formSuccess}
              </div>
            )}
            {formError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold text-red-400">
                {formError}
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-slate-400">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0a1110] px-4 py-3 text-sm text-white outline-none focus:border-[#baff00]"
              >
                <option value="Order Delivery Issue">Order Delivery Issue</option>
                <option value="Refill Request">Refill Request</option>
                <option value="Deposit / Payment Verification">Deposit / Payment Verification</option>
                <option value="API / Reseller Question">API / Reseller Question</option>
                <option value="General Inquiry">General Inquiry</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-slate-400">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Order #12345 delivery speed issue"
                className="w-full rounded-xl border border-white/10 bg-[#0a1110] px-4 py-3 text-sm text-white outline-none focus:border-[#baff00]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-slate-400">
                Order ID <span className="text-[10px] font-normal text-slate-500">(Optional)</span>
              </label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. 12345 or select from Orders"
                className="w-full rounded-xl border border-white/10 bg-[#0a1110] px-4 py-3 text-sm text-white outline-none focus:border-[#baff00]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-slate-400">
                Detailed Message
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please describe your question or issue with as much detail as possible..."
                className="w-full rounded-xl border border-white/10 bg-[#0a1110] px-4 py-3 text-sm text-white outline-none focus:border-[#baff00]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#baff00] px-6 py-3.5 text-xs font-black text-[#07100f] transition hover:bg-[#d2ff5a] disabled:opacity-50"
            >
              {submitting ? "Submitting Ticket..." : "Submit Ticket"}
            </button>
          </form>
        )}

        {/* Tab 2: My Tickets */}
        {activeTab === "tickets" && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-[#0a1110] text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Ticket ID</th>
                  <th className="px-5 py-4">Subject</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Order Ref</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="border-t border-white/10 hover:bg-white/[0.02]">
                    <td className="px-5 py-4 font-mono font-bold text-white">#{t.id.slice(0, 8)}</td>
                    <td className="max-w-[260px] px-5 py-4">
                      <p className="font-semibold text-white">{t.subject}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">{t.message}</p>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-300">{t.category}</td>
                    <td className="px-5 py-4 text-xs font-mono text-slate-400">
                      {t.orderId ? `#${t.orderId}` : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          t.status === "Resolved"
                            ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : t.status === "In Review"
                            ? "border border-sky-500/20 bg-sky-500/10 text-sky-400"
                            : "border border-amber-500/20 bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      You have not submitted any support tickets yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Frequently Asked Questions */}
      <div>
        <h3 className="text-xl font-black text-white">Frequently Asked Questions</h3>
        <p className="mt-1 text-xs text-slate-400">Quick answers to common questions</p>

        <div className="mt-4 space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = faqOpen === idx;
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#111a1d] transition"
              >
                <button
                  onClick={() => setFaqOpen(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-bold text-white transition hover:bg-white/5"
                >
                  <span>{faq.q}</span>
                  <span className="text-slate-500">{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-white/5 bg-[#0a1110] px-6 py-4 text-xs leading-relaxed text-slate-300">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}