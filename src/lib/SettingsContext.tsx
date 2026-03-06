"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { CURRENCY_SYMBOLS, EXCHANGE_RATES as STATIC_RATES, PlatformSettings, DEFAULT_CATEGORIES, UserCategory } from "@/types";
import { type Lang, TRANSLATIONS, t as translate } from "@/lib/i18n";

interface Settings {
  currency: string; theme: string;
  remind_3d: boolean; remind_7d: boolean; remind_14d: boolean;
  monthly_budget: number; date_format: string; week_start: string; language: string;
}
interface SettingsCtx {
  settings: Settings; saveSettings: (s: Settings) => Promise<void>;
  currencySymbol: string;
  convertToDisplay: (amount: number, fromCurrency: string) => number;
  platform: PlatformSettings; savePlatform: (p: PlatformSettings) => Promise<void>;
  categories: UserCategory[]; reloadCategories: () => Promise<void>;
  userAvatar: string | null; userName: string | null; userRole: string | null;
  reloadProfile: () => Promise<void>;
  lang: Lang; t: (key: string) => string;
}

const defaultSettings: Settings = {
  currency: "USD", theme: "dark", remind_3d: false, remind_7d: true, remind_14d: false,
  monthly_budget: 0, date_format: "MMM D, YYYY", week_start: "monday", language: "en"
};
const defaultPlatform: PlatformSettings = { app_name: "Vexyo", primary_color: "#6366F1", allow_registration: true, magic_link_enabled: false };

const SETTINGS_KEY = "vexyo_settings";
const PLATFORM_KEY = "vexyo_platform";
const PROFILE_KEY = "vexyo_profile";

function readCache<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? { ...fallback, ...JSON.parse(v) } : fallback; } catch { return fallback; }
}
function writeCache(key: string, val: any) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

const Ctx = createContext<SettingsCtx>({
  settings: defaultSettings, saveSettings: async () => {},
  currencySymbol: "$", convertToDisplay: (a) => a,
  platform: defaultPlatform, savePlatform: async () => {},
  categories: DEFAULT_CATEGORIES, reloadCategories: async () => {},
  userAvatar: null, userName: null, userRole: null, reloadProfile: async () => {},
  lang: "en" as Lang, t: (key: string) => key,
});

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `${r}, ${g}, ${b}`;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage cache immediately (no flicker)
  const [settings, setSettings] = useState<Settings>(() => readCache(SETTINGS_KEY, defaultSettings));
  const [platform, setPlatform] = useState<PlatformSettings>(() => readCache(PLATFORM_KEY, defaultPlatform));
  const [categories, setCategories] = useState<UserCategory[]>(DEFAULT_CATEGORIES);
  const cachedProfile = readCache<{ avatar: string | null; name: string | null; role: string | null }>(PROFILE_KEY, { avatar: null, name: null, role: null });
  const [userAvatar, setUserAvatar] = useState<string | null>(cachedProfile.avatar);
  const [userName, setUserName] = useState<string | null>(cachedProfile.name);
  const [userRole, setUserRole] = useState<string | null>(cachedProfile.role);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(STATIC_RATES);
  const lang = ((settings.language || "en") as Lang);

  const applyTheme = (t: string) => { document.documentElement.className = t === "light" ? "light" : "dark"; };
  const applyColor = (c: string) => {
    if (!c || !c.startsWith("#")) return;
    document.documentElement.style.setProperty("--accent", c);
    document.documentElement.style.setProperty("--accent-rgb", hexToRgb(c));
  };
  const updateFavicon = (url: string) => {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = url;
  };

  // Apply cached values immediately on mount
  useEffect(() => {
    applyTheme(settings.theme);
    applyColor(platform.primary_color);
    if (platform.favicon) updateFavicon(platform.favicon);
  }, []);

  const reloadProfile = useCallback(async () => {
    try {
      const d = await fetch("/api/profile").then(r => r.json());
      if (!d.error) {
        setUserAvatar(d.avatar || null);
        setUserName(d.name || null);
        setUserRole(d.role || null);
        writeCache(PROFILE_KEY, { avatar: d.avatar || null, name: d.name || null, role: d.role || null });
      }
    } catch {}
  }, []);

  const reloadCategories = useCallback(async () => {
    try {
      const d = await fetch("/api/categories").then(r => r.json());
      if (Array.isArray(d) && d.length > 0) setCategories(d);
      else setCategories(DEFAULT_CATEGORIES);
    } catch { setCategories(DEFAULT_CATEGORIES); }
  }, []);

  useEffect(() => {
    // Fetch fresh data from server (will update if different from cache)
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d && !d.error) {
        const s: Settings = { ...defaultSettings, ...d, remind_3d: !!d.remind_3d, remind_7d: !!d.remind_7d, remind_14d: !!d.remind_14d, monthly_budget: Number(d.monthly_budget) || 0 };
        setSettings(s);
        writeCache(SETTINGS_KEY, s);
        applyTheme(s.theme);
      }
    }).catch(() => {});
    fetch("/api/platform").then(r => r.json()).then(d => {
      if (d && !d.error) {
        const p: PlatformSettings = { ...defaultPlatform, ...d, allow_registration: !!d.allow_registration, magic_link_enabled: !!d.magic_link_enabled };
        setPlatform(p);
        writeCache(PLATFORM_KEY, p);
        applyColor(p.primary_color || "#6366F1");
        if (d.favicon) updateFavicon(d.favicon);
      }
    }).catch(() => {});
    reloadCategories();
    reloadProfile();
    // Fetch live exchange rates
    fetch("/api/exchange-rates").then(r => r.json()).then(rates => {
      if (rates && typeof rates === "object") setExchangeRates(rates);
    }).catch(() => {});
  }, []);

  const saveSettings = async (s: Settings) => {
    setSettings(s);
    writeCache(SETTINGS_KEY, s);
    applyTheme(s.theme);
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
  };

  const savePlatform = async (p: PlatformSettings) => {
    setPlatform(p);
    writeCache(PLATFORM_KEY, p);
    applyColor(p.primary_color || "#6366F1");
    if (p.favicon) updateFavicon(p.favicon);
    await fetch("/api/platform", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
  };

  const convertToDisplay = (amount: number, from: string): number => {
    if (from === settings.currency) return amount;
    return (amount / (exchangeRates[from] || 1)) * (exchangeRates[settings.currency] || 1);
  };

  return (
    <Ctx.Provider value={{ settings, saveSettings, currencySymbol: CURRENCY_SYMBOLS[settings.currency] || "$", convertToDisplay, platform, savePlatform, categories, reloadCategories, userAvatar, userName, userRole, reloadProfile, lang, t: (key: string) => translate(lang, key) }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSettings = () => useContext(Ctx);
