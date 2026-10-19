import type { SupportedLocale } from "./types";

// Safe reference for AsyncLocalStorage in Node/Bun vs Browser environments
let asyncLocalStorageInstance: any = null;

try {
  // Use globalThis detection to ensure browser bundles skip loading node:async_hooks
  const isNodeOrBun = typeof process !== "undefined" &&
    process.versions &&
    (Boolean(process.versions.node) || Boolean((process.versions as any).bun));

  if (isNodeOrBun) {
    // Dynamic require or import that works in Node and Bun without Vite static analysis bundling it
    const asyncHooksModule = "node:async_hooks";
    const { AsyncLocalStorage } = await import(/* @vite-ignore */ asyncHooksModule);
    asyncLocalStorageInstance = new AsyncLocalStorage();
  }
} catch {
  // Graceful no-op fallback in browser bundles
  asyncLocalStorageInstance = null;
}

export function runWithLocale<T>(locale: SupportedLocale, fn: () => T): T {
  if (asyncLocalStorageInstance) {
    return asyncLocalStorageInstance.run(locale, fn);
  }
  return fn();
}

export function getServerLocale(): SupportedLocale | undefined {
  if (asyncLocalStorageInstance) {
    return asyncLocalStorageInstance.getStore();
  }
  return undefined;
}
