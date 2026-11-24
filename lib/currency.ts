export interface CurrencyItem {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

export const POPULAR_CURRENCIES = ["USD", "PKR", "AED", "SAR", "INR", "EUR", "GBP"];

export const ALL_CURRENCIES: CurrencyItem[] = [
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨", flag: "🇵🇰" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", flag: "🇸🇦" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧" },
  { code: "CAD", name: "Canadian Dollar", symbol: "$", flag: "🇨🇦" },
  { code: "AUD", name: "Australian Dollar", symbol: "$", flag: "🇦🇺" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵" },
  { code: "QAR", name: "Qatari Riyal", symbol: "﷼", flag: "🇶🇦" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك", flag: "🇰🇼" },
  { code: "BHD", name: "Bahraini Dinar", symbol: ".د.ب", flag: "🇧🇭" },
  { code: "OMR", name: "Omani Rial", symbol: "﷼", flag: "🇴🇲" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", flag: "🇹🇷" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", flag: "🇲🇾" },
  { code: "SGD", name: "Singapore Dollar", symbol: "$", flag: "🇸🇬" },
  { code: "THB", name: "Thai Baht", symbol: "฿", flag: "🇹🇭" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", flag: "🇮🇩" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£", flag: "🇪🇬" },
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "$", flag: "🇳🇿" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", flag: "🇨🇭" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", flag: "🇸🇪" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", flag: "🇳🇴" },
  { code: "DKK", name: "Danish Krone", symbol: "kr", flag: "🇩🇰" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", flag: "🇷🇺" },
  { code: "KRW", name: "South Korean Won", symbol: "₩", flag: "🇰🇷" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", flag: "🇧🇷" },
];

/**
 * Exchange rates: How many PKR per 1 unit of foreign currency.
 * Used as immediate reliable fallback if live API rate is unavailable or loading.
 */
export const FALLBACK_RATES: Record<string, number> = {
  PKR: 1.0,
  USD: 278.5,
  INR: 3.32,
  AED: 75.8,
  EUR: 302.0,
  GBP: 355.0,
  SAR: 74.2,
  CAD: 204.5,
  AUD: 182.0,
  CNY: 38.5,
  JPY: 1.85,
  QAR: 76.5,
  KWD: 906.0,
  BHD: 738.0,
  OMR: 723.0,
  TRY: 8.1,
  MYR: 62.8,
  SGD: 212.0,
  THB: 8.1,
  IDR: 0.017,
  EGP: 5.7,
  ZAR: 15.6,
  NZD: 168.0,
  CHF: 318.0,
  SEK: 26.8,
  NOK: 26.2,
  DKK: 40.5,
  RUB: 3.0,
  KRW: 0.20,
  BRL: 50.5,
};

export function getCurrencyInfo(code: string): CurrencyItem {
  const found = ALL_CURRENCIES.find((c) => c.code.toUpperCase() === code?.toUpperCase());
  return found || { code: code || "USD", name: code || "US Dollar", symbol: code === "PKR" ? "₨" : "$", flag: "🌐" };
}

export function getCurrencyRate(code: string, rates?: Record<string, number>): number {
  if (!code || code === "PKR") return 1.0;
  const rate = rates?.[code];
  if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
    return rate;
  }
  const fallback = FALLBACK_RATES[code];
  if (typeof fallback === "number" && Number.isFinite(fallback) && fallback > 0) {
    return fallback;
  }
  return code === "USD" ? 278.5 : 1.0;
}

export function convertPkrToCurrency(
  amountPkr: number,
  targetCurrency: string,
  rates?: Record<string, number>
): number {
  const numPkr = Number(amountPkr);
  if (!Number.isFinite(numPkr) || numPkr === 0) return 0;
  if (targetCurrency === "PKR") return numPkr;
  const pkrPerUnit = getCurrencyRate(targetCurrency, rates);
  return numPkr / pkrPerUnit;
}

export function convertCurrencyToPkr(
  amount: number,
  sourceCurrency: string,
  rates?: Record<string, number>
): number {
  const num = Number(amount);
  if (!Number.isFinite(num) || num === 0) return 0;
  if (sourceCurrency === "PKR") return num;
  const pkrPerUnit = getCurrencyRate(sourceCurrency, rates);
  return num * pkrPerUnit;
}

export function formatCurrency(
  amountPkr: number,
  currencyCode: string = "USD",
  rates?: Record<string, number>,
  options?: {
    showCode?: boolean;
    fixedDecimals?: number;
    showApprox?: boolean;
  }
): string {
  const numPkr = Number(amountPkr);
  if (!Number.isFinite(numPkr)) return "—";

  const info = getCurrencyInfo(currencyCode);
  const isPkr = currencyCode === "PKR";

  if (isPkr) {
    const formattedVal = numPkr.toLocaleString(undefined, {
      minimumFractionDigits: options?.fixedDecimals ?? 2,
      maximumFractionDigits: options?.fixedDecimals ?? 2,
    });
    return `${info.symbol}${formattedVal}${options?.showCode ? " PKR" : ""}`;
  }

  const converted = convertPkrToCurrency(numPkr, currencyCode, rates);
  const decimals =
    options?.fixedDecimals !== undefined
      ? options.fixedDecimals
      : converted > 0 && converted < 1
      ? 4
      : 2;

  const formattedVal = converted.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const approxPrefix = options?.showApprox ? "≈ " : "";
  const codeSuffix = options?.showCode ? ` ${currencyCode}` : "";
  return `${approxPrefix}${info.symbol}${formattedVal}${codeSuffix}`;
}

export function saveSelectedCurrency(code: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("vexo_currency", code);
    window.dispatchEvent(
      new CustomEvent("vexo_currency_changed", { detail: { currency: code } })
    );
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Failed to save currency to localStorage:", e);
  }
}

export function getStoredCurrency(defaultCurrency = "USD"): string {
  if (typeof window === "undefined") return defaultCurrency;
  try {
    const saved = localStorage.getItem("vexo_currency");
    if (saved && ALL_CURRENCIES.some((c) => c.code === saved)) {
      return saved;
    }
  } catch {}
  return defaultCurrency;
}
