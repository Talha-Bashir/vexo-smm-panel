"use client";

import React, { useState } from "react";
import Image from "next/image";

export interface Social3DIconProps {
  platform: string;
  size?: number;
  className?: string;
  glow?: boolean;
}

const PLATFORM_MAP: Record<string, { src: string; glowColor: string; alt: string }> = {
  instagram: {
    src: "/icons/3d/instagram.png",
    glowColor: "rgba(225, 48, 108, 0.45)",
    alt: "Instagram 3D Icon",
  },
  tiktok: {
    src: "/icons/3d/tiktok.png",
    glowColor: "rgba(37, 244, 238, 0.45)",
    alt: "TikTok 3D Icon",
  },
  youtube: {
    src: "/icons/3d/youtube.png",
    glowColor: "rgba(255, 0, 0, 0.45)",
    alt: "YouTube 3D Icon",
  },
  facebook: {
    src: "/icons/3d/facebook.png",
    glowColor: "rgba(24, 119, 242, 0.45)",
    alt: "Facebook 3D Icon",
  },
  whatsapp: {
    src: "/icons/3d/whatsapp.png",
    glowColor: "rgba(37, 211, 102, 0.45)",
    alt: "WhatsApp 3D Icon",
  },
  telegram: {
    src: "/icons/3d/telegram.png",
    glowColor: "rgba(34, 158, 217, 0.45)",
    alt: "Telegram 3D Icon",
  },
  x: {
    src: "/icons/3d/x.png",
    glowColor: "rgba(255, 255, 255, 0.35)",
    alt: "X 3D Icon",
  },
  twitter: {
    src: "/icons/3d/twitter.png",
    glowColor: "rgba(29, 161, 242, 0.45)",
    alt: "Twitter 3D Icon",
  },
  spotify: {
    src: "/icons/3d/spotify.png",
    glowColor: "rgba(29, 185, 84, 0.45)",
    alt: "Spotify 3D Icon",
  },
  discord: {
    src: "/icons/3d/discord.png",
    glowColor: "rgba(88, 101, 242, 0.45)",
    alt: "Discord 3D Icon",
  },
  twitch: {
    src: "/icons/3d/twitch.png",
    glowColor: "rgba(145, 70, 255, 0.45)",
    alt: "Twitch 3D Icon",
  },
  snapchat: {
    src: "/icons/3d/snapchat.png",
    glowColor: "rgba(255, 252, 0, 0.45)",
    alt: "Snapchat 3D Icon",
  },
  pinterest: {
    src: "/icons/3d/pinterest.png",
    glowColor: "rgba(230, 0, 35, 0.45)",
    alt: "Pinterest 3D Icon",
  },
  reddit: {
    src: "/icons/3d/reddit.png",
    glowColor: "rgba(255, 69, 0, 0.45)",
    alt: "Reddit 3D Icon",
  },
  linkedin: {
    src: "/icons/3d/linkedin.png",
    glowColor: "rgba(10, 102, 194, 0.45)",
    alt: "LinkedIn 3D Icon",
  },
  vk: {
    src: "/icons/3d/vk.png",
    glowColor: "rgba(0, 119, 255, 0.45)",
    alt: "VK 3D Icon",
  },
  traffic: {
    src: "/icons/3d/web.png",
    glowColor: "rgba(0, 212, 255, 0.4)",
    alt: "Traffic 3D Icon",
  },
  website: {
    src: "/icons/3d/web.png",
    glowColor: "rgba(0, 212, 255, 0.4)",
    alt: "Website 3D Icon",
  },
  subscriptions: {
    src: "/icons/3d/star.png",
    glowColor: "rgba(168, 85, 247, 0.5)",
    alt: "Subscriptions 3D Icon",
  },
  globe: {
    src: "/icons/3d/web.png",
    glowColor: "rgba(0, 212, 255, 0.4)",
    alt: "Globe 3D Icon",
  },
  star: {
    src: "/icons/3d/star.png",
    glowColor: "rgba(255, 216, 77, 0.45)",
    alt: "Star 3D Icon",
  },
  favorites: {
    src: "/icons/3d/star.png",
    glowColor: "rgba(255, 216, 77, 0.45)",
    alt: "Favorites 3D Icon",
  },
  all: {
    src: "/icons/3d/star.png",
    glowColor: "rgba(186, 255, 0, 0.45)",
    alt: "All Platforms 3D Icon",
  },
};

export function getSocial3DIconData(platformName: string) {
  if (!platformName) return PLATFORM_MAP.star;
  const raw = platformName.toLowerCase().trim();

  if (raw.includes("instagram") || raw === "ig") return PLATFORM_MAP.instagram;
  if (raw.includes("tiktok") || raw === "tt") return PLATFORM_MAP.tiktok;
  if (raw.includes("youtube") || raw === "yt") return PLATFORM_MAP.youtube;
  if (raw.includes("facebook") || raw.includes("fb")) return PLATFORM_MAP.facebook;
  if (raw.includes("whatsapp") || raw.includes("wa")) return PLATFORM_MAP.whatsapp;
  if (raw.includes("telegram") || raw.includes("tg")) return PLATFORM_MAP.telegram;
  if (raw.includes("twitter") || raw.includes("x-social") || raw === "x" || raw.includes("x / twitter")) return PLATFORM_MAP.x;
  if (raw.includes("spotify")) return PLATFORM_MAP.spotify;
  if (raw.includes("discord")) return PLATFORM_MAP.discord;
  if (raw.includes("twitch")) return PLATFORM_MAP.twitch;
  if (raw.includes("snapchat")) return PLATFORM_MAP.snapchat;
  if (raw.includes("pinterest")) return PLATFORM_MAP.pinterest;
  if (raw.includes("reddit")) return PLATFORM_MAP.reddit;
  if (raw.includes("linkedin")) return PLATFORM_MAP.linkedin;
  if (raw.includes("vk")) return PLATFORM_MAP.vk;
  if (raw.includes("subscrip") || raw.includes("app")) return PLATFORM_MAP.subscriptions;
  if (raw.includes("website") || raw.includes("traffic") || raw.includes("globe") || raw.includes("web")) return PLATFORM_MAP.website;
  if (raw.includes("favorite") || raw.includes("bookmark")) return PLATFORM_MAP.favorites;
  if (raw === "all") return PLATFORM_MAP.all;

  return PLATFORM_MAP.star;
}

export function Social3DIcon({
  platform,
  size = 24,
  className = "",
  glow = false,
}: Social3DIconProps) {
  const [hasError, setHasError] = useState(false);
  const data = getSocial3DIconData(platform);

  if (hasError) {
    return (
      <span
        style={{ width: size, height: size }}
        className={`inline-flex items-center justify-center font-bold text-xs select-none ${className}`}
      >
        🌟
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 relative transition-transform duration-200 hover:scale-110 ${className}`}
      style={{
        width: size,
        height: size,
        filter: glow
          ? `drop-shadow(0 0 ${Math.max(4, Math.round(size * 0.25))}px ${data.glowColor})`
          : `drop-shadow(0 2px 4px rgba(0,0,0,0.35))`,
      }}
    >
      <img
        src={data.src}
        alt={data.alt}
        width={size}
        height={size}
        onError={() => setHasError(true)}
        className="w-full h-full object-contain pointer-events-none select-none"
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}

export default Social3DIcon;
