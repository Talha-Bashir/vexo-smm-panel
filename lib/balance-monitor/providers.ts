import { getGGSomaBalance } from "@/lib/ggsoma-api";

export interface ProviderBalanceCheckResult {
  id: string;
  name: string;
  success: boolean;
  balance?: number;
  currency?: string;
  error?: string;
}

interface SmmV2ProviderDefinition {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
}

function getSmmV2Providers(): SmmV2ProviderDefinition[] {
  return [
    {
      id: process.env.PROVIDER_1_ID || "pak_smm",
      name: process.env.PROVIDER_1_NAME || "PAK SMM Panels",
      apiUrl: process.env.PROVIDER_1_URL || "https://paksmmpanels.com/api/v2",
      apiKey: process.env.PROVIDER_1_KEY || "",
    },
    {
      id: process.env.PROVIDER_2_ID || "smooth_smm",
      name: process.env.PROVIDER_2_NAME || "Smooth SMM",
      apiUrl: process.env.PROVIDER_2_URL || "https://smoothsmm.com/api/v2",
      apiKey: process.env.PROVIDER_2_KEY || "",
    },
    {
      id: process.env.PROVIDER_3_ID || "am_smm",
      name: process.env.PROVIDER_3_NAME || "AM SMM Panel",
      apiUrl: process.env.PROVIDER_3_URL || "https://amsmmpanel.com/api/v2",
      apiKey: process.env.PROVIDER_3_KEY || "",
    },
    {
      id: process.env.PROVIDER_4_ID || "pakistan_smm",
      name: process.env.PROVIDER_4_NAME || "Pakistan SMM Panel",
      apiUrl: process.env.PROVIDER_4_URL || "https://pakistansmmpanel.pk/api/v2",
      apiKey: process.env.PROVIDER_4_KEY || "",
    },
    {
      id: process.env.PROVIDER_5_ID || "rizvi_smm",
      name: process.env.PROVIDER_5_NAME || "Rizvi SMM Panels",
      apiUrl: process.env.PROVIDER_5_URL || process.env.RIZVI_API_URL || "https://rizvismmpanels.com/api/v2",
      apiKey: process.env.PROVIDER_5_KEY || process.env.RIZVI_API_KEY || "",
    },
  ];
}

async function fetchSmmV2Balance(provider: SmmV2ProviderDefinition, timeoutMs = 12000): Promise<{ balance: number; currency: string }> {
  if (!provider.apiKey) {
    throw new Error(`API key for ${provider.name} (${provider.id}) is not configured`);
  }

  const body = new URLSearchParams({
    key: provider.apiKey,
    action: "balance",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(provider.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      body: body.toString(),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await res.text();
    if (!res.ok) {
      if (res.status === 403) {
        throw new Error(`HTTP 403 Forbidden: ${provider.name} Cloudflare/firewall blocked request. Check API key or whitelist IP.`);
      }
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
    }

    if (data.error) {
      throw new Error(String(data.error));
    }

    const rawBalance = Number(data.balance ?? 0);
    if (!Number.isFinite(rawBalance)) {
      throw new Error(`Unexpected balance format: ${JSON.stringify(data.balance)}`);
    }

    const currency = String(data.currency || "USD").toUpperCase();
    return { balance: rawBalance, currency };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGGSomaProviderBalance(): Promise<{ balance: number; currency: string }> {
  const result = await getGGSomaBalance();
  if (!result.ok || result.balance === undefined) {
    throw new Error(result.error || "Failed to retrieve balance from GGSoma Partner API");
  }

  const parsed = Number(result.balance);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid balance format returned by GGSoma: ${result.balance}`);
  }

  return {
    balance: parsed,
    currency: (result.currency || "USD").toUpperCase(),
  };
}

/**
 * Checks all 6 configured SMM providers concurrently and safely.
 * If any individual provider fails or times out, the other 5 providers complete without issue.
 */
export async function checkAllProviderBalances(): Promise<ProviderBalanceCheckResult[]> {
  const smmProviders = getSmmV2Providers();

  // 1. Prepare checks for the 5 SMM v2 providers
  const smmPromises = smmProviders.map(async (p): Promise<ProviderBalanceCheckResult> => {
    try {
      const res = await fetchSmmV2Balance(p);
      return {
        id: p.id,
        name: p.name,
        success: true,
        balance: res.balance,
        currency: res.currency,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        id: p.id,
        name: p.name,
        success: false,
        error: errorMsg,
      };
    }
  });

  // 2. Prepare check for Provider 6: GGSoma Partner Bot
  const ggsomaPromise = (async (): Promise<ProviderBalanceCheckResult> => {
    const id = "ggsoma_bot";
    const name = "GGSoma Partner Bot";
    try {
      const res = await fetchGGSomaProviderBalance();
      return {
        id,
        name,
        success: true,
        balance: res.balance,
        currency: res.currency,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        id,
        name,
        success: false,
        error: errorMsg,
      };
    }
  })();

  // 3. Execute all 6 concurrently with Promise.all
  const results = await Promise.all([...smmPromises, ggsomaPromise]);
  return results;
}
