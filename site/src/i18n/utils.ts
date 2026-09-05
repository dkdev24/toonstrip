// i18n plumbing — locale detection, translation lookup, localized routing
// (SITE_DEV_PLAN.md §13). Modeled on danielkimdev-astro's src/i18n/utils.ts.
//
// Key namespace convention: dictionaries are nested objects grouped by surface
// (`nav`, `footer`, `docs`, …). Components look strings up by dot path, e.g.
// `t('nav.docs')` or `t('codeAndStrip.showAllPanels', { count: 3 })`. en.json is
// the canonical shape; ko.json is type-checked against it so the two can never
// drift out of key parity.

import en from "./en.json";
import ko from "./ko.json";

export type Lang = "en" | "ko";

export const defaultLang: Lang = "en";

/** Display labels for each locale (used by the language toggle). */
export const languages: Record<Lang, string> = {
  en: "English",
  ko: "한국어",
};

// en.json is the source of truth for the dictionary shape. Asserting ko against
// `typeof en` makes a missing/extra key in ko.json a compile error (`astro check`).
const dictionaries = {
  en,
  ko: ko satisfies typeof en,
} as const;

type NestedKeyOf<T> = {
  [K in keyof T & string]: T[K] extends Record<string, unknown> ? `${K}.${NestedKeyOf<T[K]>}` : K;
}[keyof T & string];

export type TranslationKey = NestedKeyOf<typeof en>;

type TranslationParams = Record<string, string | number>;

/** Derive the active locale from a URL pathname. English serves from the root
 * (no prefix); Korean lives under `/ko/`. Anything else falls back to default. */
export function getLangFromUrl(url: URL): Lang {
  const [, maybeLang] = url.pathname.split("/");
  if (maybeLang === "ko") return "ko";
  return defaultLang;
}

/** The other locale — handy for the language toggle and hreflang alternates. */
export function getAltLocale(lang: Lang): Lang {
  return lang === "en" ? "ko" : "en";
}

/**
 * Returns a `t(key, params?)` bound to `lang`. Looks the dot-path key up in the
 * locale dictionary, falls back to English, then to the raw key, and substitutes
 * any `{token}` placeholders from `params`.
 */
export function useTranslations(lang: Lang) {
  return function t(key: TranslationKey, params?: TranslationParams): string {
    const resolved = lookup(dictionaries[lang], key) ?? lookup(dictionaries[defaultLang], key);
    if (resolved == null) return key;
    return params ? interpolate(resolved, params) : resolved;
  };
}

function lookup(dict: unknown, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((node, part) => {
    if (node && typeof node === "object" && part in node) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
  return typeof value === "string" ? value : undefined;
}

/** Exported so client islands (which get a plain-object `strings` prop, not `t`) can
 * interpolate `{token}` placeholders in templated strings themselves. */
export function interpolate(template: string, params: TranslationParams): string {
  return template.replace(/\{(\w+)\}/g, (match, token: string) => (token in params ? String(params[token]) : match));
}

/**
 * Localizes an in-site path for `lang`. English paths are returned untouched
 * (served from root); Korean paths get a `/ko` prefix. Idempotent — a path that
 * already carries the right prefix is returned unchanged. External/anchor links
 * (`http`, `#`, `mailto:`) pass through.
 */
export function getLocalizedPath(path: string, lang: Lang): string {
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;

  let normalized = path.replace(/^\/ko(?=\/|$)/, "");
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  if (normalized === "") normalized = "/";

  if (lang === "en") return normalized;

  return normalized === "/" ? "/ko/" : `/ko${normalized}`;
}
