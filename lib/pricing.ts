const VEXO_MARKUP = Number(process.env.VEXO_MARKUP ?? "0.07");
const USD_TO_PKR = Number(process.env.USD_TO_PKR ?? "278.0");

function safeNumber(value: string | number): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

export function getVexoRate(
  rizviRate: string | number,
  rateMultiplier: number = 1 + VEXO_MARKUP,
  customUsdToPkr?: number
): number {
  const usdRate = safeNumber(rizviRate);
  let effectiveMult = Number.isFinite(rateMultiplier) && rateMultiplier > 0 ? rateMultiplier : (1 + VEXO_MARKUP);
  if (effectiveMult === 1) {
    effectiveMult = 1 + VEXO_MARKUP;
  }
  const fxRate = Number.isFinite(customUsdToPkr) && (customUsdToPkr as number) > 0 ? (customUsdToPkr as number) : USD_TO_PKR;

  if (usdRate < 0 || !Number.isFinite(fxRate) || fxRate <= 0) {
    return 0;
  }

  return Math.round(usdRate * fxRate * effectiveMult * 10000) / 10000;
}

export function isPackageService(
  serviceType?: string,
  min?: number | string,
  max?: number | string
): boolean {
  const isTypePkg = serviceType?.toLowerCase() === "package";
  const isOneLimit = Number(min) === 1 && Number(max) === 1;
  return Boolean(isTypePkg || isOneLimit);
}

export function calculateVexoCharge(
  rizviRate: string | number,
  quantity: string | number,
  rateMultiplier: number = 1,
  serviceType?: string,
  min?: number | string,
  max?: number | string
): number {
  const qty = safeNumber(quantity);
  if (qty <= 0) return 0;
  const unitRate = getVexoRate(rizviRate, rateMultiplier);
  if (isPackageService(serviceType, min, max)) {
    return Math.round((unitRate * qty + Number.EPSILON) * 100) / 100;
  }
  return Math.round(((qty * (unitRate / 1000)) + Number.EPSILON) * 100) / 100;
}
