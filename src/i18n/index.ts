import { enUS } from "./locales/en-US";
import { zhCN } from "./locales/zh-CN";
import { getServerLocale, runWithLocale } from "./server_context";
import {
  DEFAULT_LOCALE,
  type I18nDictionary,
  normalizeLocale,
  type SupportedLocale,
} from "./types";

export * from "./types";
export { runWithLocale } from "./server_context";

let clientLocale: SupportedLocale = DEFAULT_LOCALE;

export function setGlobalLocale(locale: SupportedLocale) {
  clientLocale = locale;
}

export function getLocale(): SupportedLocale {
  const serverLoc = getServerLocale();
  if (serverLoc) return serverLoc;
  return clientLocale;
}

export function t(locale?: SupportedLocale): I18nDictionary {
  const target = locale || getLocale();
  if (target === "en-US") return enUS;
  return zhCN;
}

export const getDictionary = t;

export function formatMessage(template: string, params: Record<string, string | number>): string {
  let result = template;
  for (const [k, v] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
  }
  return result;
}
