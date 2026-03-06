import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Fallback static rates
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.36, AUD: 1.53, EGP: 48.5, JPY: 149, INR: 83
};

export async function GET() {
  const db = getDb();
  const cache = db.prepare("SELECT * FROM exchange_rate_cache WHERE id = 1").get() as any;

  // Use cache if < 6 hours old
  if (cache) {
    const age = Date.now() - new Date(cache.updated_at).getTime();
    if (age < 6 * 60 * 60 * 1000) {
      return NextResponse.json(JSON.parse(cache.rates_json));
    }
  }

  // Try to fetch live rates
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 21600 } });
    if (res.ok) {
      const data = await res.json();
      if (data.rates) {
        const rates: Record<string, number> = {};
        for (const code of ["USD", "EUR", "GBP", "CAD", "AUD", "EGP", "JPY", "INR"]) {
          rates[code] = data.rates[code] || FALLBACK_RATES[code];
        }
        const json = JSON.stringify(rates);
        db.prepare("INSERT OR REPLACE INTO exchange_rate_cache (id, rates_json, updated_at) VALUES (1, ?, datetime('now'))").run(json);
        return NextResponse.json(rates);
      }
    }
  } catch {}

  // Return cached or fallback
  if (cache) return NextResponse.json(JSON.parse(cache.rates_json));
  return NextResponse.json(FALLBACK_RATES);
}
