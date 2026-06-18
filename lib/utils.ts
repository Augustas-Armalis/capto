type ClassValue = string | number | boolean | undefined | null | ClassValue[] | Record<string, boolean>;

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const walk = (v: ClassValue): void => {
    if (!v) return;
    if (typeof v === "string" || typeof v === "number") {
      out.push(String(v));
      return;
    }
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
    if (typeof v === "object") {
      for (const k in v) if (v[k]) out.push(k);
    }
  };
  inputs.forEach(walk);
  return out.join(" ");
}

export function formatPrice(amount: number, currency = "EUR", locale = "en-IE") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export const CONTLES_URL = "https://contles.com?ref=subby";
