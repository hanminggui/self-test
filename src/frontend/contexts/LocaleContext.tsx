import React, { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_LOCALE,
  getDictionary,
  normalizeLocale,
  setGlobalLocale,
  type I18nDictionary,
  type SupportedLocale,
} from "../../i18n";

interface LocaleContextType {
  locale: SupportedLocale;
  setLocale: (loc: SupportedLocale) => void;
  dict: I18nDictionary;
  t: I18nDictionary;
  formatMessage: (template: string, params: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

function detectBrowserLocale(): SupportedLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const saved = localStorage.getItem("app_locale");
  if (saved) return normalizeLocale(saved);

  const navLang = navigator.language || (navigator as any).userLanguage || "";
  if (navLang.toLowerCase().startsWith("zh")) {
    return "zh-CN";
  }
  return "en-US";
}

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(detectBrowserLocale);

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    setGlobalLocale(newLocale);
    try {
      localStorage.setItem("app_locale", newLocale);
    } catch {}
  };

  useEffect(() => {
    setGlobalLocale(locale);
  }, [locale]);

  const dict = getDictionary(locale);

  const formatMessage = (template: string, params: Record<string, string | number>): string => {
    let result = template;
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
    return result;
  };

  return (
    <LocaleContext.Provider
      value={{
        locale,
        setLocale,
        dict,
        t: dict,
        formatMessage,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
};

export function useLocale(): LocaleContextType {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    const fallbackLocale = DEFAULT_LOCALE;
    const dict = getDictionary(fallbackLocale);
    return {
      locale: fallbackLocale,
      setLocale: () => {},
      dict,
      t: dict,
      formatMessage: (template: string) => template,
    };
  }
  return ctx;
}
