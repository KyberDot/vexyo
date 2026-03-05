export interface Subscription {
  id: number;
  user_id: number;
  name: string;
  amount: number;
  currency: string;
  cycle: "monthly" | "yearly" | "weekly" | "quarterly";
  category: string;
  icon?: string;
  color: string;
  next_date?: string;
  member_id?: number;
  member_name?: string;
  notes?: string;
  trial: boolean;
  active: boolean;
  payment_method_id?: number;
  payment_method_label?: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: number;
  user_id: number;
  name: string;
  avatar?: string;
  color: string;
  created_at: string;
}

export interface PaymentMethod {
  id: number;
  user_id: number;
  label: string;
  type: string;
  last4?: string;
  brand?: string;
  is_default: boolean;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  sub_id?: number;
  message: string;
  read: boolean;
  created_at: string;
  sub_name?: string;
  sub_icon?: string;
}

export interface UserSettings {
  user_id: number;
  currency: string;
  theme: string;
  remind_3d: boolean;
  remind_7d: boolean;
  remind_14d: boolean;
  monthly_budget: number;
}

export interface PlatformSettings {
  app_name: string;
  logo?: string;
  primary_color: string;
  allow_registration: boolean;
}

export const CATEGORIES = [
  "Entertainment", "Music", "Software", "Storage", "Productivity",
  "Health", "News", "Gaming", "Education", "Utilities",
  "Developer Tools", "Cloud Storage", "Other"
];

export const CYCLES = ["monthly", "yearly", "weekly", "quarterly"] as const;

export const CAT_COLORS: Record<string, string> = {
  Entertainment: "#8B5CF6", Music: "#10B981", Software: "#3B82F6",
  Storage: "#F59E0B", Productivity: "#6366F1", Health: "#EF4444",
  News: "#64748B", Gaming: "#F97316", Education: "#14B8A6",
  Utilities: "#84CC16", "Developer Tools": "#EC4899",
  "Cloud Storage": "#06B6D4", Other: "#94A3B8"
};

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.36, AUD: 1.53, EGP: 48.5
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$", EGP: "E£"
};

export function convertAmount(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
  const toRate = EXCHANGE_RATES[toCurrency] || 1;
  return (amount / fromRate) * toRate;
}

export function toMonthly(amount: number, cycle: string): number {
  if (cycle === "monthly") return amount;
  if (cycle === "yearly") return amount / 12;
  if (cycle === "weekly") return amount * 4.33;
  if (cycle === "quarterly") return amount / 3;
  return amount;
}

export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

export function fmtCurrency(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  return sym + fmt(amount);
}
