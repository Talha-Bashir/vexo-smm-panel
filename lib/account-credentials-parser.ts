/**
 * Utilities for parsing and formatting delivery credentials for ready accounts,
 * software subscriptions, coupons, and activation links.
 */

export interface ParsedAccountItem {
  id: string;
  raw: string;
  email: string | null;
  password: string | null;
  codeUrl: string | null;
  backupEmail: string | null;
  backupPortal: string | null;
  portalUrl: string | null;
  providerName: string;
  isOutlook: boolean;
  isGoogle: boolean;
  isStreaming: boolean;
  hasCredentials: boolean;
}

export interface ParsedAccessDetails {
  raw: string;
  isLink: boolean;
  isCoupon: boolean;
  isReadyAccount: boolean;
  url: string | null;
  accounts: ParsedAccountItem[];
  defaultPortalUrl: string | null;
  defaultProviderName: string;
}

export function parseSingleAccount(line: string, toolName: string = "", index: number = 0): ParsedAccountItem {
  const text = (line || "").trim();
  const cleaned = text.replace(/^__CREDENTIAL__:\s*/i, "").trim();

  // Extract all email addresses
  const emails = cleaned.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  // Extract all URLs
  const urls = cleaned.match(/https?:\/\/[^\s|]+/g) || [];

  let email: string | null = emails[0] || null;
  let backupEmail: string | null = emails.length > 1 ? emails[1] : null;
  let password: string | null = null;
  let codeUrl: string | null = null;
  let backupPortal: string | null = null;

  for (const u of urls) {
    const lower = u.toLowerCase();
    if (
      lower.includes("mailreader") ||
      lower.includes("read_code") ||
      lower.includes("temp-mail") ||
      lower.includes("getcode") ||
      lower.includes("mail-reader") ||
      lower.includes("code")
    ) {
      codeUrl = u;
    } else if (
      lower.includes("fviainboxes") ||
      lower.includes("inbox") ||
      lower.includes("2fa") ||
      lower.includes("webmail")
    ) {
      backupPortal = u;
    } else if (!codeUrl) {
      codeUrl = u;
    }
  }

  // Find password
  if (email) {
    const afterEmail = cleaned.split(email)[1] || "";
    if (afterEmail.startsWith(":")) {
      const rest = afterEmail.slice(1);
      const token = rest.split(/[:|\s]/)[0];
      if (token && !token.startsWith("http")) {
        password = token.trim();
      }
    } else if (afterEmail.trim().startsWith("|")) {
      const parts = afterEmail.split("|").map((s) => s.trim()).filter(Boolean);
      if (parts[0] && !parts[0].startsWith("http") && !parts[0].toLowerCase().includes("2fa")) {
        password = parts[0];
      }
    }
  } else if (cleaned.includes(":") && !cleaned.startsWith("http")) {
    const parts = cleaned.split(":");
    if (parts.length >= 2) {
      email = parts[0].trim();
      const token = parts[1].split(/[:|\s]/)[0].trim();
      if (token && !token.startsWith("http")) {
        password = token;
      }
    }
  }

  const combined = `${toolName} ${email || ""}`.toLowerCase();
  let portalUrl: string | null = null;
  let providerName = "Account Portal";
  let isOutlook = false;
  let isGoogle = false;
  let isStreaming = false;

  if (
    combined.includes("outlook") ||
    combined.includes("hotmail") ||
    combined.includes("live.com") ||
    combined.includes("microsoft") ||
    combined.includes("office")
  ) {
    portalUrl = "https://outlook.live.com/";
    providerName = "Microsoft Outlook";
    isOutlook = true;
  } else if (combined.includes("gmail") || combined.includes("google")) {
    portalUrl = "https://accounts.google.com/";
    providerName = "Google Account";
    isGoogle = true;
  } else if (combined.includes("netflix")) {
    portalUrl = "https://www.netflix.com/login";
    providerName = "Netflix";
    isStreaming = true;
  } else if (combined.includes("chatgpt") || combined.includes("openai")) {
    portalUrl = "https://chatgpt.com/";
    providerName = "ChatGPT (OpenAI)";
  } else if (combined.includes("canva")) {
    portalUrl = "https://www.canva.com/login";
    providerName = "Canva";
  } else if (combined.includes("spotify")) {
    portalUrl = "https://accounts.spotify.com/";
    providerName = "Spotify";
    isStreaming = true;
  } else if (combined.includes("prime") || combined.includes("amazon")) {
    portalUrl = "https://www.primevideo.com/";
    providerName = "Amazon Prime Video";
    isStreaming = true;
  } else if (combined.includes("disney")) {
    portalUrl = "https://www.disneyplus.com/login";
    providerName = "Disney+";
    isStreaming = true;
  } else if (combined.includes("capcut")) {
    portalUrl = "https://www.capcut.com/login";
    providerName = "CapCut";
  }

  return {
    id: `acc-${index + 1}`,
    raw: text,
    email,
    password,
    codeUrl,
    backupEmail,
    backupPortal,
    portalUrl,
    providerName,
    isOutlook,
    isGoogle,
    isStreaming,
    hasCredentials: Boolean(email && password),
  };
}

export function parseAccessDetails(
  license: string,
  deliveryType?: string,
  toolName?: string
): ParsedAccessDetails {
  const text = (license || "").trim();
  const cleanedText = text.replace(/^__CREDENTIAL__:\s*/i, "").trim();
  const isUrl = text.startsWith("http://") || text.startsWith("https://");

  const extractedUrlMatch = cleanedText.match(/https?:\/\/[^\s|]+/i);
  const embeddedUrl = extractedUrlMatch ? extractedUrlMatch[0] : null;

  const isLink = (deliveryType === "LINK" && isUrl) || isUrl;
  const isCoupon = deliveryType === "COUPON";
  const isReadyAccount =
    deliveryType === "READY_ACCOUNT" ||
    (!isLink && !isCoupon && (text.includes(":") || text.includes("@") || text.includes("__CREDENTIAL__")));

  // Split lines if multiple accounts are bundled (e.g. multi-quantity order)
  const rawLines = cleanedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const linesToParse = rawLines.length > 0 ? rawLines : [cleanedText];
  const accounts = linesToParse.map((line, idx) => parseSingleAccount(line, toolName, idx));

  const firstAcc = accounts[0];

  return {
    raw: cleanedText,
    isLink,
    isCoupon,
    isReadyAccount,
    url: isLink ? text : embeddedUrl,
    accounts,
    defaultPortalUrl: firstAcc?.portalUrl || null,
    defaultProviderName: firstAcc?.providerName || "Official Portal",
  };
}
