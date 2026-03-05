"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CURRENCY_SYMBOLS, EXCHANGE_RATES, PlatformSettings } from "@/types";

interface Settings {
  currency: string;
  theme: string;
  remind_3d: boolean;
  remind_7d: boolean;
  remind_14d: boolean;
  monthly_budget: number;
}

interface SettingsCtx {
  settings: Settings;
  saveSettings: (s: Settings) => Promise<void>;
  currencySymbol: string;
  convertToDisplay: (amount: number, fromCurrency: string) => number;
  platform: PlatformSettings;
  savePlatform: (p: PlatformSettings) => Promise<void>;
}

const defaultSettings: Settings = {
  currency: "USD", theme: "dark", remind_3d: false, remind_7d: true, remind_14d: false, monthly_budget: 0
};

const defaultPlatform: PlatformSettings = {
  app_name: "Nexyo", primary_color: "#6366F1", allow_registration: true
};

const Ctx = createContext<SettingsCtx>({
  settings: defaultSettings,
  saveSettings: async () => {},
  currencySymbol: "$",
  convertToDisplay: (a) => a,
  platform: defaultPlatform,
  savePlatform: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [platform, setPlatform] = useState<PlatformSettings>(defaultPlatform);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(data => {
      if (data && !data.error) {
        const s = {
          ...defaultSettings, ...data,
          remind_3d: !!data.remind_3d, remind_7d: !!data.remind_7d, remind_14d: !!data.remind_14d,
          monthly_budget: Number(data.monthly_budget) || 0
        };
        setSettings(s);
        applyTheme(s.theme);
      }
    }).catch(() => {});

    fetch("/api/platform").then(r => r.json()).then(data => {
      if (data && !data.error) {
        setPlatform({ ...defaultPlatform, ...data, allow_registration: !!data.allow_registration });
        applyPrimaryColor(data.primary_color || "#6366F1");
      }
    }).catch(() => {});
  }, []);

  const applyTheme = (theme: string) => {
    document.documentElement.className = theme === "light" ? "light" : "dark";
  };

  const applyPrimaryColor = (color: string) => {
    document.documentElement.style.setProperty("--accent", color);
    document.documentElement.style.setProperty("--accent-rgb", hexToRgb(color));
  };

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  };

  const saveSettings = async (s: Settings) => {
    setSettings(s);
    applyTheme(s.theme);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s)
    });
  };

  const savePlatform = async (p: PlatformSettings) => {
    setPlatform(p);
    applyPrimaryColor(p.primary_color);
    await fetch("/api/platform", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p)
    });
  };

  const convertToDisplay = (amount: number, fromCurrency: string): number => {
    if (fromCurrency === settings.currency) return amount;
    const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
    const toRate = EXCHANGE_RATES[settings.currency] || 1;
    return (amount / fromRate) * toRate;
  };

  return (
    <Ctx.Provider value={{
      settings,
      saveSettings,
      currencySymbol: CURRENCY_SYMBOLS[settings.currency] || "$",
      convertToDisplay,
      platform,
      savePlatform,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSettings = () => useContext(Ctx);
