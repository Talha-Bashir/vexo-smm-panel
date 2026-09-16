import { NextResponse } from "next/server";

const CURRENCIES = [
  "USD", "INR", "AED", "EUR", "GBP", "SAR", "CAD", "AUD",
  "CNY", "JPY", "QAR", "KWD", "BHD", "OMR", "TRY", "MYR",
  "SGD", "THB", "IDR", "EGP", "ZAR", "NZD", "CHF", "SEK",
  "NOK", "DKK", "RUB", "KRW", "BRL",
] as const;

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

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load exchange rates",
      },
      { status: 502 }
    );
  }
}
