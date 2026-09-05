// @ts-check
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import { toonstrip } from "@toonstrip/astro";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// React-targeting deps (shadcn/Radix) must be bundled during prerender so the
// react -> preact/compat alias applies; externalized, they would load real react.
const NO_EXTERNAL = [
  "react", "react-dom", "react/jsx-runtime", "react-dom/test-utils",
  /^@radix-ui\//, /^react-/, /^use-/, "aria-hidden", /^@floating-ui\//,
];

// toonstrip.danielkimdev.com — see SITE_DEV_PLAN.md (what) and DESIGN.md (how).
export default defineConfig({
  site: "https://toonstrip.danielkimdev.com",

  // Static build, deployed by Cloudflare Pages' GitHub integration on push.
  // Output lands in site/dist; the root wrangler.toml points Pages at it.
  output: "static",

  // SITE_DEV_PLAN.md §13.1: English (default) at root with no /en/ prefix;
  // Korean under /ko/. Pages are hand-duplicated under src/pages/ko/, not
  // Astro's automatic i18n routing — this block mainly drives the sitemap
  // integration's locale awareness below.
  i18n: {
    defaultLocale: "en",
    locales: ["en", "ko"],
    routing: {
      prefixDefaultLocale: false,
    },
  },

  integrations: [
    // Both packs are served so docs and the playground can show either.
    toonstrip({ packs: ["@toonstrip/pack-comic-chat", "@toonstrip/pack-example"] }),
    mdx(),
    // Only the playground island uses Preact (SITE_DEV_PLAN.md §3).
    // compat: true aliases react/react-dom to preact/compat so the copied shadcn/ui
    // components (Radix) run on Preact (PLAYGROUND_UI_PLAN.md §2).
    preact({ compat: true }),
    // Emits hreflang alternates so EN/KO pages cross-reference each other for SEO.
    sitemap({
      i18n: {
        defaultLocale: "en",
        locales: { en: "en", ko: "ko" },
      },
    }),
  ],

  // Tailwind v4 is scoped to the playground island via playground-ui.css @source rules.
  // tslib is an optional peer of react-remove-scroll (Radix), which pnpm does not
  // link into the store; alias it to the site's copy.
  vite: {
    plugins: [tailwindcss()],
    resolve: { alias: { tslib: require.resolve("tslib/tslib.es6.mjs") } },
    // Bundle the React-targeting deps during prerender so the react -> preact/compat
    // alias applies there too (externalized modules would load the real react).
    ssr: { noExternal: NO_EXTERNAL },
    environments: { prerender: { resolve: { noExternal: NO_EXTERNAL } }, ssr: { resolve: { noExternal: NO_EXTERNAL } } },
  },

  // Same dual-theme Shiki setup as danielkimdev.com: github-light by default,
  // github-dark swapped in under [data-theme="dark"] (see global.css). The
  // transformer stamps <pre data-language> so CodeBlock can label it.
  markdown: {
    shikiConfig: {
      themes: { light: "github-light-default", dark: "github-dark-default" },
      wrap: true,
      transformers: [
        {
          name: "data-language",
          pre(node) {
            if (this.options.lang) node.properties["data-language"] = this.options.lang;
          },
        },
      ],
    },
  },

  // DESIGN.md section 3. Self-hosted at build via the Astro fonts API.
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Bricolage Grotesque",
      cssVariable: "--font-display",
      weights: [500, 700],
      subsets: ["latin"],
      fallbacks: ["system-ui", "sans-serif"],
      optimizedFallbacks: true,
      display: "swap",
    },
    {
      provider: fontProviders.google(),
      name: "DM Sans",
      cssVariable: "--font-body",
      weights: [400, 500, 700],
      subsets: ["latin"],
      fallbacks: ["system-ui", "sans-serif"],
      optimizedFallbacks: true,
      display: "swap",
    },
    {
      // Hangul for balloon text drawn by @toonstrip/core (its stack names
      // "Noto Sans KR"); the element waits for it before painting. Declared,
      // never preloaded: unicode-range subsets download only when Korean
      // text is actually drawn.
      provider: fontProviders.google(),
      name: "Noto Sans KR",
      cssVariable: "--font-korean",
      weights: [400, 700],
      subsets: ["korean"],
      fallbacks: ["Apple SD Gothic Neo", "Malgun Gothic", "sans-serif"],
      display: "swap",
    },
    {
      // SITE_DEV_PLAN.md §13.4: UI body text on /ko/ pages, distinct from the
      // balloon-canvas font above. Served via Fontsource (not on Google Fonts).
      // Preloaded only on KO pages (Base.astro), never alongside DM Sans.
      provider: fontProviders.fontsource(),
      name: "Pretendard",
      cssVariable: "--font-body-ko",
      weights: [400, 500, 700],
      subsets: ["latin", "korean"],
      fallbacks: ["Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "sans-serif"],
      display: "swap",
    },
    {
      provider: fontProviders.google(),
      name: "JetBrains Mono",
      cssVariable: "--font-mono",
      weights: [400, 500],
      subsets: ["latin"],
      fallbacks: ["ui-monospace", "Menlo", "monospace"],
      optimizedFallbacks: true,
      display: "swap",
    },
  ],

  // Same reason as examples/astro-blog: the dev toolbar's entrypoint request
  // hangs in this repo's headless verification environment (NOTES.md "M4").
  devToolbar: { enabled: false },
});
