"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MassOrderPage } from "./mass-order";
import { SubscriptionsPage } from "./subscriptions";
import BonusCelebrationModal from "@/components/bonus-celebration-modal";

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
  enabled?: boolean;
};

export type PlatformTheme = "dark" | "light" | "midnight" | "purple";

export const THEME_OPTIONS: { id: PlatformTheme; name: string; icon: string; dot: string }[] = [
  { id: "dark", name: "Cyber Dark", icon: "⚡", dot: "#baff00" },
  { id: "light", name: "Clean Light", icon: "☀️", dot: "#10b981" },
  { id: "midnight", name: "Midnight Navy", icon: "🌌", dot: "#38bdf8" },
  { id: "purple", name: "Neon Purple", icon: "🔮", dot: "#c084fc" },
];

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
  startCount?: string | null;
  remains?: string | null;
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

  const rawDesc = String(item.desc || (item as any).description || "").trim();
  const normText = `${item.name} ${item.category || ""} ${rawDesc}`.replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-");
  const isDrop = /no[\s-]*refill|without[\s-]*refill|refill[\s:]*no|refill[\s:]*0|0%[\s-]*refill|drop[\s-]*100%|100%[\s-]*drop|drop[\s-]*able|dropable|high[\s-]*drop|drop[\s-]*high|no[\s-]*guarantee|non[\s-]*guaranteed|not[\s-]*guaranteed|can[\s-]*drop|drop[\s-]*possible/i.test(normText);
  const isG = isDrop ? false : Boolean((item as any).is_guaranteed || item.refill);
  const isRefill = isDrop ? false : Boolean(item.refill || isG);

  return {
    id: item.service,
    platform: normalizedPlatform,
    icon,
    name: item.name,
    type: item.type,
    description:
      rawDesc ||
      `${item.type} service • ${item.average_time || "Fast delivery"}`,
    price: retailPkr.toFixed(4),
    rate_usd: retailUsd,
    rate_pkr: retailPkr,
    base_rate_usd: baseUsd,
    min: String(item.min),
    max: String(item.max),
    category: item.category,
    refill: isRefill,
    is_guaranteed: isG,
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
  const [bonusBalancePkr, setBonusBalancePkr] = useState(0);
  const [bonusCelebration, setBonusCelebration] = useState<{ amount: number; claimKey?: string } | null>(null);
  const totalAvailablePkr = walletBalancePkr + bonusBalancePkr;
  const [sadaPayNumber, setSadaPayNumber] = useState("03197008275");
  const [sadaPayTitle, setSadaPayTitle] = useState("Saeed Bashir");
  const [binanceUid, setBinanceUid] = useState("1069021883");
  const [binanceName, setBinanceName] = useState("Talha Bashir Bhatti");
  const [binanceUsdtAddress, setBinanceUsdtAddress] = useState("0xaa3037450e112ef10406df821803522bc589821c");
  const [binanceNetwork, setBinanceNetwork] = useState("BSC BNB Smart Chain (BEP20)");
  const [liveForexUsdRate, setLiveForexUsdRate] = useState(278.0);
  const [deposits, setDeposits] = useState<VexoDeposit[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState("PKR");
  const [currencyRates, setCurrencyRates] = useState<Record<string, number>>({});
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [announcements, setAnnouncements] = useState<VexoAnnouncement[]>([]);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const announcementsRef = useRef<HTMLDivElement>(null);
  const [notificationFilter, setNotificationFilter] = useState<"all" | "orders" | "announcements">("all");
  const [readNotificationKeys, setReadNotificationKeys] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem("vexo_read_notifications");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const markAllNotificationsAsRead = () => {
    const updated: Record<string, boolean> = { ...readNotificationKeys };
    announcements.forEach((a) => {
      updated[`ann_${a.id}`] = true;
    });
    orders.forEach((o) => {
      updated[`ord_${o.orderId || o.localId}`] = true;
    });
    updated["system_status_1"] = true;
    setReadNotificationKeys(updated);
    try {
      localStorage.setItem("vexo_read_notifications", JSON.stringify(updated));
    } catch {}
  };

  const markSingleNotificationAsRead = (key: string) => {
    setReadNotificationKeys((prev) => {
      const updated = { ...prev, [key]: true };
      try {
        localStorage.setItem("vexo_read_notifications", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Record<string, boolean>>({});
  const [expandedMobileAnnouncement, setExpandedMobileAnnouncement] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<PlatformTheme>("dark");
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = (localStorage.getItem("vexo_platform_theme") || document.documentElement.getAttribute("data-theme") || "dark") as PlatformTheme;
      const valid = (["dark", "light", "midnight", "purple"].includes(stored) ? stored : "dark") as PlatformTheme;
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
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (announcementsRef.current && !announcementsRef.current.contains(e.target as Node)) {
        setAnnouncementsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentThemeOption = useMemo(() => {
    return THEME_OPTIONS.find((t) => t.id === currentTheme) || THEME_OPTIONS[0];
  }, [currentTheme]);

  function handleCloseCelebration() {
    if (bonusCelebration?.claimKey) {
      try {
        localStorage.setItem(bonusCelebration.claimKey, "1");
      } catch {}
    }
    setBonusCelebration(null);
  }

  function handleOrderNowCelebration() {
    handleCloseCelebration();
    navigate("New Order");
  }

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("vexo_new_user_bonus");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.granted && parsed?.amount > 0) {
          setBonusCelebration({
            amount: Number(parsed.amount),
            claimKey: "vexo_new_user_bonus_celebrated",
          });
        }
        sessionStorage.removeItem("vexo_new_user_bonus");
      }
    } catch {}
  }, []);

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

  useEffect(() => {
    if (activePage === "Orders") {
      loadOrders();
    }
  }, [activePage]);

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
      setBonusBalancePkr(Number(data.bonusBalancePkr || 0));
      if (data.sadaPayNumber) setSadaPayNumber(String(data.sadaPayNumber));
      if (data.sadaPayTitle) setSadaPayTitle(String(data.sadaPayTitle));
      if (data.binanceUid) setBinanceUid(String(data.binanceUid));
      if (data.binanceName) setBinanceName(String(data.binanceName));
      if (data.binanceUsdtAddress) setBinanceUsdtAddress(String(data.binanceUsdtAddress));
      if (data.binanceNetwork) setBinanceNetwork(String(data.binanceNetwork));
      if (data.liveUsdRate) setLiveForexUsdRate(Number(data.liveUsdRate));
      setDeposits(Array.isArray(data.deposits) ? data.deposits : []);

      // Check if user has an active bonus to celebrate (both newly registered and existing registered users)
      const currentBonus = Number(data.bonusBalancePkr || 0);
      if (currentBonus > 0) {
        const claimId =
          data.bonusClaim?.claimReference ||
          data.bonusClaim?.grantedAt ||
          data.bonusClaim?.id ||
          `balance_${currentBonus}`;
        const claimKey = `vexo_celebrated_bonus_${claimId}`;
        try {
          const alreadyCelebrated = localStorage.getItem(claimKey);
          if (!alreadyCelebrated) {
            setBonusCelebration({
              amount: Number(data.bonusClaim?.amount || currentBonus),
              claimKey,
            });
          }
        } catch {}
      }
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

  const [buyAgainPrefill, setBuyAgainPrefill] = useState<{
    serviceId?: number | string;
    link?: string;
    quantity?: number;
    unavailableNotice?: string;
  } | null>(null);

  function handleOrderService(serviceId: number | string) {
    setBuyAgainPrefill(null);
    setSelectedServiceId(String(serviceId));
    setActivePage("New Order");
    setSidebarOpen(false);
  }

  function handleBuyAgain(order: VexoOrder) {
    const serviceExists = services.some(
      (s) => String(s.id) === String(order.serviceId) && s.enabled !== false
    );

    if (serviceExists) {
      setSelectedServiceId(String(order.serviceId));
      setBuyAgainPrefill({
        serviceId: order.serviceId,
        link: order.link,
        quantity: order.quantity,
      });
    } else {
      setSelectedServiceId("");
      setBuyAgainPrefill({
        link: order.link,
        quantity: order.quantity,
        unavailableNotice: `The service "${order.service}" is currently unavailable. Please select an active alternative from the catalog below.`,
      });
    }

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
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl overflow-hidden shadow-[0_0_24px_rgba(186,255,0,0.35)] border border-[#baff00]/30">
            <img
              src="/logo.png"
              alt="VEXARO SMM"
              className="h-full w-full object-cover"
            />
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

            {/* Growth Blog & Guides Link */}
            <div className="mt-3">
              <a
                href="/blog"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs font-bold text-slate-300 transition hover:border-[#baff00]/40 hover:bg-white/[0.08] hover:text-white"
                title="Read SMM tutorials, algorithm updates & growth guides"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">📚</span>
                  <span>Growth Blog &amp; Guides</span>
                </div>
                <span className="text-[10px] text-[#baff00] font-bold">↗</span>
              </a>
            </div>

            {/* WhatsApp Channel Link */}
            <div className="mt-2">
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
            <div className="min-w-0 flex-1 md:hidden flex items-center gap-2.5">
              <div className="relative h-8 w-8 shrink-0 rounded-lg overflow-hidden border border-[#baff00]/30 shadow-[0_0_10px_rgba(186,255,0,0.3)]">
                <img src="/logo.png" alt="VEXARO" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">VEXARO</p>
                <h1 className="text-sm sm:text-base font-black text-white truncate leading-tight">{activePage}</h1>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 sm:gap-2.5">
            {/* Quick Notification Feed Box */}
            <div className="relative shrink-0" ref={announcementsRef}>
              {(() => {
                const unreadAnnouncements = announcements.filter((a) => !readNotificationKeys[`ann_${a.id}`]).length;
                const unreadOrders = orders.slice(0, 6).filter((o) => !readNotificationKeys[`ord_${o.orderId || o.localId}`]).length;
                const unreadSystem = !readNotificationKeys["system_status_1"] ? 1 : 0;
                const totalUnread = unreadAnnouncements + unreadOrders + unreadSystem;

                return (
                  <>
                    <button
                      type="button"
                      onClick={() => setAnnouncementsOpen(!announcementsOpen)}
                      className="relative rounded-xl border border-white/10 bg-white/5 p-2 sm:p-2.5 text-slate-200 transition hover:border-[#baff00]/40 hover:text-[#baff00] shrink-0 cursor-pointer"
                      title="View Notification Center & Order Updates"
                      aria-label="Notification Center"
                    >
                      <Icon name="bell" size={17} />
                      {totalUnread > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-[#baff00] text-[9px] sm:text-[10px] font-black text-[#07100f] ring-2 ring-[#0b1418] animate-pulse">
                          {totalUnread > 9 ? "9+" : totalUnread}
                        </span>
                      )}
                    </button>

                    {announcementsOpen && (
                      <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 top-20 sm:top-full sm:mt-2 w-auto sm:w-[clamp(21rem,92vw,26rem)] z-50 rounded-2xl border border-white/15 bg-[#0b1418]/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(186,255,0,0.06)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
                        {/* Feed Drawer Header */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#baff00]/15 text-[#baff00]">
                              <Icon name="bell" size={15} />
                            </span>
                            <div>
                              <h4 className="text-xs sm:text-sm font-black text-white">
                                Notification Center
                              </h4>
                              <p className="text-[10px] text-slate-400">
                                {totalUnread > 0 ? `${totalUnread} unread notifications` : "All notifications read"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {totalUnread > 0 && (
                              <button
                                type="button"
                                onClick={markAllNotificationsAsRead}
                                className="text-[10px] font-bold text-[#baff00] hover:underline cursor-pointer"
                              >
                                Mark all read
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setAnnouncementsOpen(false)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
                              aria-label="Close notifications"
                            >
                              <Icon name="x" size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Filter Sub-Tabs */}
                        <div className="mt-3 flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/5 text-[11px] font-bold">
                          <button
                            type="button"
                            onClick={() => setNotificationFilter("all")}
                            className={`flex-1 py-1 rounded-lg transition text-center cursor-pointer ${
                              notificationFilter === "all"
                                ? "bg-white/15 text-white shadow-sm"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            All ({announcements.length + Math.min(orders.length, 6) + 1})
                          </button>
                          <button
                            type="button"
                            onClick={() => setNotificationFilter("orders")}
                            className={`flex-1 py-1 rounded-lg transition text-center cursor-pointer ${
                              notificationFilter === "orders"
                                ? "bg-white/15 text-white shadow-sm"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Orders ({Math.min(orders.length, 6)})
                          </button>
                          <button
                            type="button"
                            onClick={() => setNotificationFilter("announcements")}
                            className={`flex-1 py-1 rounded-lg transition text-center cursor-pointer ${
                              notificationFilter === "announcements"
                                ? "bg-white/15 text-white shadow-sm"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            News ({announcements.length + 1})
                          </button>
                        </div>

                        {/* Scrollable Feed List */}
                        <div className="mt-3 max-h-[60vh] overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
                          {/* Live System Notice */}
                          {(notificationFilter === "all" || notificationFilter === "announcements") && (
                            <div className="rounded-xl border border-[#baff00]/30 bg-gradient-to-r from-[#baff00]/10 to-transparent p-3 transition space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-[#baff00]">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#baff00] animate-pulse" />
                                  System Health &amp; Gateway
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">Live</span>
                              </div>
                              <p className="text-xs text-white font-medium leading-relaxed">
                                Instagram &amp; TikTok high-speed dispatches operational (5k/day). 0% fee SadaPay, JazzCash &amp; Binance Pay deposit channels verified.
                              </p>
                            </div>
                          )}

                          {/* Order Status Updates */}
                          {(notificationFilter === "all" || notificationFilter === "orders") && (
                            orders.slice(0, 6).map((ord) => {
                              const key = `ord_${ord.orderId || ord.localId}`;
                              const isUnread = !readNotificationKeys[key];
                              const statusLower = ord.status.toLowerCase();
                              const isComplete = statusLower === "completed";
                              const isCancel = ["cancelled", "canceled"].includes(statusLower);

                              return (
                                <div
                                  key={ord.localId}
                                  onClick={() => {
                                    markSingleNotificationAsRead(key);
                                    navigate("Orders");
                                    setAnnouncementsOpen(false);
                                  }}
                                  className={`rounded-xl border p-3 transition cursor-pointer hover:border-white/20 ${
                                    isUnread
                                      ? "border-[#baff00]/40 bg-white/[0.06]"
                                      : "border-white/5 bg-white/[0.02]"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                                        isComplete ? "bg-emerald-500/20 text-emerald-400" : isCancel ? "bg-rose-500/20 text-rose-400" : "bg-amber-400/20 text-amber-300"
                                      }`}>
                                        {isComplete ? "✓" : isCancel ? "✕" : "↻"}
                                      </span>
                                      <p className="text-xs font-bold text-white truncate">
                                        Order {ord.orderId ? `#${ord.orderId}` : `#${ord.localId}`}
                                      </p>
                                    </div>
                                    <StatusPill status={ord.status} />
                                  </div>
                                  <p className="mt-1.5 text-xs text-slate-300 truncate">
                                    {ord.service} · {ord.quantity.toLocaleString()} units
                                  </p>
                                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                                    <span className="font-mono">
                                      {ord.createdAt ? new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}
                                    </span>
                                    <span className="text-[#baff00] font-semibold hover:underline">Track in Orders →</span>
                                  </div>
                                </div>
                              );
                            })
                          )}

                          {/* Admin Announcements */}
                          {(notificationFilter === "all" || notificationFilter === "announcements") && (
                            announcements.map((a) => {
                              const key = `ann_${a.id}`;
                              const isUnread = !readNotificationKeys[key];
                              const url = extractAnnouncementUrl(a.message);

                              return (
                                <div
                                  key={a.id}
                                  onClick={() => markSingleNotificationAsRead(key)}
                                  className={`rounded-xl border p-3 transition ${
                                    isUnread ? "border-lime-400/40 bg-white/[0.06]" : "border-white/10 bg-white/[0.02]"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <h5 className="font-bold text-xs text-white">{a.title}</h5>
                                    <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                                      {new Date(a.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="mt-1.5 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {renderAnnouncementMessage(a.message)}
                                  </div>
                                  {url && (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[#baff00] px-2.5 py-1 text-[11px] font-black text-[#07100f] hover:bg-[#d2ff5a] transition"
                                    >
                                      <span>Open Link</span>
                                      <span>↗</span>
                                    </a>
                                  )}
                                </div>
                              );
                            })
                          )}

                          {orders.length === 0 && announcements.length === 0 && notificationFilter === "orders" && (
                            <div className="py-8 text-center text-xs text-slate-400">
                              No orders dispatched yet. Placed orders will appear here with live updates.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* User Profile Dropdown Menu with Integrated Theme Selector */}
            <div className="relative shrink-0" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1 sm:px-2.5 sm:py-1.5 transition hover:border-[#baff00]/40 shrink-0 cursor-pointer"
                title="User Profile Menu"
                aria-label="User Profile and Settings"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#baff00] text-xs font-black text-[#07100f]">
                  {currentUser?.name ? currentUser.name.trim().charAt(0).toUpperCase() : "U"}
                </div>
                <span className="hidden text-xs sm:text-sm font-bold text-white lg:block">
                  {currentUser?.name ? currentUser.name.split(" ")[0] : "Account"}
                </span>
                <span className="text-[10px] text-slate-400">▼</span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-white/15 bg-[#0f191b] p-2 shadow-2xl z-50 backdrop-blur-2xl animate-in fade-in duration-150 space-y-1">
                  <div className="px-3 py-2 border-b border-white/[0.08]">
                    <p className="text-xs font-bold text-white truncate">
                      {currentUser?.name || "Account"} {currentUser?.is_admin ? "(Administrator)" : ""}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{currentUser?.email || ""}</p>
                  </div>

                  {/* Integrated 4-Theme Selection Matrix */}
                  <div className="px-3 py-2 border-b border-white/[0.08]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Theme</span>
                      <span className="text-[10px] text-slate-400">{currentThemeOption.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {THEME_OPTIONS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            selectTheme(t.id);
                          }}
                          className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                            currentTheme === t.id
                              ? "bg-white/15 text-white ring-1 ring-white/20"
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: t.dot }}
                          />
                          <span className="truncate">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigate("Account");
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer text-left"
                  >
                    <Icon name="user" size={15} />
                    <span>My Account</span>
                  </button>

                  <a
                    href="https://vexarosmm.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon name="globe" size={15} className="text-[#baff00]" />
                      <span>Live Website</span>
                    </div>
                    <span className="text-[10px] text-slate-500">↗</span>
                  </a>

                  <a
                    href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-[#25d366] hover:bg-[#25d366]/10 transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon name="whatsapp" size={15} />
                      <span>WhatsApp Channel</span>
                    </div>
                    <span className="text-[10px]">↗</span>
                  </a>

                  {currentUser?.is_admin && (
                    <a
                      href="/admin"
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#cfff62] hover:bg-[#baff00]/20 transition cursor-pointer text-left"
                    >
                      <span>⚙</span>
                      <span>Admin Control Center</span>
                    </a>
                  )}

                  <div className="pt-1 border-t border-white/[0.08]">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await fetch("/api/auth/logout", { method: "POST", credentials: "include", cache: "no-store" });
                          window.location.replace("/");
                        } catch {}
                      }}
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition cursor-pointer text-left"
                    >
                      <Icon name="logout" size={15} />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        

        {/* Content */}
        <section className="vexo-page-enter p-4 sm:p-6 lg:p-7 pb-36 lg:pb-8">
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
              bonusBalancePkr={bonusBalancePkr}
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
              bonusBalancePkr={bonusBalancePkr}
              selectedCurrency={selectedCurrency}
              currencyRates={currencyRates}
              navigate={navigate}
              buyAgainPrefill={buyAgainPrefill}
              onCelebrateBonus={() => setBonusCelebration({ amount: bonusBalancePkr || 50, claimKey: "manual_celebrate" })}
            />
          )}

          {activePage === "Mass Order" && (
            <MassOrderPage
              services={services}
              walletBalancePkr={walletBalancePkr}
              bonusBalancePkr={bonusBalancePkr}
              onOrdersCreated={() => {
                loadOrders();
                loadWallet();
              }}
              navigate={navigate}
            />
          )}

          {activePage === "Orders" && (
            <OrdersPage
              orders={orders}
              onOrdersUpdated={handleOrdersUpdated}
              onBuyAgain={handleBuyAgain}
            />
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
              bonusBalancePkr={bonusBalancePkr}
              deposits={deposits}
              sadaPayNumber={sadaPayNumber}
              sadaPayTitle={sadaPayTitle}
              binanceUid={binanceUid}
              binanceName={binanceName}
              binanceUsdtAddress={binanceUsdtAddress}
              binanceNetwork={binanceNetwork}
              liveForexUsdRate={liveForexUsdRate}
              onWalletUpdated={(balancePkr, nextDeposits) => {
                setWalletBalancePkr(balancePkr);
                setDeposits(nextDeposits);
                loadWallet();
              }}
              onCelebrateBonus={() => setBonusCelebration({ amount: bonusBalancePkr || 50, claimKey: "manual_celebrate" })}
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
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/10 bg-[#0b1418]/95 px-2 py-2 backdrop-blur-lg pb-safe md:hidden"
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

      {/* Bonus Party Popper Celebration Modal */}
      {bonusCelebration && (
        <BonusCelebrationModal
          isOpen={Boolean(bonusCelebration)}
          amount={bonusCelebration.amount}
          onClose={handleCloseCelebration}
          onOrderNow={handleOrderNowCelebration}
        />
      )}
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
  bonusBalancePkr = 0,
  currentUser,
  onOrderService,
}: {
  navigate: (page: string) => void;
  services: Service[];
  orders: VexoOrder[];
  selectedCurrency: string;
  currencyRates: Record<string, number>;
  walletBalancePkr: number;
  bonusBalancePkr?: number;
  currentUser: CurrentUser | null;
  onOrderService: (serviceId: number | string) => void;
}) {
  const [todayLabel, setTodayLabel] = useState("");
  const [dismissedBonusBanner, setDismissedBonusBanner] = useState(false);
  const [dismissedLiveBanner, setDismissedLiveBanner] = useState(() => {
    try {
      return sessionStorage.getItem("vexo_dismissed_live_banner") === "1";
    } catch {
      return false;
    }
  });
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);

  const totalAvailablePkr = walletBalancePkr + bonusBalancePkr;

  useEffect(() => {
    setTodayLabel(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));

    let isMounted = true;
    fetch("/api/support/tickets", { cache: "no-store", credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.tickets)) {
          setSupportTickets(data.tickets);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const completed = orders.filter((order) => order.status.toLowerCase() === "completed").length;
  const active = orders.filter((order) =>
    ["pending", "in progress", "processing", "partial"].includes(order.status.toLowerCase())
  ).length;
  const cancelled = orders.filter((order) => ["cancelled", "canceled"].includes(order.status.toLowerCase())).length;
  const totalSpent = orders
    .filter((order) => order.status.toLowerCase() === "completed")
    .reduce((sum, order) => sum + (Number(order.charge) || 0), 0);

  // VIP Loyalty Tier Computation
  const vipTier = useMemo(() => {
    if (totalSpent >= 75000) {
      return {
        name: "VIP Elite",
        nextTier: "Max Tier",
        progressPercent: 100,
        perk: "10% Bonus + Dedicated VIP Account Manager",
        remaining: 0,
        badgeClass: "bg-[#baff00]/20 text-[#baff00] border-[#baff00]/40 shadow-[0_0_12px_rgba(186,255,0,0.3)]",
      };
    }
    if (totalSpent >= 25000) {
      const remaining = 75000 - totalSpent;
      const progressPercent = Math.min(100, Math.round(((totalSpent - 25000) / 50000) * 100));
      return {
        name: "Gold Member",
        nextTier: "VIP Elite",
        progressPercent,
        perk: "5% Deposit Bonus + Priority Queue Dispatch",
        remaining,
        badgeClass: "bg-yellow-400/20 text-yellow-300 border-yellow-400/30",
      };
    }
    if (totalSpent >= 5000) {
      const remaining = 25000 - totalSpent;
      const progressPercent = Math.min(100, Math.round(((totalSpent - 5000) / 20000) * 100));
      return {
        name: "Silver Member",
        nextTier: "Gold Member",
        progressPercent,
        perk: "2% Extra Bonus Credit on all deposits",
        remaining,
        badgeClass: "bg-slate-300/20 text-slate-200 border-slate-300/30",
      };
    }
    const remaining = 5000 - totalSpent;
    const progressPercent = Math.min(100, Math.round((totalSpent / 5000) * 100));
    return {
      name: "Bronze Member",
      nextTier: "Silver Member",
      progressPercent,
      perk: "Standard Automated Wholesale Rates",
      remaining,
      badgeClass: "bg-amber-600/20 text-amber-300 border-amber-600/30",
    };
  }, [totalSpent]);

  // Open support tickets count
  const activeTicketsCount = supportTickets.filter(
    (t) => !["resolved", "closed"].includes(t.status?.toLowerCase() || "")
  ).length;

  const popularServices = [
    services.find((s) => s.platform === "Instagram" && s.category.toLowerCase().includes("follower")),
    services.find((s) => s.platform === "TikTok" && s.category.toLowerCase().includes("view")),
    services.find((s) => s.platform === "YouTube" && s.category.toLowerCase().includes("view")),
  ].filter(Boolean) as Service[];

  const recentOrders = orders.slice(0, 6);

  const handleDismissLiveBanner = () => {
    setDismissedLiveBanner(true);
    try {
      sessionStorage.setItem("vexo_dismissed_live_banner", "1");
    } catch {}
  };

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 sm:space-y-7">
      {/* High-Contrast Promotional Bonus Notice */}
      {bonusBalancePkr > 0 && !dismissedBonusBanner && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-3.5 sm:p-4 text-emerald-100 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 text-base">
              🎁
            </span>
            <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
              You have <strong className="font-extrabold text-white underline decoration-emerald-400 underline-offset-2">₨{bonusBalancePkr.toFixed(2)}</strong> bonus credit available. It will be automatically deducted first on your next purchase.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate("New Order")}
              className="rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 px-3.5 py-2 text-xs font-bold text-white transition cursor-pointer shadow-sm"
            >
              Order Now →
            </button>
            <button
              type="button"
              onClick={() => setDismissedBonusBanner(true)}
              className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer rounded-lg hover:bg-white/10 transition"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 1. Live Platform Announcements Banner / Box (Dismissible) */}
      {!dismissedLiveBanner && (
        <div className="rounded-2xl border border-[#baff00]/30 bg-gradient-to-r from-[#0d2218]/90 via-[#0a1818]/90 to-[#0e2118]/90 p-3.5 sm:p-4.5 shadow-[0_0_25px_rgba(186,255,0,0.06)] backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#baff00]/15 border border-[#baff00]/35 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#baff00] shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-[#baff00] animate-pulse" />
              ⚡ System Update
            </span>
            <p className="text-xs sm:text-sm text-white font-medium leading-relaxed truncate">
              Instagram Followers API speed increased to 5k/day | New SadaPay 0% fee gateway verified &amp; online | Instant Binance Pay active.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => navigate("Add Funds")}
              className="rounded-xl bg-[#baff00] px-3.5 py-1.5 text-xs font-black text-[#07100f] hover:bg-[#d2ff5a] transition cursor-pointer"
            >
              Deposit Funds →
            </button>
            <button
              type="button"
              onClick={handleDismissLiveBanner}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
              title="Dismiss system banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. Clean Dashboard Welcome Card */}
      <div className="antigravity-card rounded-2xl p-5 sm:p-6 relative">
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

      {/* 3. Top 4 Overview Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <Stat
          title="Total Orders"
          value={String(orders.length)}
          icon="cart"
        />
        <Stat
          title="Wallet Balance"
          value={formatWalletBalance(selectedCurrency, currencyRates, totalAvailablePkr)}
          icon="wallet"
        />
        <Stat
          title="In Queue / Active"
          value={String(active)}
          icon="clock"
        />
        <Stat
          title="Total Spent"
          value={`₨${totalSpent.toFixed(2)}`}
          icon="star"
        />
      </div>

      {/* 4. API Engine Live Metrics Bar */}
      <div className="antigravity-card rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
            <Icon name="bolt" size={17} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white">API Engine Live Metrics</h3>
              <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981] animate-pulse" />
                99.98% Operational
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Automated High-Speed Dispatch Network</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs text-slate-300">
          <div className="rounded-xl bg-white/[0.03] border border-white/5 px-3 py-1.5 flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Avg Start:</span>
            <span className="font-bold text-[#baff00]">&lt; 15 Mins</span>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/5 px-3 py-1.5 flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Provider Network:</span>
            <span className="font-bold text-cyan-400">400+ Active APIs</span>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/5 px-3 py-1.5 flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">24h Velocity:</span>
            <span className="font-bold text-white">1,480+ Dispatches Today</span>
          </div>
        </div>
      </div>

      {/* 5. Main Two-Column Layout */}
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_340px] items-start">
        {/* Left Column: Command Actions & Recent Orders */}
        <div className="min-w-0 space-y-7">
          {/* Quick Command Center with standardized padding & no clipped borders */}
          <div className="antigravity-card rounded-2xl p-5 sm:p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Quick Command Center
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  One-tap instant shortcuts
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-300 bg-white/[0.06] border border-white/10 rounded-full px-2.5 py-0.5">
                4 Actions
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
                  className={`group rounded-xl p-4 text-left transition-all duration-200 cursor-pointer border flex flex-col justify-between h-[104px] ${
                    cmd.primary
                      ? "bg-gradient-to-b from-[#baff00]/12 via-[#baff00]/5 to-transparent border-[#baff00]/40 shadow-[0_4px_16px_rgba(186,255,0,0.12)] hover:border-[#baff00] hover:shadow-[0_4px_20px_rgba(186,255,0,0.22)]"
                      : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                  }`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                    cmd.primary
                      ? "bg-[#baff00] text-[#07100f]"
                      : "bg-white/[0.05] border border-white/10 text-slate-300 group-hover:text-[#baff00]"
                  }`}>
                    <Icon name={cmd.icon} size={18} />
                  </span>
                  <div>
                    <p className="text-xs font-black text-white group-hover:text-[#baff00] transition-colors leading-tight">
                      {cmd.label}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                      {cmd.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="antigravity-card rounded-2xl p-5 sm:p-6 relative">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#baff00] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#baff00]" />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Recent Orders
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Latest automated social growth dispatches
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("Orders")}
                className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>View All Orders</span>
                <Icon name="arrow" size={13} />
              </button>
            </div>

            <div className="mt-4 overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6 no-scrollbar">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
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
                        <div>{order.orderId ? `#${order.orderId}` : `#${order.localId}`}</div>
                        <div className="text-[10px] font-normal text-slate-500 font-sans mt-0.5">
                          {order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}
                        </div>
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
                        ₨{Number(order.charge).toFixed(2)}
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
                            No order records yet
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

        {/* Right Rail: Standardized Cards & New Feature Widgets */}
        <aside className="space-y-6">
          {/* Live Space Wallet Card */}
          <div className="antigravity-card rounded-2xl p-5 sm:p-6 space-y-5 relative">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-[#baff00] shadow-[0_0_8px_#baff00] animate-pulse" />
                <h3 className="text-base font-bold text-white">
                  Live Wallet Summary
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-300 bg-white/[0.06] px-2.5 py-0.5 rounded-full border border-white/10">
                Instant Top-Up
              </span>
            </div>

            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Icon name="wallet" size={14} className="text-[#baff00]" />
                Available Spending Power
              </span>
              <p className="text-3xl sm:text-4xl font-black text-white tracking-tight pt-1">
                {formatWalletBalance(selectedCurrency, currencyRates, totalAvailablePkr)}
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400">
                  Real Balance: <strong className="text-white">₨{walletBalancePkr.toFixed(2)}</strong>
                </span>
                {bonusBalancePkr > 0 && (
                  <span className="rounded-md border border-[#baff00]/30 bg-[#baff00]/10 px-2 py-0.5 text-[11px] font-bold text-[#baff00]">
                    🎁 Bonus Credit: ₨{bonusBalancePkr.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("Add Funds")}
              className="w-full rounded-xl py-3.5 text-xs sm:text-sm font-black bg-[#baff00] text-[#07100f] shadow-[0_8px_25px_rgba(186,255,0,0.3)] hover:shadow-[0_12px_30px_rgba(186,255,0,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Icon name="wallet" size={17} />
              <span>+ Add Funds (SadaPay / JazzCash)</span>
            </button>
          </div>

          {/* Account & VIP Level Progress Box */}
          <div className="antigravity-card rounded-2xl p-5 sm:p-6 space-y-4 relative">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 text-xs">
                  👑
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">VIP Loyalty Tier</h3>
                  <p className="text-[10px] text-slate-400">Lifetime Spent: ₨{totalSpent.toFixed(2)}</p>
                </div>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${vipTier.badgeClass}`}>
                {vipTier.name}
              </span>
            </div>

            {/* Progress Bar & Target */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Progress to {vipTier.nextTier}</span>
                <span className="font-extrabold text-[#baff00]">{vipTier.progressPercent}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-lime-400 to-[#baff00] transition-all duration-500 shadow-[0_0_10px_rgba(186,255,0,0.5)]"
                  style={{ width: `${vipTier.progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span>Perk: <strong className="text-white">{vipTier.perk}</strong></span>
                {vipTier.remaining > 0 ? (
                  <span className="text-slate-300">₨{vipTier.remaining.toFixed(2)} remaining</span>
                ) : (
                  <span className="text-[#baff00] font-bold">Max Tier</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("Add Funds")}
              className="w-full rounded-xl py-2.5 px-3 text-xs font-bold bg-white/[0.04] border border-white/10 text-slate-200 hover:text-white hover:border-[#baff00]/40 hover:bg-white/[0.08] transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>+ Deposit to Level Up</span>
              <span className="text-[11px] text-[#baff00]">→</span>
            </button>
          </div>
        </aside>
      </div>

      {/* 5. Popular Fast-Dispatch Services Grid (Formatted to 2 Decimals) */}
      <div className="antigravity-card rounded-2xl p-5 sm:p-6 relative">
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
              price={Number(service.price).toFixed(2)}
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
                  {isServiceGuaranteed(service) ? (
                    <span className="rounded-full bg-lime-400/15 px-2 py-0.5 text-[10px] font-bold text-[#baff00]">
                      ✓ Refill
                    </span>
                  ) : isServiceDropOrNoRefill(service) ? (
                    <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                      ⛔ No Refill
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
                      {isServiceGuaranteed(service) ? (
                        <span className="rounded-full bg-lime-400/15 px-2.5 py-0.5 text-[10px] font-bold text-[#baff00]">
                          ✓ Refill
                        </span>
                      ) : isServiceDropOrNoRefill(service) ? (
                        <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[10px] font-bold text-rose-400">
                          ⛔ No Refill
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
                <div className="flex items-center gap-1.5 shrink-0">
                  {isServiceGuaranteed(service) ? (
                    <span className="rounded-full bg-lime-400/15 px-2 py-0.5 text-[10px] font-bold text-[#baff00]">
                      ✓ Refill
                    </span>
                  ) : isServiceDropOrNoRefill(service) ? (
                    <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                      ⛔ No Refill
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      Standard
                    </span>
                  )}
                  <span className="rounded-lg bg-[#070d0d] px-2.5 py-1 text-[10px] font-bold text-slate-400">
                    ID #{service.id}
                  </span>
                </div>
              </div>

              <h3 className="mt-4 break-words font-bold leading-6 text-white">{service.name}</h3>
              <p className="mt-1 text-xs text-slate-400 line-clamp-2">{formatServiceDescription(service.description)}</p>

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

function normalizeDashes(str: string): string {
  return (str || "").replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-");
}

function isServiceDropOrNoRefill(service: Service): boolean {
  const raw = `${service.name} ${service.category || ""} ${service.description || ""}`;
  const text = normalizeDashes(raw);
  const noRefillPattern =
    /no[\s-]*refill|without[\s-]*refill|refill[\s:]*no|refill[\s:]*0|0%[\s-]*refill|drop[\s-]*100%|100%[\s-]*drop|drop[\s-]*able|dropable|high[\s-]*drop|drop[\s-]*high|no[\s-]*guarantee|non[\s-]*guaranteed|not[\s-]*guaranteed|can[\s-]*drop|drop[\s-]*possible/i;
  return noRefillPattern.test(text);
}

function isServiceGuaranteed(service: Service): boolean {
  // CRITICAL: Any drop-able or no-refill service is NEVER guaranteed.
  if (isServiceDropOrNoRefill(service)) return false;
  if (service.is_guaranteed === true || service.refill === true) return true;
  const text = normalizeDashes(`${service.name} ${service.category || ""}`);
  const guaranteed = /refill|guarantee|guaranteed|non-drop|non drop|r30|r60|r90|r365|lifetime|permanent/i;
  return guaranteed.test(text);
}

const OWNER_CONTACT_NUMBER = "03176437013";

function sanitizeServiceContactNumbers(text?: string | null): string {
  if (!text || typeof text !== "string") return "";

  let cleaned = text
    .replace(/(?:\+?92|0092|0)?[\s-]*349[\s-]*7401844/g, OWNER_CONTACT_NUMBER)
    .replace(/(?:\+?92|0092|0)?[\s-]*326[\s-]*4810548/g, OWNER_CONTACT_NUMBER)
    .replace(/(?:\+?92|0092|0)?[\s-]*327[\s-]*7164331/g, OWNER_CONTACT_NUMBER);

  cleaned = cleaned.replace(
    /(^|[^\d+])(?:\+?92[\s-]?|0092[\s-]?|0)3\d{2}[\s-]?\d{3}[\s-]?\d{4}([^\d]|$)/gi,
    (match, prefix, suffix) => `${prefix}${OWNER_CONTACT_NUMBER}${suffix}`
  );

  cleaned = cleaned.replace(
    /(whatsapp|contact|support|call|phone|mobile|helpline)[\s:]*(?:on\s+)?(\+?\d[\d\s-]{8,15}\d)/gi,
    (match, label, number) => {
      const digitsOnly = number.replace(/\D/g, "");
      if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
        return `${label} ${OWNER_CONTACT_NUMBER}`;
      }
      return match;
    }
  );

  return cleaned;
}

function formatServiceDescription(desc?: string): string {
  if (!desc) return "";
  const sanitized = sanitizeServiceContactNumbers(desc);
  return sanitized
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();
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
  bonusBalancePkr = 0,
  selectedCurrency,
  currencyRates,
  navigate,
  onCelebrateBonus,
  buyAgainPrefill,
}: {
  services: Service[];
  selectedServiceId: string;
  onSelectServiceId: (id: string) => void;
  onOrderCreated: (order: VexoOrder) => void;
  walletBalancePkr: number;
  bonusBalancePkr?: number;
  selectedCurrency: string;
  currencyRates: Record<string, number>;
  navigate: (page: string) => void;
  onCelebrateBonus?: () => void;
  buyAgainPrefill?: {
    serviceId?: number | string;
    link?: string;
    quantity?: number;
    unavailableNotice?: string;
  } | null;
}) {
  const [platform, setPlatform] = useState<string>(() => {
    if (selectedServiceId) {
      const found = services.find((s) => String(s.id) === String(selectedServiceId));
      if (found?.platform) return found.platform;
    }
    return "All";
  });
  const lastSelectedIdRef = useRef<string>(selectedServiceId);
  const [actionType, setActionType] = useState<string>("all");
  const [guaranteeFilter, setGuaranteeFilter] = useState<"all" | "guaranteed" | "standard">("all");
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [comboboxSearch, setComboboxSearch] = useState<string>("");
  const [comboboxOpen, setComboboxOpen] = useState<boolean>(false);
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState<boolean>(false);
  const [actionDropdownOpen, setActionDropdownOpen] = useState<boolean>(false);
  const platformDropdownRef = useRef<HTMLDivElement>(null);
  const actionDropdownRef = useRef<HTMLDivElement>(null);
  const [serviceAccordionOpen, setServiceAccordionOpen] = useState<boolean>(true);
  const [link, setLink] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1000");
  const [placingOrder, setPlacingOrder] = useState<boolean>(false);
  const [orderMessage, setOrderMessage] = useState<string>("");
  const [orderError, setOrderError] = useState<string>("");
  const [dismissedOrderBonusBanner, setDismissedOrderBonusBanner] = useState<boolean>(false);

  useEffect(() => {
    if (buyAgainPrefill) {
      if (buyAgainPrefill.link) {
        setLink(buyAgainPrefill.link);
      }
      if (buyAgainPrefill.quantity) {
        setQuantity(String(buyAgainPrefill.quantity));
      }
      if (buyAgainPrefill.unavailableNotice) {
        setOrderError(buyAgainPrefill.unavailableNotice);
      } else {
        setOrderMessage("Order details prefilled! Review your configuration and click 'Submit Order' when ready.");
      }
    }
  }, [buyAgainPrefill]);

  const comboboxRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setComboboxOpen(false);
      }
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(event.target as Node)) {
        setPlatformDropdownOpen(false);
      }
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target as Node)) {
        setActionDropdownOpen(false);
      }
    }
    if (comboboxOpen || platformDropdownOpen || actionDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [comboboxOpen, platformDropdownOpen, actionDropdownOpen]);

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
    { name: "Spotify", label: "Spotify", icon: "spark" },
    { name: "Website Traffic", label: "Website Traffic", icon: "globe" },
    { name: "Other", label: "Other Services", icon: "spark" },
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

  // Align platform with selected service ONLY when selection changes externally (e.g. from Services or Dashboard)
  useEffect(() => {
    if (selectedServiceId && selectedServiceId !== lastSelectedIdRef.current) {
      lastSelectedIdRef.current = selectedServiceId;
      const target = services.find((s) => String(s.id) === String(selectedServiceId));
      if (target?.platform) {
        setPlatform(target.platform);
        setActionType(detectServiceAction(target));
      }
    }
  }, [selectedServiceId, services]);

  const activePlatformItem = useMemo(() => {
    return platformList.find((p) => p.name.toLowerCase() === platform.toLowerCase()) || platformList[0];
  }, [platformList, platform]);

  const activeActionItem = useMemo(() => {
    return actionOptions.find((a) => a.id === actionType) || actionOptions[0];
  }, [actionOptions, actionType]);

  const handleSelectPlatform = (p: string) => {
    setPlatform(p);
    setActionType("all");
    setGuaranteeFilter("all");
    setGlobalSearch("");
    setComboboxSearch("");
    setPlatformDropdownOpen(false);

    // If active service does not belong to this platform, switch to the first service of this platform
    if (p !== "All") {
      const matching = services.find((s) => s.platform?.toLowerCase() === p.toLowerCase());
      if (matching) {
        lastSelectedIdRef.current = String(matching.id);
        onSelectServiceId(String(matching.id));
      }
    }
  };

  const handleSelectAction = (actId: string) => {
    setActionType(actId);
    setComboboxSearch("");
    setActionDropdownOpen(false);

    // Switch to first service matching this action in this platform
    const slice = actId === "all"
      ? (platform === "All" ? services : services.filter((s) => s.platform?.toLowerCase() === platform.toLowerCase()))
      : (platform === "All" ? services : services.filter((s) => s.platform?.toLowerCase() === platform.toLowerCase())).filter((s) => detectServiceAction(s) === actId);
    if (slice.length > 0) {
      lastSelectedIdRef.current = String(slice[0].id);
      onSelectServiceId(String(slice[0].id));
    }
  };

  const handleSelectComboboxService = (s: Service) => {
    lastSelectedIdRef.current = String(s.id);
    onSelectServiceId(String(s.id));
    if (platform !== "All") {
      setPlatform(s.platform || "All");
      setActionType(detectServiceAction(s));
    }
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
  const totalAvailable = walletBalancePkr + bonusBalancePkr;
  const isInsufficient = totalAvailable < charge;

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
        createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
      };

      onOrderCreated(createdOrder);
      setOrderMessage(
        data.orderId
          ? `Order #${data.orderId} placed successfully at ${new Date(createdOrder.createdAt).toLocaleTimeString()}! Tracking live updates in Orders.`
          : `Order placed successfully at ${new Date(createdOrder.createdAt).toLocaleTimeString()}! Dispatched to provider queue.`
      );
      setLink("");
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : "Unable to place order.");
    } finally {
      setPlacingOrder(false);
    }
  }

  return (
    <div className="w-full max-w-4xl min-w-0 mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Place New Order
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Select your platform and service package to dispatch directly.
          </p>
        </div>

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
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white hover:border-[#baff00]/40 transition flex items-center gap-2 cursor-pointer"
          >
            <Icon name="refresh" size={13} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Subtle, Dismissible Promotional Bonus Notice */}
      {bonusBalancePkr > 0 && !dismissedOrderBonusBanner && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-300 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <span className="text-emerald-400 font-bold">ℹ</span>
            <p>
              You have <strong className="text-white">₨{bonusBalancePkr.toFixed(2)}</strong> bonus credit available. It will be automatically applied to eligible orders.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissedOrderBonusBanner(true)}
            className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer shrink-0"
            title="Dismiss notice"
          >
            ✕
          </button>
        </div>
      )}

      {/* Single Cohesive Order Form Card */}
      <div className="w-full max-w-3xl mx-auto antigravity-card rounded-2xl p-5 sm:p-8 space-y-6 shadow-xl">
        {/* 1. Category / Platform Dropdown */}
        <div className="space-y-2" ref={platformDropdownRef}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">
              Platform / Category
            </label>
            <span className="text-[11px] font-medium text-slate-400">
              {platformCounts[platform] ?? services.length} available
            </span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setPlatformDropdownOpen(!platformDropdownOpen);
                setActionDropdownOpen(false);
                setComboboxOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition cursor-pointer ${
                platformDropdownOpen
                  ? "border-[#baff00] bg-white/[0.08]"
                  : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-200 border border-white/10">
                  <Icon name={activePlatformItem.icon} size={16} />
                </div>
                <p className="text-sm font-bold text-white truncate">
                  {activePlatformItem.label || activePlatformItem.name}
                </p>
              </div>
              <Icon name="chevron" size={14} className={`text-slate-400 transition-transform ${platformDropdownOpen ? "rotate-180 text-white" : ""}`} />
            </button>

            {platformDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 max-h-72 overflow-y-auto rounded-xl border border-white/15 bg-[#0f1824] backdrop-blur-2xl p-1.5 shadow-2xl space-y-0.5">
                {platformList.map((p) => {
                  const isSelected = platform.toLowerCase() === p.name.toLowerCase();
                  const count = platformCounts[p.name] ?? (p.name === "Other" ? platformCounts["Other"] || 0 : 0);
                  if (p.name !== "All" && count === 0) return null;

                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handleSelectPlatform(p.name)}
                      className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition cursor-pointer ${
                        isSelected
                          ? "bg-[#baff00]/15 text-white font-bold"
                          : "hover:bg-white/[0.06] text-slate-300 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${isSelected ? "bg-[#baff00] text-black" : "bg-white/5 text-slate-300"}`}>
                          <Icon name={p.icon} size={15} />
                        </div>
                        <span className="text-xs sm:text-sm font-medium truncate">
                          {p.label || p.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 2. Service Type Dropdown */}
        <div className="space-y-2" ref={actionDropdownRef}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">
              Service Type
            </label>
            <span className="text-[11px] font-medium text-slate-400">
              {actionOptions.length} types available
            </span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setActionDropdownOpen(!actionDropdownOpen);
                setPlatformDropdownOpen(false);
                setComboboxOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition cursor-pointer ${
                actionDropdownOpen
                  ? "border-[#baff00] bg-white/[0.08]"
                  : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-200 border border-white/10">
                  <Icon name={activeActionItem?.icon || "layers"} size={16} />
                </div>
                <p className="text-sm font-bold text-white truncate">
                  {activeActionItem?.label || "All Services"}
                </p>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-xs text-slate-400">
                  {activeActionItem?.count ?? servicesByPlatform.length} packages
                </span>
                <Icon name="chevron" size={14} className={`transition-transform ${actionDropdownOpen ? "rotate-180 text-white" : ""}`} />
              </div>
            </button>

            {actionDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 max-h-72 overflow-y-auto rounded-xl border border-white/15 bg-[#0f1824] backdrop-blur-2xl p-1.5 shadow-2xl space-y-0.5">
                {actionOptions.map((opt) => {
                  const isSelected = actionType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectAction(opt.id)}
                      className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition cursor-pointer ${
                        isSelected
                          ? "bg-[#baff00]/15 text-white font-bold"
                          : "hover:bg-white/[0.06] text-slate-300 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${isSelected ? "bg-[#baff00] text-black" : "bg-white/5 text-slate-300"}`}>
                          <Icon name={opt.icon} size={15} />
                        </div>
                        <span className="text-xs sm:text-sm font-medium truncate">
                          {opt.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {opt.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 3. Service Details & Instructions (Accordion / Quick Specs) */}
        {service && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <button
              type="button"
              onClick={() => setServiceAccordionOpen(!serviceAccordionOpen)}
              className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-slate-300 hover:bg-white/[0.03] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#baff00]/15 text-[#baff00] text-xs font-bold">
                  ℹ
                </span>
                <span>Service Details &amp; Instructions</span>
              </div>
              <span className="text-slate-400">{serviceAccordionOpen ? "▲ Hide" : "▼ View"}</span>
            </button>

            {serviceAccordionOpen && (
              <div className="border-t border-white/[0.06] p-4 space-y-3 text-xs text-slate-300">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-white/[0.03] p-2 border border-white/5">
                    <span className="text-[10px] text-slate-400 block font-semibold">Rate</span>
                    <span className="font-bold text-[#baff00]">₨{Number(service.price).toFixed(2)}</span>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-2 border border-white/5">
                    <span className="text-[10px] text-slate-400 block font-semibold">Limits</span>
                    <span className="font-bold text-white">{isPackage ? "1 unit" : `${Number(service.min).toLocaleString()} - ${Number(service.max).toLocaleString()}`}</span>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-2 border border-white/5">
                    <span className="text-[10px] text-slate-400 block font-semibold">Refill</span>
                    <span className="font-bold text-white">{isServiceGuaranteed(service) ? "30-Day Refill" : isServiceDropOrNoRefill(service) ? "No Refill" : "Standard"}</span>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-2 border border-white/5">
                    <span className="text-[10px] text-slate-400 block font-semibold">Start Speed</span>
                    <span className="font-bold text-white">0 - 15 Mins</span>
                  </div>
                </div>

                {service.description && (
                  <div className="rounded-lg bg-white/[0.02] p-3 border border-white/5 text-[11px] leading-relaxed whitespace-pre-line text-slate-300">
                    {formatServiceDescription(service.description)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. Service Package Dropdown & Combobox */}
        <div className="space-y-2" ref={comboboxRef}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">
              Service Package
            </label>
            <span className="text-[11px] font-medium text-slate-400">
              {comboboxFilteredServices.length} packages
            </span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setComboboxOpen(!comboboxOpen)}
              className={`w-full text-left rounded-xl border transition p-4 cursor-pointer group ${
                comboboxOpen
                  ? "border-[#baff00] bg-white/[0.08]"
                  : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
              }`}
            >
              {service ? (
                <div className="flex items-center justify-between gap-3 min-w-0 w-full">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-bold text-white text-sm sm:text-base truncate group-hover:text-[#baff00] transition-colors">
                      {cleanServiceName(service.name, service.platform)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      {service.platform} • ID #{service.id} • Min: {isPackage ? "1" : Number(service.min).toLocaleString()} • Max: {isPackage ? "1" : Number(service.max).toLocaleString()} • {isServiceGuaranteed(service) ? "30-Day Refill" : isServiceDropOrNoRefill(service) ? "No Refill" : "Standard"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right whitespace-nowrap">
                      <div className="text-sm sm:text-base font-extrabold text-[#baff00]">
                        ₨{Number(service.price).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        per {isPackage ? "package" : "1,000"}
                      </div>
                    </div>
                    <Icon name="chevron" size={14} className={`text-slate-400 transition-transform ${comboboxOpen ? "rotate-180 text-[#baff00]" : ""}`} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-slate-400 py-1 text-sm">
                  <span>Click to choose service package...</span>
                  <Icon name="chevron" size={14} />
                </div>
              )}
            </button>

            {/* Clean Combobox Search Popover */}
            {comboboxOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-white/15 bg-[#0f1824] backdrop-blur-2xl p-3 shadow-2xl space-y-3">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="search" size={15} />
                  </span>
                  <input
                    type="text"
                    value={comboboxSearch}
                    onChange={(e) => setComboboxSearch(e.target.value)}
                    placeholder="Search by ID, name, or keywords..."
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white outline-none focus:border-[#baff00] placeholder:text-slate-400 transition"
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

                {/* Sub-Filter Pills */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar max-w-full">
                    {actionOptions.slice(0, 6).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectAction(opt.id)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold shrink-0 transition cursor-pointer ${
                          actionType === opt.id
                            ? "bg-white/20 text-white"
                            : "bg-white/[0.04] text-slate-300 hover:bg-white/10"
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
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      Refill ({guaranteeCounts.guaranteed})
                    </button>
                  </div>
                </div>

                {/* Clean Service Rows */}
                <div className="max-h-[280px] overflow-y-auto space-y-1 pr-1">
                  {comboboxFilteredServices.length > 0 ? (
                    comboboxFilteredServices.map((s) => {
                      const isSelected = service?.id === s.id;
                      const isPkg = isPackageService(s);

                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectComboboxService(s)}
                          className={`w-full text-left rounded-lg p-2.5 transition flex items-center justify-between gap-3 border cursor-pointer ${
                            isSelected
                              ? "bg-[#baff00]/15 border-[#baff00]/40 text-white"
                              : "bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.06] hover:border-white/10"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-semibold text-white truncate">
                              {cleanServiceName(s.name, s.platform)}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                              #{s.id} • {s.platform} • Min: {isPkg ? "1" : Number(s.min).toLocaleString()} • Max: {isPkg ? "1" : Number(s.max).toLocaleString()}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs sm:text-sm font-bold text-[#baff00]">
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
                    <div className="py-6 text-center text-xs text-slate-400">
                      No services match your search query.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 5. Target Link Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300">
            Target Link or Username
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
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#baff00] focus:ring-1 focus:ring-[#baff00]/20 outline-none transition"
          />
          <p className="text-[11px] text-slate-400">
            Ensure target profile, post, or channel is set to public.
          </p>
        </div>

        {/* 6. Quantity Input & Preset Chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">
              Quantity {isPackage && "(Fixed Package Unit)"}
            </label>
            {service && (
              <span className="text-xs text-slate-400">
                {isPackage ? "1 unit per order" : `Min: ${Number(service.min).toLocaleString()} • Max: ${Number(service.max).toLocaleString()}`}
              </span>
            )}
          </div>

          <div className="space-y-2.5">
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
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base sm:text-lg font-bold text-white placeholder:text-slate-500 focus:border-[#baff00] focus:ring-1 focus:ring-[#baff00]/20 outline-none transition"
            />

            {!isPackage && service && (
              <div className="flex items-center gap-2">
                {["500", "1000", "5000"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuantity(preset)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300 hover:border-white/30 hover:text-white transition cursor-pointer"
                  >
                    {Number(preset).toLocaleString()}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setQuantity(String(service.max))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300 hover:border-white/30 hover:text-white transition cursor-pointer"
                >
                  Max
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 7. Inline Order Summary & Place Order CTA */}
        <div className="pt-6 border-t border-white/[0.08] space-y-4">
          <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4 space-y-2 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Available Balance</span>
              <span className="font-semibold text-white">₨{totalAvailable.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Rate</span>
              <span className="font-semibold text-white">
                {service ? `₨${Number(service.price).toFixed(2)} / ${isPackage ? "pkg" : "1k"}` : "—"}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-white/5 text-sm">
              <span className="font-bold text-white">Total Charge</span>
              <span className="font-extrabold text-[#baff00] text-base">₨{charge.toFixed(2)}</span>
            </div>
          </div>

          {orderError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
              ⚠️ {orderError}
            </div>
          )}

          {orderMessage && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              ✓ {orderMessage}
            </div>
          )}

          <button
            type="button"
            onClick={placeOrder}
            disabled={placingOrder || isInsufficient}
            className="w-full rounded-xl py-3.5 text-sm sm:text-base font-black bg-[#baff00] text-[#07100f] shadow-[0_4px_20px_rgba(186,255,0,0.25)] hover:bg-[#d2ff5a] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center gap-2"
          >
            {placingOrder ? "Placing Order..." : isInsufficient ? "Insufficient Balance" : "Place Order Now"}
          </button>

          {isInsufficient && (
            <button
              type="button"
              onClick={() => navigate("Add Funds")}
              className="w-full rounded-xl py-2.5 text-xs font-bold bg-amber-400/15 border border-amber-400/30 text-amber-300 hover:bg-amber-400/25 transition text-center cursor-pointer"
            >
              Add Funds to Wallet (₨{(charge - totalAvailable).toFixed(2)} needed)
            </button>
          )}

          <p className="text-center text-[11px] text-slate-400">
            Automated Least-Cost Intelligent Dispatch • 24/7 Processing
          </p>
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
  onBuyAgain,
}: {
  orders: VexoOrder[];
  onOrdersUpdated: (orders: VexoOrder[]) => void;
  onBuyAgain: (order: VexoOrder) => void;
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

              const linkHref = order.link.startsWith("http://") || order.link.startsWith("https://") ? order.link : `https://${order.link}`;

              return (
                <div
                  key={order.localId}
                  className="rounded-2xl border border-white/10 bg-[#121b1d] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-[#baff00] bg-[#baff00]/10 px-2 py-0.5 rounded">
                      {order.orderId ? `#${order.orderId}` : `#${order.localId.slice(0, 8)}`}
                    </span>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusColor}`}>
                      {order.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white leading-snug break-words">{order.service}</h4>
                    <p className="mt-0.5 text-xs text-slate-400">{order.platform}</p>
                  </div>

                  <div className="rounded-xl bg-[#0a1110] p-2.5 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Target:</span>
                    <div className="mt-0.5">
                      <a
                        href={linkHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-slate-300 hover:text-[#baff00] underline underline-offset-2 break-all text-xs inline-flex items-center gap-1"
                        title={order.link}
                      >
                        <span className="truncate max-w-[240px]">{order.link}</span>
                        <svg className="w-3 h-3 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs rounded-xl bg-[#0a1110] p-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Quantity</span>
                      <p className="font-bold text-white mt-0.5">{order.quantity.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Charge</span>
                      <p className="font-bold text-[#baff00] mt-0.5">₨{order.charge.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Start Count</span>
                      <p className="font-mono font-medium text-slate-300 mt-0.5">
                        {order.startCount != null && order.startCount !== "" ? order.startCount : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Remains</span>
                      <p className="font-mono font-medium text-slate-300 mt-0.5">
                        {order.remains != null && order.remains !== "" ? order.remains : "—"}
                      </p>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-white/5">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Date & Time</span>
                      <p className="text-slate-300 mt-0.5">
                        {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => onBuyAgain(order)}
                      className="w-full rounded-xl border border-[#baff00]/30 bg-[#baff00]/10 py-2.5 text-xs font-bold text-[#baff00] transition active:bg-[#baff00] active:text-[#07100f]"
                    >
                      ↻ Buy Again
                    </button>

                    {(isCompleted || isPartial) && (
                      <button
                        onClick={() => handleRequestRefill(order)}
                        disabled={isRefilling || hasPendingRefill}
                        className="w-full rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-bold text-slate-300 transition active:bg-white/10 active:text-white disabled:opacity-40"
                      >
                        {isRefilling ? "Requesting..." : hasPendingRefill ? "Refill Active" : "↻ Request Refill"}
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
                </div>
              );
            })}
          </div>

          {/* Desktop Order Row Cards (hidden md:block) */}
          <div className="hidden md:block space-y-3.5">
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

              const linkHref = order.link.startsWith("http://") || order.link.startsWith("https://") ? order.link : `https://${order.link}`;

              return (
                <div
                  key={order.localId}
                  className="rounded-2xl border border-white/10 bg-[#121b1d] p-5 transition hover:border-white/20 hover:bg-[#141f22]"
                >
                  {/* Top / Primary Area: ID, Service Name, Status badge */}
                  <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3">
                    <div className="flex flex-wrap items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-black text-[#baff00] bg-[#baff00]/10 px-2.5 py-1 rounded-lg shrink-0">
                        {order.orderId ? `#${order.orderId}` : `#${order.localId.slice(0, 8)}`}
                      </span>
                      <h3 className="font-bold text-white text-sm sm:text-base leading-snug break-words">
                        {order.service}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-medium px-2 py-0.5 rounded-full bg-white/5 shrink-0">
                        {order.platform}
                      </span>
                    </div>

                    <div className="shrink-0">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Target Link */}
                  <div className="mt-2.5 flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] shrink-0">Target Link:</span>
                    <a
                      href={linkHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-slate-300 hover:text-[#baff00] underline underline-offset-2 transition-colors truncate max-w-2xl inline-flex items-center gap-1.5"
                      title={order.link}
                    >
                      <span className="truncate">{order.link}</span>
                      <svg className="w-3 h-3 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>

                  {/* Details Area + Right Action Area */}
                  <div className="mt-3.5 pt-3.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                    <div className="grid grid-cols-5 gap-6 text-xs">
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Quantity</p>
                        <p className="mt-1 font-bold text-white text-sm">{order.quantity.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Charge</p>
                        <p className="mt-1 font-bold text-[#baff00] text-sm">₨{order.charge.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Start Count</p>
                        <p className="mt-1 font-mono font-medium text-slate-300 text-sm">
                          {order.startCount != null && order.startCount !== "" ? order.startCount : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Remains</p>
                        <p className="mt-1 font-mono font-medium text-slate-300 text-sm">
                          {order.remains != null && order.remains !== "" ? order.remains : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Date & Time</p>
                        <div className="mt-1 text-slate-300 text-xs">
                          <p className="font-semibold text-slate-200">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}</p>
                          <p className="text-[11px] text-slate-500">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : ""}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right Action Area: Buy Again + Refill / Refund */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onBuyAgain(order)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#baff00]/30 bg-[#baff00]/10 px-4 py-2 text-xs font-bold text-[#baff00] transition hover:bg-[#baff00] hover:text-[#07100f] active:scale-95"
                      >
                        <span>↻ Buy Again</span>
                      </button>

                      {(isCompleted || isPartial) && (
                        <button
                          onClick={() => handleRequestRefill(order)}
                          disabled={isRefilling || hasPendingRefill}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                          title={hasPendingRefill ? "Refill already active" : "Request engagement drop refill"}
                        >
                          {isRefilling ? "Requesting..." : hasPendingRefill ? "Refill Active" : "↻ Refill"}
                        </button>
                      )}

                      {isRefunded && (
                        <button
                          onClick={() => setActiveSubTab("Refunds")}
                          className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs font-bold text-purple-300 transition hover:bg-purple-500 hover:text-white"
                        >
                          View Refund
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
  bonusBalancePkr = 0,
  deposits,
  sadaPayNumber = "03197008275",
  sadaPayTitle = "Saeed Bashir",
  binanceUid = "1069021883",
  binanceName = "Talha Bashir Bhatti",
  binanceUsdtAddress = "0xaa3037450e112ef10406df821803522bc589821c",
  binanceNetwork = "BSC BNB Smart Chain (BEP20)",
  liveForexUsdRate = 278.0,
  onWalletUpdated,
  onCelebrateBonus,
}: {
  currentUser?: CurrentUser | null;
  selectedCurrency: string;
  setSelectedCurrency: (code: string) => void;
  rates: Record<string, number>;
  walletBalancePkr: number;
  bonusBalancePkr?: number;
  deposits: VexoDeposit[];
  sadaPayNumber?: string;
  sadaPayTitle?: string;
  binanceUid?: string;
  binanceName?: string;
  binanceUsdtAddress?: string;
  binanceNetwork?: string;
  liveForexUsdRate?: number;
  onWalletUpdated: (balancePkr: number, deposits: VexoDeposit[]) => void;
  onCelebrateBonus?: () => void;
}) {
  const [openCurrency, setOpenCurrency] = useState(false);
  const [searchCurrency, setSearchCurrency] = useState("");
  const [method, setMethod] = useState("SadaPay");
  const [amount, setAmount] = useState("");
  const [binanceAmountUsd, setBinanceAmountUsd] = useState("");
  const [binanceInputMode, setBinanceInputMode] = useState<"USD" | "PKR">("USD");
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState<string>("");
  const [screenshotName, setScreenshotName] = useState<string>("");
  const [screenshotError, setScreenshotError] = useState<string>("");
  const [copiedNum, setCopiedNum] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [copiedBName, setCopiedBName] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [activeGuide, setActiveGuide] = useState<"easypaisa" | "jazzcash" | "sadapay">("easypaisa");
  const [transferGuideOpen, setTransferGuideOpen] = useState(false);
  const [activeBinanceGuide, setActiveBinanceGuide] = useState<"binance_pay" | "bep20" | "find_tid">("binance_pay");
  const [binanceGuideOpen, setBinanceGuideOpen] = useState(true);
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

  function handleCopyUid(val: string) {
    navigator.clipboard.writeText(val);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  }

  function handleCopyBName(val: string) {
    navigator.clipboard.writeText(val);
    setCopiedBName(true);
    setTimeout(() => setCopiedBName(false), 2000);
  }

  function handleCopyAddress(val: string) {
    navigator.clipboard.writeText(val);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  }

  async function submitDeposit() {
    setError("");
    setMessage("");

    const isBinance = method.includes("Binance");
    const depositPkr = isBinance && binanceInputMode === "USD" && Number(binanceAmountUsd) > 0
      ? Math.round(Number(binanceAmountUsd) * liveForexUsdRate * 100) / 100
      : numericAmount;

    if (!Number.isFinite(depositPkr) || depositPkr < 100) {
      setError(isBinance && binanceInputMode === "USD"
        ? `Minimum deposit is $${(100 / liveForexUsdRate).toFixed(2)} USD (~₨100).`
        : "Minimum deposit amount is ₨100.");
      return;
    }

    if (depositPkr > 500000) {
      setError("Maximum deposit amount is ₨500,000 per request.");
      return;
    }

    if (transactionId.trim().length < 4) {
      setError(isBinance ? "Please enter your Binance Order ID or TxHash from your receipt." : "Please enter the transaction ID/reference from your payment receipt.");
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
          amount: depositPkr,
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
          {/* Consolidated Compact Wallet Summary Card */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Deposited Balance:</span>
                <span className="font-extrabold text-white text-base">₨{walletBalancePkr.toFixed(2)}</span>
              </div>
              <span className="hidden sm:inline text-white/20">|</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Promotional Credit:</span>
                <span className="font-bold text-[#baff00] bg-[#baff00]/10 px-2.5 py-0.5 rounded-lg border border-[#baff00]/20 text-xs">
                  ₨{bonusBalancePkr.toFixed(2)} (Auto-applied)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpenCurrency(true)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              {selected[2]} {selectedCurrency} · Change Currency
            </button>
          </div>

          {/* OFFICIAL RECEIVING BINANCE CRYPTO BOX */}
          {method === "Binance Pay" && (
            <>
            <div className="relative overflow-hidden rounded-xl border border-[#F0B90B]/40 bg-gradient-to-br from-[#1c1808] via-[#141208] to-[#241f0a] p-5 sm:p-6 shadow-xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F0B90B]/15 text-xl font-black text-[#F0B90B] ring-1 ring-[#F0B90B]/30">
                    🟡
                  </div>
                  <div>
                    <span className="rounded-full bg-[#F0B90B]/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#F0B90B]">
                      Official Global Payment Receiver
                    </span>
                    <h3 className="text-lg font-black text-white">Binance &amp; Crypto Deposit Details</h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                    ● 0% Deposit Fee
                  </span>
                  <span className="rounded-full border border-[#F0B90B]/30 bg-[#F0B90B]/10 px-3 py-1 text-xs font-bold text-[#F0B90B]">
                    ⚡ BSC (BEP20)
                  </span>
                </div>
              </div>

              {/* Account Details with 1-Tap Copy */}
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Binance UID */}
                <div className="rounded-xl border border-white/10 bg-[#0c0a06] p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Binance UID / Pay ID
                  </span>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-xl font-black tracking-wider text-white">
                      {binanceUid}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyUid(binanceUid)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-[#F0B90B] transition hover:bg-[#F0B90B] hover:text-[#07100f] cursor-pointer"
                    >
                      {copiedUid ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Account Title */}
                <div className="rounded-xl border border-white/10 bg-[#0c0a06] p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Account Title / Beneficiary Name
                  </span>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-lg font-black text-white">
                      {binanceName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyBName(binanceName)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-[#F0B90B] transition hover:bg-[#F0B90B] hover:text-[#07100f] cursor-pointer"
                    >
                      {copiedBName ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* USDT Deposit Address */}
                <div className="rounded-xl border border-white/10 bg-[#0c0a06] p-4 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      USDT Deposit Address ({binanceNetwork})
                    </span>
                    <span className="text-[11px] font-semibold text-amber-400">
                      ⚠️ Send BEP-20 (BSC) tokens only
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs sm:text-sm font-bold text-white break-all">
                      {binanceUsdtAddress}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyAddress(binanceUsdtAddress)}
                      className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-[#F0B90B] transition hover:bg-[#F0B90B] hover:text-[#07100f] cursor-pointer"
                    >
                      {copiedAddress ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Collapsible Transfer Instructions & QR Drawer for Binance */}
            <div className="rounded-xl border border-white/10 bg-slate-900/50 overflow-hidden">
              <button
                type="button"
                onClick={() => setBinanceGuideOpen(!binanceGuideOpen)}
                className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left text-xs sm:text-sm font-bold text-slate-300 hover:bg-white/[0.03] transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>📖</span>
                  <span>View How to Transfer via Binance &amp; Crypto</span>
                </span>
                <span className="text-xs font-semibold text-[#F0B90B]">
                  {binanceGuideOpen ? "Hide Instructions ▲" : "Expand Instructions & QR ▼"}
                </span>
              </button>

              {binanceGuideOpen && (
                <div className="border-t border-white/10 p-4 sm:p-5 bg-black/20 space-y-4">
                  {/* Guide Tabs */}
                  <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
                    <button
                      type="button"
                      onClick={() => setActiveBinanceGuide("binance_pay")}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                        activeBinanceGuide === "binance_pay"
                          ? "bg-[#F0B90B] text-[#07100f] font-black"
                          : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      🟡 Binance App (Pay ID / QR)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveBinanceGuide("bep20")}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                        activeBinanceGuide === "bep20"
                          ? "bg-[#38bdf8] text-[#07100f] font-black"
                          : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      ⚡ USDT BEP-20 (Trust / MetaMask / Any Wallet)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveBinanceGuide("find_tid")}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                        activeBinanceGuide === "find_tid"
                          ? "bg-emerald-400 text-[#07100f] font-black"
                          : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      🔍 How to Find Order ID / TxHash
                    </button>
                  </div>

                  {/* Tab 1: Binance App (Pay ID / QR) */}
                  {activeBinanceGuide === "binance_pay" && (
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 pt-1">
                      {/* Embedded Binance Pay QR */}
                      <div className="shrink-0 flex flex-col items-center">
                        <div className="relative overflow-hidden rounded-2xl border-2 border-[#F0B90B]/50 bg-white p-2.5 shadow-2xl">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/binance-pay-qr.jpg"
                            alt="Binance Pay QR Code"
                            className="h-44 w-44 sm:h-52 sm:w-52 object-contain rounded-xl"
                          />
                        </div>
                        <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#F0B90B]/15 px-3 py-1 text-xs font-bold text-[#F0B90B]">
                          🟡 Scan with Binance App
                        </span>
                        <span className="mt-1 text-[11px] text-slate-300 font-medium">
                          Recipient: <strong className="text-white">{binanceName}</strong>
                        </span>
                        <span className="mt-0.5 text-[10px] text-emerald-400 font-semibold">
                          ✓ Instant spot wallet receipt · 0% fee
                        </span>
                      </div>

                      {/* Binance Pay Step-by-Step Instructions */}
                      <div className="flex-1 space-y-2 text-xs leading-relaxed text-slate-300 w-full">
                        <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F0B90B]/20 font-black text-[#F0B90B] text-[11px]">1</span>
                          <p>Open the <strong className="text-white">Binance App</strong> on your phone and tap the <strong className="text-[#F0B90B]">Pay</strong> icon (or tap the top-right <strong className="text-white">Scan [—]</strong> button).</p>
                        </div>
                        <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F0B90B]/20 font-black text-[#F0B90B] text-[11px]">2</span>
                          <p>Scan the <strong className="text-[#F0B90B]">Binance Pay QR Code</strong> shown on the left, or choose <strong className="text-white">Send</strong> and enter Binance UID: <code className="rounded bg-black/40 px-2 py-0.5 font-bold text-white">{binanceUid}</code> <button type="button" onClick={() => handleCopyUid(binanceUid)} className="ml-1 inline-flex items-center rounded border border-[#F0B90B]/30 bg-[#F0B90B]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#F0B90B] hover:bg-[#F0B90B] hover:text-black cursor-pointer">{copiedUid ? "✓ Copied" : "Copy"}</button>.</p>
                        </div>
                        <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F0B90B]/20 font-black text-[#F0B90B] text-[11px]">3</span>
                          <p>Verify that the recipient name displays <strong className="text-[#F0B90B]">{binanceName}</strong> before proceeding.</p>
                        </div>
                        <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F0B90B]/20 font-black text-[#F0B90B] text-[11px]">4</span>
                          <p>Enter the amount of USDT to transfer and confirm (0% fee, instant spot internal transfer).</p>
                        </div>
                        <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F0B90B]/20 font-black text-[#F0B90B] text-[11px]">5</span>
                          <p>On the payment success screen, copy the <strong className="text-[#F0B90B]">Binance Order ID</strong>, take a screenshot of your receipt, and submit below.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: USDT BEP-20 (Trust / MetaMask / Any Wallet) */}
                  {activeBinanceGuide === "bep20" && (
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 pt-1">
                      {/* Embedded USDT BEP-20 QR */}
                      <div className="shrink-0 flex flex-col items-center">
                        <div className="relative overflow-hidden rounded-2xl border-2 border-[#38bdf8]/50 bg-white p-2.5 shadow-2xl">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/binance-usdt-qr.jpg"
                            alt="USDT BEP-20 QR Code"
                            className="h-44 w-44 sm:h-52 sm:w-52 object-contain rounded-xl"
                          />
                        </div>
                        <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#38bdf8]/15 px-3 py-1 text-xs font-bold text-[#38bdf8]">
                          ⚡ Scan with Web3 / Crypto Wallet
                        </span>
                        <span className="mt-1 text-[11px] text-amber-400 font-semibold">
                          ⚠️ BEP-20 (BNB Smart Chain) Only
                        </span>
                        <span className="mt-0.5 text-[10px] text-emerald-400 font-semibold">
                          ✓ Multi-exchange &amp; Web3 wallet compatible
                        </span>
                      </div>

                      {/* USDT BEP-20 Step-by-Step Instructions */}
                      <div className="flex-1 space-y-2 text-xs leading-relaxed text-slate-300 w-full">
                        <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#38bdf8]/20 font-black text-[#38bdf8] text-[11px]">1</span>
                          <p>Open your crypto wallet or exchange (<strong className="text-white">Trust Wallet, MetaMask, OKX, Bybit, KuCoin, or Binance</strong>).</p>
                        </div>
                        <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#38bdf8]/20 font-black text-[#38bdf8] text-[11px]">2</span>
                          <p>Select <strong className="text-white">USDT</strong> and tap <strong className="text-[#38bdf8]">Send / Withdraw</strong>.</p>
                        </div>
                        <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#38bdf8]/20 font-black text-[#38bdf8] text-[11px]">3</span>
                          <p>CRITICAL: Select network <strong className="text-amber-400">BNB Smart Chain (BEP20 / BSC)</strong>. (Do NOT select TRC20 or ERC20).</p>
                        </div>
                        <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#38bdf8]/20 font-black text-[#38bdf8] text-[11px]">4</span>
                          <p>Scan the <strong className="text-[#38bdf8]">USDT QR Code</strong> on the left, or paste our address: <code className="rounded bg-black/40 px-2 py-0.5 font-bold text-white break-all">{binanceUsdtAddress}</code> <button type="button" onClick={() => handleCopyAddress(binanceUsdtAddress)} className="ml-1 inline-flex items-center rounded border border-[#38bdf8]/30 bg-[#38bdf8]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#38bdf8] hover:bg-[#38bdf8] hover:text-black cursor-pointer">{copiedAddress ? "✓ Copied" : "Copy"}</button>.</p>
                        </div>
                        <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2.5 border border-white/5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#38bdf8]/20 font-black text-[#38bdf8] text-[11px]">5</span>
                          <p>Confirm the withdrawal, copy the <strong className="text-[#38bdf8]">TxHash / Transaction ID</strong>, take a screenshot, and submit below.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: How to Find Order ID / TxHash */}
                  {activeBinanceGuide === "find_tid" && (
                    <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                      <div className="flex gap-3 items-start rounded-xl bg-white/[0.02] p-3.5 border border-white/5">
                        <span className="text-xl shrink-0">🟡</span>
                        <div>
                          <p className="font-bold text-white text-sm">For Binance Pay (Pay ID / QR):</p>
                          <p className="text-slate-400 mt-1">
                            Go to Binance App $\rightarrow$ <strong className="text-white">Pay</strong> $\rightarrow$ <strong className="text-white">History</strong> (clock icon in top-right) $\rightarrow$ Tap the payment to <strong className="text-white">{binanceName}</strong> $\rightarrow$ Copy the <strong className="text-[#F0B90B]">Order ID</strong> (a 19 or 20-digit number).
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3 items-start rounded-xl bg-white/[0.02] p-3.5 border border-white/5">
                        <span className="text-xl shrink-0">⚡</span>
                        <div>
                          <p className="font-bold text-white text-sm">For On-Chain USDT (BEP-20 / BSC):</p>
                          <p className="text-slate-400 mt-1">
                            Go to your wallet's activity/withdrawal history $\rightarrow$ Tap your USDT transfer $\rightarrow$ Copy the <strong className="text-[#38bdf8]">TxHash / Transaction Hash</strong> (starts with <code className="text-white">0x...</code>).
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3 items-start rounded-xl bg-white/[0.02] p-3.5 border border-white/5">
                        <span className="text-xl shrink-0">📸</span>
                        <div>
                          <p className="font-bold text-white text-sm">Receipt Screenshot:</p>
                          <p className="text-slate-400 mt-1">
                            Capture a full screenshot showing the completed transaction status, date, and Order ID or TxHash, then attach it in the form below.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            </>
          )}

          {/* OFFICIAL RECEIVING SADAPAY ACCOUNT BOX */}
          {method !== "Binance Pay" && (
            <>
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-lg font-black text-white border border-white/10">
                    💳
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">SadaPay Account Details</h3>
                    <p className="text-xs text-slate-400">Send money from Easypaisa, JazzCash, SadaPay or any Bank</p>
                  </div>
                </div>

                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                  ● 0% Fee • Instant Receipt
                </span>
              </div>

              {/* Account Details with 1-Tap Copy */}
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Account Number */}
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    SadaPay Mobile / Account Number
                  </span>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-lg sm:text-xl font-black tracking-wider text-white">
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
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Account Title / Beneficiary Name
                  </span>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-base sm:text-lg font-black text-white">
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

              <p className="text-[11px] text-slate-400">
                💡 Always verify that the recipient account title shows <strong className="text-white">{sadaPayTitle} ({sadaPayNumber})</strong> before confirming your transfer.
              </p>
            </div>

            {/* Collapsible Transfer Instructions Drawer */}
            <div className="rounded-xl border border-white/10 bg-slate-900/50 overflow-hidden">
              <button
                type="button"
                onClick={() => setTransferGuideOpen(!transferGuideOpen)}
                className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left text-xs sm:text-sm font-bold text-slate-300 hover:bg-white/[0.03] transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>📖</span>
                  <span>View How to Transfer Instructions</span>
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {transferGuideOpen ? "Hide Instructions ▲" : "Expand Instructions ▼"}
                </span>
              </button>

              {transferGuideOpen && (
                <div className="border-t border-white/10 p-4 sm:p-5 bg-black/20 space-y-4">
                  {/* Guide Tabs */}
                  <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
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
                    <div className="space-y-2 text-xs leading-relaxed text-slate-300">
                      <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2 border border-white/5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366]/20 font-black text-[#25d366] text-[11px]">1</span>
                        <p>Open <strong className="text-white">Easypaisa App</strong> and tap <strong className="text-[#25d366]">Bank Transfer</strong>.</p>
                      </div>
                      <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2 border border-white/5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366]/20 font-black text-[#25d366] text-[11px]">2</span>
                        <p>Search for <strong className="text-white">SadaPay</strong> in the bank list and select it.</p>
                      </div>
                      <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2 border border-white/5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366]/20 font-black text-[#25d366] text-[11px]">3</span>
                        <p>Enter account: <code className="rounded bg-black/40 px-2 py-0.5 font-bold text-white">03197008275</code> and enter your deposit amount.</p>
                      </div>
                      <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2 border border-white/5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366]/20 font-black text-[#25d366] text-[11px]">4</span>
                        <p>Confirm recipient is <strong className="text-[#baff00]">Saeed Bashir</strong> and tap <strong className="text-white">Send Now</strong>.</p>
                      </div>
                      <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2 border border-white/5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366]/20 font-black text-[#25d366] text-[11px]">5</span>
                        <p>Save payment screenshot and copy the <strong className="text-[#baff00]">Transaction ID (TID)</strong> to submit below.</p>
                      </div>
                    </div>
                  )}

                  {activeGuide === "jazzcash" && (
                    <div className="space-y-2 text-xs leading-relaxed text-slate-300">
                      <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2 border border-white/5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff9900]/20 font-black text-[#ff9900] text-[11px]">1</span>
                        <p>Open <strong className="text-white">JazzCash App</strong> and select <strong className="text-[#ff9900]">Money Transfer → Bank Transfer</strong>.</p>
                      </div>
                      <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2 border border-white/5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff9900]/20 font-black text-[#ff9900] text-[11px]">2</span>
                        <p>Search and select <strong className="text-white">SadaPay</strong>.</p>
                      </div>
                      <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2 border border-white/5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff9900]/20 font-black text-[#ff9900] text-[11px]">3</span>
                        <p>Enter account number: <code className="rounded bg-black/40 px-2 py-0.5 font-bold text-white">03197008275</code> and amount.</p>
                      </div>
                      <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2 border border-white/5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff9900]/20 font-black text-[#ff9900] text-[11px]">4</span>
                        <p>Confirm beneficiary name is <strong className="text-[#baff00]">Saeed Bashir</strong> and authorize payment.</p>
                      </div>
                      <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2 border border-white/5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff9900]/20 font-black text-[#ff9900] text-[11px]">5</span>
                        <p>Take a receipt screenshot and copy your <strong className="text-[#baff00]">TID number</strong>.</p>
                      </div>
                    </div>
                  )}

                  {activeGuide === "sadapay" && (
                    <div className="space-y-2 text-xs leading-relaxed text-slate-300">
                      <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2 border border-white/5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff6060]/20 font-black text-[#ff6060] text-[11px]">1</span>
                        <p>Open <strong className="text-white">SadaPay</strong> or any Bank App and tap <strong className="text-white">Send Money</strong>.</p>
                      </div>
                      <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2 border border-white/5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff6060]/20 font-black text-[#ff6060] text-[11px]">2</span>
                        <p>Select <strong className="text-white">SadaPay</strong> and enter <code className="rounded bg-black/40 px-2 py-0.5 font-bold text-white">03197008275</code>.</p>
                      </div>
                      <div className="flex gap-2.5 items-start rounded-lg bg-white/[0.02] p-2 border border-white/5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff6060]/20 font-black text-[#ff6060] text-[11px]">3</span>
                        <p>Confirm title <strong className="text-[#baff00]">Saeed Bashir</strong>, send payment, and save receipt screenshot.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            </>
          )}

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
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
                {["SadaPay", "Easypaisa", "JazzCash", "Bank Transfer", "Binance Pay"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setMethod(item);
                      if (item === "Binance Pay" && binanceAmountUsd && Number(binanceAmountUsd) > 0) {
                        setAmount(String(Math.round(Number(binanceAmountUsd) * liveForexUsdRate * 100) / 100));
                      }
                    }}
                    className={`rounded-xl border px-3 py-2.5 text-left transition cursor-pointer ${
                      method === item
                        ? item === "Binance Pay"
                          ? "border-[#F0B90B]/60 bg-[#F0B90B]/15 text-white shadow-sm ring-1 ring-[#F0B90B]/30"
                          : "border-[#baff00]/60 bg-[#baff00]/10 text-white shadow-sm"
                        : "border-white/10 bg-[#0b1418] text-slate-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold">{item === "Binance Pay" ? "🟡 Binance Pay" : item}</span>
                      {method === item && (
                        <Icon name="check" size={15} className={item === "Binance Pay" ? "text-[#F0B90B]" : "text-[#baff00]"} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount & TID inputs */}
            {method === "Binance Pay" ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-400">
                    <span>Deposit Amount (USDT / USD)</span>
                    <span className="text-amber-400 font-normal">Min: $1.00 USD</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-amber-400">$</span>
                    <input
                      type="number"
                      min="1"
                      max="2000"
                      step="0.1"
                      value={binanceAmountUsd}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBinanceAmountUsd(val);
                        if (val && Number(val) > 0) {
                          setAmount(String(Math.round(Number(val) * liveForexUsdRate * 100) / 100));
                        } else {
                          setAmount("");
                        }
                      }}
                      placeholder="e.g. 10.00"
                      className="h-12 w-full rounded-xl border border-white/10 bg-[#0b1418] pl-8 pr-4 text-base sm:text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-[#F0B90B]/50 focus:ring-2 focus:ring-[#F0B90B]/10"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    ≈ <strong className="text-white">₨{amount || "0.00"} PKR</strong> wallet credit (⚡ 1 USD = ₨{liveForexUsdRate} · 0% deposit fee)
                  </p>
                </label>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-400">
                    <span>Binance Order ID / TxHash</span>
                    <span className="text-slate-500 font-normal">From Receipt</span>
                  </div>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. 238910283 or 0x..."
                    className="h-12 w-full rounded-xl border border-white/10 bg-[#0b1418] px-4 text-base sm:text-sm text-white font-mono outline-none placeholder:text-slate-600 focus:border-[#F0B90B]/50 focus:ring-2 focus:ring-[#F0B90B]/10"
                  />
                </label>
              </div>
            ) : (
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
            )}

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
                method === "Binance Pay"
                  ? `Hello VEXARO SMM Admin, I have submitted a deposit of $${binanceAmountUsd || (Number(amount) / liveForexUsdRate).toFixed(2)} USDT (₨${amount || "..."} PKR) via Binance. TxHash / Order ID: ${transactionId || "..."}. Account: ${currentUser?.email || currentUser?.name || "Customer"}. Please verify.`
                  : `Hello Saeed Bashir / VEXARO SMM Admin, I have submitted a deposit of PKR ${amount || "..."} via ${method}. Transaction ID: ${transactionId || "..."}. Account: ${currentUser?.email || currentUser?.name || "Customer"}. Please verify.`
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
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="antigravity-card rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 group relative flex items-center justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {title}
        </p>
        <p className="mt-1 text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
          {value}
        </p>
      </div>

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 group-hover:border-[#baff00]/50 group-hover:text-[#baff00] transition-all">
        <Icon name={icon} size={20} />
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
    <div className="antigravity-card rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-[#baff00]/40 group flex flex-col justify-between">
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
            ₨{Number(price).toFixed(2)}
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