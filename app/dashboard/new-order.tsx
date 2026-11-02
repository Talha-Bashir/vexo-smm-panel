"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import Social3DIcon from "@/components/social-3d-icon";

export type Service = {
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

export type VexoOrder = {
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
  failureReason?: string | null;
  createdAt: string;
};

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  is_admin?: boolean;
  whatsapp?: string;
};

export interface NewOrderProps {
  services: Service[];
  orders?: VexoOrder[];
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
  currentUser?: CurrentUser | null;
}

/* ---------------- HELPER UTILITIES ---------------- */

function isPackageService(service?: { type?: string; min?: string | number; max?: string | number } | null): boolean {
  if (!service) return false;
  if (service.type && service.type.toLowerCase() === "package") return true;
  const minVal = Number(service.min);
  const maxVal = Number(service.max);
  return minVal === 1 && maxVal === 1;
}

function cleanServiceName(name: string, platform?: string) {
  if (!name) return "";
  let clean = name.replace(/\s{2,}/g, " ").trim();
  if (platform === "WhatsApp") {
    clean = clean.replace(/Whatsapp/gi, "WhatsApp");
  }
  return clean;
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
  if (isServiceDropOrNoRefill(service)) return false;
  if (service.is_guaranteed === true || service.refill === true) return true;
  const text = normalizeDashes(`${service.name} ${service.category || ""}`);
  const guaranteed = /refill|guarantee|guaranteed|non-drop|non drop|r30|r60|r90|r365|lifetime|permanent/i;
  return guaranteed.test(text);
}

const OWNER_CONTACT_NUMBER = "03088180234";

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
    case "Website":
      return "https://yourwebsite.com or target landing page URL";
    case "Subscriptions":
      return "Your email or account handle for subscription activation";
    default:
      return "https://...";
  }
}

function detectServiceAction(service: Service): string {
  const text = `${service.name} ${service.category || ""}`.toLowerCase();
  const plat = (service.platform || "").toLowerCase();

  if (plat.includes("whatsapp")) {
    if (/voice\s*call/.test(text)) return "wa_voice_calls";
    if (/react|emoji|reaction/.test(text)) return "wa_reactions";
    if (/poll|vote/.test(text)) return "wa_poll_votes";
    if (/channel.*(?:follower|sub|member)|follower.*channel|whatsapp followers/.test(text)) return "wa_channel_followers";
    if (/member|group|community/.test(text)) return "wa_members";
    return "wa_other";
  }

  if (plat.includes("instagram")) {
    if (/follower|subscriber/.test(text)) return "followers";
    if (/like/.test(text)) return "likes";
    if (/story/.test(text)) return "story_views";
    if (/reel/.test(text)) return "reels_views";
    if (/view|impression/.test(text)) return "views";
    if (/comment|reply/.test(text)) return "comments";
    if (/save|share/.test(text)) return "shares";
    return "other";
  }

  if (plat.includes("tiktok")) {
    if (/follower/.test(text)) return "followers";
    if (/like|heart/.test(text)) return "likes";
    if (/view/.test(text)) return "views";
    if (/comment/.test(text)) return "comments";
    if (/share|save|repost/.test(text)) return "shares";
    return "other";
  }

  if (plat.includes("youtube")) {
    if (/sub/.test(text)) return "subscribers";
    if (/watch.*(?:time|hour)|hour/.test(text)) return "watch_hours";
    if (/view/.test(text)) return "views";
    if (/like/.test(text)) return "likes";
    if (/comment/.test(text)) return "comments";
    return "other";
  }

  if (plat.includes("facebook")) {
    if (/follower|page like/.test(text)) return "followers";
    if (/like|reaction/.test(text)) return "likes";
    if (/view|video/.test(text)) return "views";
    if (/comment/.test(text)) return "comments";
    if (/share/.test(text)) return "shares";
    if (/member|group/.test(text)) return "members";
    return "other";
  }

  if (plat.includes("telegram")) {
    if (/member|subscriber|channel/.test(text)) return "members";
    if (/view/.test(text)) return "views";
    if (/reaction/.test(text)) return "reactions";
    if (/vote|poll/.test(text)) return "votes";
    return "other";
  }

  if (plat.includes("twitter") || plat.includes("x ") || plat === "x / twitter") {
    if (/follower/.test(text)) return "followers";
    if (/like|favorite/.test(text)) return "likes";
    if (/retweet|repost|share/.test(text)) return "shares";
    if (/view|impression/.test(text)) return "views";
    return "other";
  }

  if (plat.includes("website")) {
    if (/targeted|geo|pakistan|bangladesh|usa|uk/.test(text)) return "web_targeted";
    if (/social/.test(text)) return "web_social";
    if (/organic|google/.test(text)) return "web_organic";
    return "views";
  }

  if (/follower|subscriber|sub\b/.test(text)) return "followers";
  if (/like|heart/.test(text)) return "likes";
  if (/view|impression|traffic/.test(text)) return "views";
  if (/comment|reply/.test(text)) return "comments";
  if (/share|save|repost/.test(text)) return "shares";
  if (/member|group/.test(text)) return "members";
  return "other";
}

type ActionOption = {
  id: string;
  label: string;
  icon: string;
  count: number;
};

function getActionOptionsForPlatform(platform: string, platformServices: Service[]): ActionOption[] {
  const plat = platform.toLowerCase();
  const counts: Record<string, number> = {};
  for (const s of platformServices) {
    const act = detectServiceAction(s);
    counts[act] = (counts[act] || 0) + 1;
  }

  let baseList: { id: string; label: string; icon: string }[] = [];

  if (plat.includes("whatsapp")) {
    baseList = [
      { id: "all", label: "All WhatsApp", icon: "all" },
      { id: "wa_channel_followers", label: "Channel Followers", icon: "user" },
      { id: "wa_reactions", label: "Reactions", icon: "heart" },
      { id: "wa_poll_votes", label: "Poll Votes", icon: "check" },
      { id: "wa_voice_calls", label: "Voice Calls", icon: "headset" },
      { id: "wa_members", label: "Members", icon: "layers" },
      { id: "wa_other", label: "Others", icon: "more" },
    ];
  } else if (plat.includes("instagram")) {
    baseList = [
      { id: "all", label: "All", icon: "all" },
      { id: "followers", label: "Followers", icon: "user" },
      { id: "likes", label: "Likes", icon: "heart" },
      { id: "views", label: "Views", icon: "rocket" },
      { id: "reels_views", label: "Reels Views", icon: "rocket" },
      { id: "story_views", label: "Story Views", icon: "rocket" },
      { id: "shares", label: "Shares", icon: "arrow" },
      { id: "comments", label: "Comments", icon: "more" },
      { id: "other", label: "Others", icon: "more" },
    ];
  } else if (plat.includes("tiktok")) {
    baseList = [
      { id: "all", label: "All", icon: "all" },
      { id: "followers", label: "Followers", icon: "user" },
      { id: "likes", label: "Likes", icon: "heart" },
      { id: "views", label: "Views", icon: "rocket" },
      { id: "shares", label: "Shares", icon: "arrow" },
      { id: "comments", label: "Comments", icon: "more" },
      { id: "other", label: "Others", icon: "more" },
    ];
  } else if (plat.includes("youtube")) {
    baseList = [
      { id: "all", label: "All", icon: "all" },
      { id: "subscribers", label: "Subscribers", icon: "user" },
      { id: "views", label: "Views", icon: "rocket" },
      { id: "likes", label: "Likes", icon: "heart" },
      { id: "watch_hours", label: "Watch Hours", icon: "clock" },
      { id: "comments", label: "Comments", icon: "more" },
      { id: "other", label: "Others", icon: "more" },
    ];
  } else if (plat.includes("facebook")) {
    baseList = [
      { id: "all", label: "All", icon: "all" },
      { id: "followers", label: "Followers", icon: "user" },
      { id: "likes", label: "Likes", icon: "heart" },
      { id: "views", label: "Views", icon: "rocket" },
      { id: "members", label: "Members", icon: "layers" },
      { id: "shares", label: "Shares", icon: "arrow" },
      { id: "comments", label: "Comments", icon: "more" },
      { id: "other", label: "Others", icon: "more" },
    ];
  } else if (plat.includes("telegram")) {
    baseList = [
      { id: "all", label: "All", icon: "all" },
      { id: "members", label: "Members", icon: "layers" },
      { id: "views", label: "Views", icon: "rocket" },
      { id: "reactions", label: "Reactions", icon: "heart" },
      { id: "votes", label: "Poll Votes", icon: "check" },
      { id: "other", label: "Others", icon: "more" },
    ];
  } else if (plat.includes("twitter") || plat.includes("x ") || plat === "x / twitter") {
    baseList = [
      { id: "all", label: "All", icon: "all" },
      { id: "followers", label: "Followers", icon: "user" },
      { id: "likes", label: "Likes", icon: "heart" },
      { id: "views", label: "Views", icon: "rocket" },
      { id: "shares", label: "Shares", icon: "arrow" },
      { id: "other", label: "Others", icon: "more" },
    ];
  } else {
    baseList = [
      { id: "all", label: "All", icon: "all" },
      { id: "followers", label: "Followers", icon: "user" },
      { id: "likes", label: "Likes", icon: "heart" },
      { id: "views", label: "Views", icon: "rocket" },
      { id: "shares", label: "Shares", icon: "arrow" },
      { id: "other", label: "Others", icon: "more" },
    ];
  }

  return baseList
    .map((opt) => ({
      ...opt,
      count: opt.id === "all" ? platformServices.length : counts[opt.id] || 0,
    }))
    .filter((opt) => opt.id === "all" || opt.count > 0);
}

function extractServiceSpecs(service?: Service | null) {
  if (!service) {
    return {
      location: "Worldwide 🌍",
      quality: "HQ Real Accounts",
      startTime: "0 - 15 Minutes",
      speed: "Day 50K - 100K",
      refill: "30-Day Auto Refill ♻️",
      exampleLink: "https://...",
    };
  }

  const text = `${service.name} ${service.description || ""}`.toLowerCase();

  let location = "Worldwide 🌍";
  if (text.includes("pakistan") || text.includes("pk")) location = "Pakistan 🇵🇰";
  else if (text.includes("india") || text.includes("in")) location = "India 🇮🇳";
  else if (text.includes("usa") || text.includes("united states") || text.includes("us")) location = "USA 🇺🇸";
  else if (text.includes("uk") || text.includes("united kingdom")) location = "United Kingdom 🇬🇧";
  else if (text.includes("arab") || text.includes("uae") || text.includes("saudi")) location = "Arab / Middle East 🇸🇦";
  else if (text.includes("target") || text.includes("geo")) location = "Geo-Targeted 🎯";

  let quality = "HQ Real Accounts";
  if (text.includes("bot") || text.includes("cheap")) quality = "Standard Mixed Accounts";
  else if (text.includes("organic") || text.includes("100% real")) quality = "100% Real Active Accounts";
  else if (text.includes("premium") || text.includes("exclusive") || text.includes("hq")) quality = "High Quality (HQ) Accounts";

  let startTime = "0 - 15 Minutes";
  if (text.includes("instant") || text.includes("0-2") || text.includes("0-5")) startTime = "0 - 2 Minutes (Instant Start ⚡)";
  else if (text.includes("0-1h") || text.includes("1 hour")) startTime = "0 - 1 Hour";
  else if (text.includes("12h") || text.includes("24h")) startTime = "1 - 12 Hours";

  let speed = "Day 50K - 100K";
  if (text.includes("100k") || text.includes("super fast")) speed = "Day 100K 🚀";
  else if (text.includes("500k") || text.includes("1m")) speed = "Day 500K - 1M 🚀";
  else if (text.includes("gradual") || text.includes("drip") || text.includes("slow")) speed = "Gradual Natural Speed";
  else if (text.includes("10k") || text.includes("20k")) speed = "Day 10K - 20K";

  let refill = "30-Day Auto Refill ♻️";
  if (isServiceDropOrNoRefill(service)) {
    refill = "No Refill (Stable Dispatch)";
  } else if (text.includes("non drop") || text.includes("non-drop")) {
    refill = "Non-Drop Stable Lifetime 🛡️";
  } else if (text.includes("lifetime")) {
    refill = "Lifetime Guarantee ♻️";
  } else if (text.includes("7 day") || text.includes("7 days")) {
    refill = "7 Days Refill ♻️";
  } else if (text.includes("60 day") || text.includes("60 days")) {
    refill = "60 Days Refill ♻️";
  } else if (isServiceGuaranteed(service)) {
    refill = "30-Day Refill Guarantee ♻️";
  }

  const exampleLink = getServiceLinkPlaceholder(service.platform, detectServiceAction(service));

  return { location, quality, startTime, speed, refill, exampleLink };
}

function getAverageTime(service?: Service | null): string {
  if (!service) return "2 minutes";
  const text = `${service.name} ${service.description || ""}`.toLowerCase();
  if (text.includes("0-2") || text.includes("instant") || text.includes("fast")) return "2 minutes";
  if (text.includes("5 min") || text.includes("5-10")) return "5 minutes";
  if (text.includes("15 min") || text.includes("0-15")) return "12 minutes";
  if (text.includes("30 min") || text.includes("0-30")) return "25 minutes";
  if (text.includes("1 hour") || text.includes("1h")) return "45 minutes";
  if (text.includes("24h") || text.includes("1 day")) return "12 hours";
  return "2 minutes";
}

function LocalIcon({ name, size = 18, className = "" }: { name: string; size?: number; className?: string }) {
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
    case "all":
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common}>
          <path d="M20.8 8.7c0 5.1-8.8 10.2-8.8 10.2S3.2 13.8 3.2 8.7A4.7 4.7 0 0 1 12 6.3a4.7 4.7 0 0 1 8.8 2.4Z" />
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
    case "arrow":
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );
    case "more":
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "layers":
      return (
        <svg {...common}>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 12 9 5 9-5" />
          <path d="m3 16 9 5 9-5" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
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
    case "chevron":
      return (
        <svg {...common}>
          <path d="m7 10 5 5 5-5" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m16.5 16.5 4.5 4.5" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...common}>
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M3 21v-5h5" />
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
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

/* ---------------- MAIN COMPONENT ---------------- */

export default function NewOrder({
  services,
  orders = [],
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
  currentUser,
}: NewOrderProps) {
  const [platform, setPlatform] = useState<string>(() => {
    if (selectedServiceId) {
      const found = services.find((s) => String(s.id) === String(selectedServiceId));
      if (found?.platform) return found.platform;
    }
    return "All";
  });
  const lastSelectedIdRef = useRef<string>(selectedServiceId);
  const [actionType, setActionType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState<boolean>(false);
  const [categorySearch, setCategorySearch] = useState<string>("");
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState<boolean>(false);
  const [serviceSearch, setServiceSearch] = useState<string>("");
  const [link, setLink] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("100");

  const [placingOrder, setPlacingOrder] = useState<boolean>(false);
  const [orderMessage, setOrderMessage] = useState<string>("");
  const [orderError, setOrderError] = useState<string>("");
  const [dismissedOrderBonusBanner, setDismissedOrderBonusBanner] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<number[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("vexo_favorite_services");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false);
      }
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        setServiceDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleFavorite = (serviceId: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setFavorites((prev) => {
      const next = prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId];
      try {
        localStorage.setItem("vexo_favorite_services", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

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
        setOrderMessage("Order details prefilled! Review your configuration and click 'Submit' when ready.");
      }
    }
  }, [buyAgainPrefill]);

  // Platform list definitions matching visual grid icons
  const platformList = useMemo(() => [
    { name: "All", label: "All Platforms", icon: "all", shortLabel: "All" },
    { name: "Instagram", label: "Instagram", icon: "instagram", shortLabel: "Instagram" },
    { name: "TikTok", label: "TikTok", icon: "tiktok", shortLabel: "TikTok" },
    { name: "Facebook", label: "Facebook", icon: "facebook", shortLabel: "Facebook" },
    { name: "Telegram", label: "Telegram", icon: "telegram", shortLabel: "Telegram" },
    { name: "YouTube", label: "YouTube", icon: "youtube", shortLabel: "YouTube" },
    { name: "X / Twitter", label: "X / Twitter", icon: "x", shortLabel: "X" },
    { name: "Spotify", label: "Spotify", icon: "spotify", shortLabel: "Spotify" },
    { name: "WhatsApp", label: "WhatsApp", icon: "whatsapp", shortLabel: "WhatsApp" },
    { name: "Website", label: "Website Traffic", icon: "website", shortLabel: "Web" },
    { name: "Subscriptions", label: "App Subscriptions", icon: "subscriptions", shortLabel: "Tools" },
    { name: "Discord", label: "Discord", icon: "discord", shortLabel: "Discord" },
    { name: "Favorites", label: "⭐ Bookmarks", icon: "star", shortLabel: "Saved" },
    { name: "Other", label: "Other Services", icon: "more", shortLabel: "Other" },
  ], []);

  // Compute live service count per platform
  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: services.length,
      Favorites: favorites.filter((id) => services.some((s) => s.id === id)).length,
    };
    for (const s of services) {
      const p = s.platform || "Other";
      counts[p] = (counts[p] || 0) + 1;
    }
    return counts;
  }, [services, favorites]);

  // Filter: Services by platform
  const servicesByPlatform = useMemo(() => {
    if (platform === "All") return services;
    if (platform === "Favorites") return services.filter((s) => favorites.includes(s.id));
    return services.filter((s) => s.platform?.toLowerCase() === platform.toLowerCase());
  }, [services, platform, favorites]);

  // Action options for the selected platform
  const actionOptions = useMemo(() => {
    return getActionOptionsForPlatform(platform, servicesByPlatform);
  }, [platform, servicesByPlatform]);

  // Filter: Services by action type
  const servicesByAction = useMemo(() => {
    if (actionType === "all") return servicesByPlatform;
    return servicesByPlatform.filter((s) => detectServiceAction(s) === actionType);
  }, [servicesByPlatform, actionType]);

  // Categories list for current platform and action
  const categories = useMemo(() => {
    const list: { name: string; count: number; firstService: Service }[] = [];
    const map = new Map<string, { name: string; count: number; firstService: Service }>();
    for (const s of servicesByAction) {
      const cat = (s.category || `${s.platform || "Other"} Services`).trim();
      const existing = map.get(cat);
      if (existing) {
        existing.count++;
      } else {
        const item = { name: cat, count: 1, firstService: s };
        map.set(cat, item);
        list.push(item);
      }
    }
    return list;
  }, [servicesByAction]);

  // Active Category derived strictly
  const activeCategory = useMemo(() => {
    if (selectedCategory && categories.some((c) => c.name === selectedCategory)) {
      return selectedCategory;
    }
    return categories[0]?.name || "";
  }, [categories, selectedCategory]);

  // Filtered categories for inline dropdown search
  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  // Services in current active category
  const servicesInActiveCategory = useMemo(() => {
    if (!activeCategory) return servicesByAction;
    return servicesByAction.filter(
      (s) => (s.category || `${s.platform || "Other"} Services`).trim() === activeCategory
    );
  }, [servicesByAction, activeCategory]);

  // Filtered services for inline service dropdown search
  const filteredServicesInCategory = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return servicesInActiveCategory;
    return servicesInActiveCategory.filter((s) => {
      const text = `${s.id} ${s.name} ${s.platform}`.toLowerCase();
      return text.includes(q);
    });
  }, [servicesInActiveCategory, serviceSearch]);

  // Global search results for the top Search Bar
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const isNum = /^\d+$/.test(q);
    return services
      .filter((s) => {
        if (isNum && String(s.id) === q) return true;
        const text = `${s.id} ${s.name} ${s.platform} ${s.category || ""} ${s.description || ""}`.toLowerCase();
        return text.includes(q);
      })
      .slice(0, 15);
  }, [searchQuery, services]);

  // Active Service Selection
  const service = useMemo(() => {
    if (selectedServiceId) {
      const foundInCat = servicesInActiveCategory.find((s) => String(s.id) === String(selectedServiceId));
      if (foundInCat) return foundInCat;
      const foundInAction = servicesByAction.find((s) => String(s.id) === String(selectedServiceId));
      if (foundInAction) return foundInAction;
      const foundGlobal = services.find((s) => String(s.id) === String(selectedServiceId));
      if (foundGlobal) return foundGlobal;
    }
    return servicesInActiveCategory[0] || servicesByAction[0] || services[0] || null;
  }, [servicesInActiveCategory, servicesByAction, services, selectedServiceId]);

  // Auto-select first service if nothing selected
  useEffect(() => {
    if (!selectedServiceId && services.length > 0) {
      onSelectServiceId(String(services[0].id));
    }
  }, [selectedServiceId, services, onSelectServiceId]);

  // Align platform, action, and category when selectedServiceId changes externally
  useEffect(() => {
    if (selectedServiceId && selectedServiceId !== lastSelectedIdRef.current) {
      lastSelectedIdRef.current = selectedServiceId;
      const target = services.find((s) => String(s.id) === String(selectedServiceId));
      if (target) {
        if (target.platform) setPlatform(target.platform);
        setActionType(detectServiceAction(target));
        setSelectedCategory((target.category || `${target.platform || "Other"} Services`).trim());
      }
    }
  }, [selectedServiceId, services]);

  const activePlatformItem = useMemo(() => {
    return platformList.find((p) => p.name.toLowerCase() === platform.toLowerCase()) || platformList[0];
  }, [platformList, platform]);

  const handleSelectPlatform = (p: string) => {
    setPlatform(p);
    setActionType("all");
    setSelectedCategory("");
    setSearchQuery("");
    setSearchFocused(false);
    setCategoryDropdownOpen(false);
    setServiceDropdownOpen(false);

    // Pick first service of this platform
    if (p !== "All") {
      const matching = p === "Favorites"
        ? services.find((s) => favorites.includes(s.id))
        : services.find((s) => s.platform?.toLowerCase() === p.toLowerCase());
      if (matching) {
        lastSelectedIdRef.current = String(matching.id);
        onSelectServiceId(String(matching.id));
        setSelectedCategory((matching.category || `${matching.platform || "Other"} Services`).trim());
      }
    }
  };

  const handleSelectAction = (actId: string) => {
    setActionType(actId);
    setSelectedCategory("");
    setCategoryDropdownOpen(false);
    setServiceDropdownOpen(false);

    // Pick first service of this action
    const slice = actId === "all"
      ? (platform === "All" ? services : services.filter((s) => s.platform?.toLowerCase() === platform.toLowerCase()))
      : (platform === "All" ? services : services.filter((s) => s.platform?.toLowerCase() === platform.toLowerCase())).filter((s) => detectServiceAction(s) === actId);
    if (slice.length > 0) {
      lastSelectedIdRef.current = String(slice[0].id);
      onSelectServiceId(String(slice[0].id));
      setSelectedCategory((slice[0].category || `${slice[0].platform || "Other"} Services`).trim());
    }
  };

  const handleSelectCategory = (catName: string) => {
    setSelectedCategory(catName);
    setCategoryDropdownOpen(false);
    setCategorySearch("");

    const firstInCat = servicesByAction.find(
      (s) => (s.category || `${s.platform || "Other"} Services`).trim() === catName
    );
    if (firstInCat) {
      lastSelectedIdRef.current = String(firstInCat.id);
      onSelectServiceId(String(firstInCat.id));
    }
  };

  const handleSelectService = (s: Service) => {
    lastSelectedIdRef.current = String(s.id);
    onSelectServiceId(String(s.id));
    setServiceDropdownOpen(false);
    setServiceSearch("");
  };

  const handleSelectSearchedService = (s: Service) => {
    lastSelectedIdRef.current = String(s.id);
    onSelectServiceId(String(s.id));
    if (s.platform) setPlatform(s.platform);
    setActionType(detectServiceAction(s));
    setSelectedCategory((s.category || `${s.platform || "Other"} Services`).trim());
    setSearchQuery("");
    setSearchFocused(false);
  };

  const isPackage = isPackageService(service);
  const specs = useMemo(() => extractServiceSpecs(service), [service]);

  // Detect whether an order on the exact same link is already active
  const isSameLinkActive = useMemo(() => {
    if (!orders || !link || !link.trim() || link.trim().length < 5) return false;
    const cleanInputLink = link.trim().toLowerCase();
    return orders.some((o) => {
      const st = (o.status || "").toLowerCase();
      const isActive = st === "pending" || st === "in progress" || st === "processing";
      if (!isActive) return false;
      const orderLink = (o.link || "").trim().toLowerCase();
      return orderLink === cleanInputLink;
    });
  }, [link, orders]);

  // Adjust quantity default on service switch
  useEffect(() => {
    if (!service) return;
    if (isPackage) {
      setQuantity("1");
    } else {
      const cur = Number(quantity);
      const minVal = Number(service.min) || 10;
      const maxVal = Number(service.max) || 1000000;
      if (cur < minVal || cur > maxVal || !quantity || (cur === 1 && minVal > 1)) {
        setQuantity(String(minVal));
      }
    }
  }, [service?.id, isPackage]);

  // Float-safe charge calculation
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
        status: data.status ? String(data.status) : "Pending",
        failureReason: data.isScheduled ? "Scheduled: Waiting for prior order on this link to complete" : undefined,
        createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
      };

      onOrderCreated(createdOrder);
      const isScheduled = String(data.status || "").toLowerCase() === "scheduled";
      setOrderMessage(
        isScheduled
          ? `Order #${data.orderId || createdOrder.localId.slice(0, 8)} placed and Scheduled! Because you already have an active order on this link, this order is queued and will automatically start once your active order completes.`
          : data.orderId
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
            Select your platform, category, and package for instant automated dispatch.
          </p>
        </div>

        {(platform !== "All" || actionType !== "all" || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setPlatform("All");
              setActionType("all");
              setSelectedCategory("");
              setSearchQuery("");
            }}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white hover:border-[#baff00]/40 transition flex items-center gap-2 cursor-pointer"
          >
            <LocalIcon name="refresh" size={13} />
            <span>Reset All</span>
          </button>
        )}
      </div>

      {/* Prominent Balance Header */}
      <div className="w-full max-w-3xl mx-auto rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d1f18] via-[#0b161a] to-[#121d20] p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#baff00]/15 border border-[#baff00]/30 text-2xl text-[#baff00] shadow-[0_0_15px_rgba(186,255,0,0.15)]">
            💳
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Your Available Balance
              </span>
              {bonusBalancePkr > 0 && (
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-300">
                  +₨{bonusBalancePkr.toFixed(2)} Bonus
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                ₨{Number(walletBalancePkr || 0).toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                (~${((walletBalancePkr || 0) / (currencyRates?.USD && currencyRates.USD > 1 ? currencyRates.USD : 278)).toFixed(2)} USD)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate("Add Funds")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#baff00] hover:bg-[#d2ff5a] px-4 py-2.5 text-xs font-black text-[#07100f] shadow transition cursor-pointer"
          >
            <span>➕</span>
            <span>Add Funds / Deposit</span>
          </button>
        </div>
      </div>

      {/* Dismissible Promotional Bonus Banner */}
      {bonusBalancePkr > 0 && !dismissedOrderBonusBanner && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-300 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <span className="text-emerald-400 font-bold">ℹ</span>
            <p>
              You have <strong className="text-white">₨{bonusBalancePkr.toFixed(2)}</strong> promotional credit available. It will be automatically applied to eligible orders.
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

      {/* SMM Panel New Order Interface Card */}
      <div className="w-full max-w-3xl mx-auto rounded-2xl border border-white/10 bg-[#12161f] p-4 sm:p-7 space-y-6 shadow-2xl">
        {/* 1. TOP PLATFORM ICON SELECTOR GRID */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-2.5">
          {platformList.map((p) => {
            const isSelected = platform.toLowerCase() === p.name.toLowerCase();
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => handleSelectPlatform(p.name)}
                title={`${p.label || p.name} (${platformCounts[p.name] ?? 0} services)`}
                className={`h-12 sm:h-13 rounded-xl flex items-center justify-center transition cursor-pointer relative group ${
                  isSelected
                    ? p.name === "All"
                      ? "bg-[#baff00] text-[#07100f] font-bold shadow-[0_0_18px_rgba(186,255,0,0.35)] ring-2 ring-[#baff00]"
                      : "bg-[#baff00]/15 border-2 border-[#baff00] text-white shadow-[0_0_18px_rgba(186,255,0,0.25)] scale-[1.03]"
                    : "bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white hover:border-white/20"
                }`}
              >
                {p.name === "All" ? (
                  <div className="flex items-center justify-center">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="7" height="7" rx="1.5" />
                      <rect x="14" y="3" width="7" height="7" rx="1.5" />
                      <rect x="14" y="14" width="7" height="7" rx="1.5" />
                      <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    </svg>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Social3DIcon platform={p.icon} size={22} glow />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 2. ACTION / SERVICE TYPE PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {actionOptions.map((opt) => {
            const isSelected = actionType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectAction(opt.id)}
                className={`shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  isSelected
                    ? "bg-[#baff00] text-[#07100f] shadow-sm"
                    : "bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <LocalIcon
                  name={opt.icon}
                  size={14}
                  className={isSelected ? "text-[#07100f]" : "text-slate-400"}
                />
                <span>{opt.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isSelected ? "bg-black/20 text-[#07100f]" : "bg-white/10 text-slate-400"
                  }`}
                >
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3. INLINE SEARCH BAR */}
        <div className="relative" ref={searchRef}>
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <LocalIcon name="search" size={16} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchFocused(true);
            }}
            onFocus={() => setSearchFocused(true)}
            placeholder="Search"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-9 py-3 text-xs sm:text-sm text-white outline-none focus:border-[#baff00] focus:ring-1 focus:ring-[#baff00]/20 placeholder:text-slate-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          )}

          {/* Autocomplete Results Dropdown */}
          {searchQuery.trim() && searchFocused && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-white/20 bg-[#0d1620] p-3 shadow-2xl backdrop-blur-2xl max-h-[380px] overflow-y-auto space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between px-2 pb-1.5 border-b border-white/10 text-[11px] text-slate-400">
                <span className="font-semibold text-white">
                  Found {searchResults.length} matching service{searchResults.length === 1 ? "" : "s"}
                </span>
                <span>Click to select</span>
              </div>
              {searchResults.length > 0 ? (
                searchResults.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectSearchedService(s)}
                    className="w-full text-left rounded-xl p-2.5 transition flex items-center justify-between gap-3 border border-white/5 bg-white/[0.03] hover:border-[#baff00]/40 hover:bg-white/[0.08] cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-[#baff00] text-[#07100f] font-mono text-[10px] font-black px-1.5 py-0.5">
                          #{s.id}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {s.platform}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-white truncate">
                        {cleanServiceName(s.name, s.platform)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-[#baff00]">₨{Number(s.price).toFixed(2)}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  No services match &quot;{searchQuery}&quot;.
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. CATEGORY DROPDOWN */}
        <div className="space-y-1.5 relative" ref={categoryDropdownRef}>
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-bold text-slate-200">
              Category
            </label>
            <span className="text-[11px] text-slate-400">
              {categories.length} categories available
            </span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setCategoryDropdownOpen(!categoryDropdownOpen);
                setServiceDropdownOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition cursor-pointer ${
                categoryDropdownOpen
                  ? "border-[#baff00] bg-white/[0.08]"
                  : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base shrink-0">
                  {activePlatformItem?.icon && activePlatformItem.icon !== "all" ? (
                    <Social3DIcon platform={activePlatformItem.icon} size={18} />
                  ) : (
                    "📁"
                  )}
                </span>
                <span className="text-xs sm:text-sm font-bold text-white truncate">
                  {activeCategory || "Select Category"}
                </span>
              </div>
              <LocalIcon
                name="chevron"
                size={14}
                className={`text-slate-400 transition-transform shrink-0 ${categoryDropdownOpen ? "rotate-180 text-[#baff00]" : ""}`}
              />
            </button>

            {categoryDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-white/15 bg-[#0f1824] backdrop-blur-2xl p-2.5 shadow-2xl space-y-1.5 max-h-72 overflow-y-auto">
                {categories.length > 5 && (
                  <div className="relative pb-1">
                    <input
                      type="text"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Search category..."
                      className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white outline-none focus:border-[#baff00] placeholder:text-slate-400"
                    />
                  </div>
                )}
                {filteredCategories.map((cat) => {
                  const isSelected = activeCategory === cat.name;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => handleSelectCategory(cat.name)}
                      className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition cursor-pointer ${
                        isSelected
                          ? "bg-[#baff00]/15 text-white font-bold border-l-2 border-[#baff00]"
                          : "hover:bg-white/[0.06] text-slate-300 hover:text-white"
                      }`}
                    >
                      <span className="text-xs sm:text-sm font-medium truncate">
                        {cat.name}
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 5. SERVICE DROPDOWN WITH HIGH-CONTRAST LIME BADGE */}
        <div className="space-y-1.5 relative" ref={serviceDropdownRef}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm font-bold text-slate-200">
                Service
              </label>
              {service && (
                <button
                  type="button"
                  onClick={(e) => toggleFavorite(service.id, e)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                    favorites.includes(service.id)
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                      : "bg-white/5 text-slate-400 hover:text-amber-300 border border-white/10"
                  }`}
                  title={favorites.includes(service.id) ? "Remove from bookmarks" : "Save to bookmarks"}
                >
                  <span>{favorites.includes(service.id) ? "⭐ Bookmarked" : "☆ Bookmark"}</span>
                </button>
              )}
            </div>
            <span className="text-[11px] text-slate-400">
              {servicesInActiveCategory.length} services available
            </span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setServiceDropdownOpen(!serviceDropdownOpen);
                setCategoryDropdownOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition cursor-pointer ${
                serviceDropdownOpen
                  ? "border-[#baff00] bg-white/[0.08]"
                  : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
              }`}
            >
              {service ? (
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="rounded-md bg-[#baff00] text-[#07100f] font-mono text-xs font-black px-2 py-0.5 shrink-0 shadow-sm">
                    {service.id}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-white truncate">
                    - {cleanServiceName(service.name, service.platform)}
                  </span>
                </div>
              ) : (
                <span className="text-xs sm:text-sm text-slate-400">Select a service...</span>
              )}
              <LocalIcon
                name="chevron"
                size={14}
                className={`text-slate-400 transition-transform shrink-0 ${serviceDropdownOpen ? "rotate-180 text-[#baff00]" : ""}`}
              />
            </button>

            {serviceDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-white/15 bg-[#0f1824] backdrop-blur-2xl p-2.5 shadow-2xl space-y-1.5 max-h-72 overflow-y-auto">
                {servicesInActiveCategory.length > 5 && (
                  <div className="relative pb-1">
                    <input
                      type="text"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="Search service name or ID..."
                      className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white outline-none focus:border-[#baff00] placeholder:text-slate-400"
                    />
                  </div>
                )}
                {filteredServicesInCategory.map((s) => {
                  const isSelected = service?.id === s.id;
                  const isPkg = isPackageService(s);
                  return (
                    <div
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectService(s)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectService(s);
                        }
                      }}
                      className={`w-full flex items-center justify-between gap-3 rounded-lg p-2.5 text-left transition cursor-pointer border ${
                        isSelected
                          ? "bg-[#baff00]/15 border-[#baff00]/40 text-white font-bold"
                          : "border-transparent hover:bg-white/[0.06] text-slate-300 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="rounded bg-[#baff00] text-[#07100f] font-mono text-xs font-black px-1.5 py-0.5 shrink-0">
                          {s.id}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold truncate text-white">
                            {cleanServiceName(s.name, s.platform)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Min: {isPkg ? "1" : Number(s.min).toLocaleString()} • Max: {isPkg ? "1" : Number(s.max).toLocaleString()}
                            {isServiceGuaranteed(s) && " • 30-Day Refill"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-black text-[#baff00]">
                          ₨{Number(s.price).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          /{isPkg ? "pkg" : "1k"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 6. DESCRIPTION CARD */}
        {service && (
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-bold text-slate-200">
              Description
            </label>
            <div className="rounded-xl border border-white/10 bg-[#0a111a] p-4 sm:p-5 space-y-3 text-xs text-slate-300 font-sans leading-relaxed">
              <div className="space-y-1 text-slate-200">
                <p>- Location: <span className="font-semibold text-white">{specs.location}</span></p>
                <p>- Quality: <span className="font-semibold text-white">{specs.quality}</span></p>
                <p>- Start Time: <span className="font-semibold text-white">{specs.startTime}</span></p>
                <p>- Speed: <span className="font-semibold text-white">{specs.speed}</span></p>
                <p>- Refill: <span className="font-semibold text-white">{specs.refill}</span></p>
                <p>- Example Link: <span className="font-mono text-slate-300 text-[11px]">{specs.exampleLink}</span></p>
              </div>

              <div className="pt-2 border-t border-white/5 space-y-1">
                <p className="font-bold text-slate-200">Important:</p>
                <p className="text-[11px] text-slate-400">• In case of high demand for the service, there may be changes in speed and start time.</p>
                <p className="text-[11px] text-slate-400">• Do not place the second order on the same link before your order is completed in the system.</p>
              </div>

              {service.description && (
                <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 leading-normal">
                  {formatServiceDescription(service.description)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. LINK INPUT */}
        <div className="space-y-1.5">
          <label className="text-xs sm:text-sm font-bold text-slate-200">
            Link
          </label>
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder={specs.exampleLink}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#baff00] focus:ring-1 focus:ring-[#baff00]/20 outline-none transition"
          />

          {/* Auto-Scheduling Notice when link already has active order */}
          {isSameLinkActive && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200 flex items-start gap-2.5 animate-in fade-in duration-150">
              <span className="text-base leading-none">⏳</span>
              <div>
                <p className="font-bold text-amber-100">Auto-Scheduling Active</p>
                <p className="mt-0.5 text-[11px] text-amber-200/90 leading-relaxed">
                  An order on this link is currently in progress. Your new order will be safely placed into <strong>Scheduled</strong> state and automatically dispatched once the current order completes!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 8. QUANTITY INPUT */}
        <div className="space-y-1.5">
          <label className="text-xs sm:text-sm font-bold text-slate-200">
            Quantity {isPackage && "(Fixed Package Unit)"}
          </label>
          <input
            type="number"
            min={service ? service.min : "1"}
            max={service ? service.max : "1000000"}
            value={quantity}
            readOnly={isPackage}
            onChange={(e) => {
              if (!isPackage) setQuantity(e.target.value);
            }}
            placeholder={isPackage ? "1" : "100"}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm sm:text-base font-bold text-white placeholder:text-slate-500 focus:border-[#baff00] focus:ring-1 focus:ring-[#baff00]/20 outline-none transition"
          />
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              {service
                ? `Min: ${Number(service.min).toLocaleString()} - Max: ${Number(service.max).toLocaleString()}`
                : "Min: 10 - Max: 1,000,000"}
            </span>
            {!isPackage && service && (
              <div className="flex items-center gap-1.5">
                {["500", "1000", "5000"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuantity(preset)}
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300 hover:border-white/30 hover:text-white transition cursor-pointer"
                  >
                    {Number(preset).toLocaleString()}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setQuantity(String(service.max))}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300 hover:border-white/30 hover:text-white transition cursor-pointer"
                >
                  Max
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 9. AVERAGE TIME */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <label className="text-xs sm:text-sm font-bold text-slate-200">
              Average time
            </label>
            <span
              className="text-slate-400 text-xs cursor-help"
              title="Estimated delivery launch and processing time for this service"
            >
              ⓘ
            </span>
          </div>
          <div className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs sm:text-sm font-medium text-slate-300">
            {getAverageTime(service)}
          </div>
        </div>

        {/* 10. CHARGE */}
        <div className="space-y-1.5">
          <label className="text-xs sm:text-sm font-bold text-slate-200">
            Charge
          </label>
          <div className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm sm:text-base font-bold font-mono text-[#baff00]">
            = PKR {charge.toFixed(2)}
          </div>
        </div>

        {/* 11. SUBMIT CTA */}
        <div className="pt-2 space-y-3">
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
            className="w-full rounded-xl py-3.5 sm:py-4 text-sm sm:text-base font-black bg-[#baff00] text-[#07100f] shadow-[0_4px_25px_rgba(186,255,0,0.28)] hover:bg-[#d2ff5a] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center gap-2"
          >
            {placingOrder
              ? "Placing Order..."
              : isInsufficient
                ? "Insufficient Balance"
                : "Submit"}
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
        </div>
      </div>
    </div>
  );
}
