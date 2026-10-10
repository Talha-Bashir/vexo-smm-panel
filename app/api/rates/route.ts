import { NextResponse } from "next/server";

const CURRENCIES = [
  "USD", "INR", "AED", "EUR", "GBP", "SAR", "CAD", "AUD",
  "CNY", "JPY", "QAR", "KWD", "BHD", "OMR", "TRY", "MYR",
  "SGD", "THB", "IDR", "EGP", "ZAR", "NZD", "CHF", "SEK",
  "NOK", "DKK", "RUB", "KRW", "BRL",
] as const;

const FALLBACK_RATES: Record<string, number> = {
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

let cachedRates: { rates: Record<string, number>; updatedAt: string } | null = null;
let lastRatesFetch = 0;
const RATES_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET() {
  try {
    const now = Date.now();
    if (cachedRates && now - lastRatesFetch < RATES_CACHE_TTL) {
      return NextResponse.json({
        success: true,
        base: "PKR",
        rates: cachedRates.rates,
        updatedAt: cachedRates.updatedAt,
        cached: true,
      });
    }

    const response = await fetch("https://open.er-api.com/v6/latest/PKR", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Exchange-rate provider returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const sourceRates = data?.rates;

    if (!sourceRates || typeof sourceRates !== "object") {
      throw new Error("Exchange-rate provider returned invalid data");
    }

    const rates: Record<string, number> = {};

    for (const currency of CURRENCIES) {
      const pkrToCurrency = Number(
        (sourceRates as Record<string, unknown>)[currency]
      );

      if (Number.isFinite(pkrToCurrency) && pkrToCurrency > 0) {
        // API is PKR -> currency. VEXO needs currency -> PKR for wallet display.
        rates[currency] = 1 / pkrToCurrency;
      }
    }

    cachedRates = {
      rates,
      updatedAt: new Date().toISOString(),
    };
    lastRatesFetch = now;

    return NextResponse.json({
      success: true,
      base: "PKR",
      rates,
      updatedAt: cachedRates.updatedAt,
    });
  } catch (error) {
    console.error("VEXO RATES ERROR:", error);

    if (cachedRates) {
      return NextResponse.json({
        success: true,
        base: "PKR",
        rates: cachedRates.rates,
        updatedAt: cachedRates.updatedAt,
        stale: true,
      });
    }

    return NextResponse.json({
      success: true,
      base: "PKR",
      rates: FALLBACK_RATES,
      updatedAt: new Date().toISOString(),
      fallback: true,
    });
  }
}
