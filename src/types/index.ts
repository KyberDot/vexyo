export interface Subscription {
  id: number; user_id: number; type: "subscription" | "bill";
  name: string; amount: number; currency: string;
  cycle: "monthly" | "yearly" | "weekly" | "quarterly" | "6-months" | "variable";
  category: string; icon?: string; color: string; next_date?: string;
  member_id?: number; member_name?: string; notes?: string;
  trial: boolean; active: boolean;
  payment_method_id?: number; payment_method_label?: string;
  created_at: string; updated_at: string;
}

export interface FamilyMember {
  id: number; user_id: number; name: string; avatar?: string; color: string; created_at: string;
}

export interface PaymentMethod {
  id: number; user_id: number; label: string; type: string;
  last4?: string; brand?: string; is_default: boolean; created_at: string;
}

export interface Notification {
  id: number; user_id: number; sub_id?: number; type: string;
  title: string; message: string; read: boolean; created_at: string;
}

export interface UserCategory {
  id: number; user_id: number; name: string; icon: string; color: string; budget: number;
}

export interface UserSettings {
  user_id: number; currency: string; theme: string;
  remind_3d: boolean; remind_7d: boolean; remind_14d: boolean;
  monthly_budget: number; date_format: string; week_start: string; language: string;
}

export interface PlatformSettings {
  app_name: string; logo?: string; favicon?: string;
  primary_color: string; allow_registration: boolean; magic_link_enabled?: boolean;
  mail_host?: string; mail_port?: number; mail_user?: string;
  mail_pass?: string; mail_from?: string; mail_secure?: boolean;
}

export const DEFAULT_CATEGORIES: UserCategory[] = [
  { id: -1, user_id: 0, name: "Entertainment", icon: "🎬", color: "#8B5CF6", budget: 0 },
  { id: -2, user_id: 0, name: "Music", icon: "🎵", color: "#10B981", budget: 0 },
  { id: -3, user_id: 0, name: "Software", icon: "💻", color: "#3B82F6", budget: 0 },
  { id: -4, user_id: 0, name: "Cloud Storage", icon: "☁️", color: "#06B6D4", budget: 0 },
  { id: -5, user_id: 0, name: "Productivity", icon: "⚡", color: "#6366F1", budget: 0 },
  { id: -6, user_id: 0, name: "Health", icon: "❤️", color: "#EF4444", budget: 0 },
  { id: -7, user_id: 0, name: "News", icon: "📰", color: "#64748B", budget: 0 },
  { id: -8, user_id: 0, name: "Gaming", icon: "🎮", color: "#F97316", budget: 0 },
  { id: -9, user_id: 0, name: "Education", icon: "📚", color: "#14B8A6", budget: 0 },
  { id: -10, user_id: 0, name: "Utilities", icon: "🔧", color: "#84CC16", budget: 0 },
  { id: -11, user_id: 0, name: "Developer Tools", icon: "⚙️", color: "#EC4899", budget: 0 },
  { id: -12, user_id: 0, name: "Other", icon: "📦", color: "#94A3B8", budget: 0 },
];

export const CYCLES = ["weekly", "monthly", "quarterly", "6-months", "yearly", "variable"] as const;

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.36, AUD: 1.53, EGP: 48.5, JPY: 149, INR: 83
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$", EGP: "E£", JPY: "¥", INR: "₹"
};

export const CURRENCIES = [
  { code: "USD", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧" },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "EGP", name: "Egyptian Pound", flag: "🇪🇬" },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "INR", name: "Indian Rupee", flag: "🇮🇳" },
];

export function convertAmount(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  return (amount / (EXCHANGE_RATES[from] || 1)) * (EXCHANGE_RATES[to] || 1);
}

export function toMonthly(amount: number, cycle: string): number {
  if (cycle === "monthly") return amount;
  if (cycle === "yearly") return amount / 12;
  if (cycle === "weekly") return amount * 4.33;
  if (cycle === "quarterly") return amount / 3;
  if (cycle === "6-months") return amount / 6;
  if (cycle === "variable") return 0;
  return amount;
}

export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function fmt(n: number, d = 2): string { return n.toFixed(d); }

export function fmtCurrency(amount: number, currency: string): string {
  return (CURRENCY_SYMBOLS[currency] || currency) + fmt(amount);
}
