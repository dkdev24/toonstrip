// @ts-check
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import { toonstrip } from "@toonstrip/astro";
import { defineConfig, fontProviders } from "astro/config";

// toonstrip.danielkimdev.com — see SITE_DEV_PLAN.md (what) and DESIGN.md (how).
export default defineConfig({
  site: "https://toonstrip.danielkimdev.com",

  // Static build, deployed by Cloudflare Pages' GitHub integration on push.
  // Output lands in site/dist; the root wrangler.toml points Pages at it.
  output: "static",

  integrations: [
    // Both packs are served so docs and the playground can show either.
    toonstrip({ packs: ["@toonstrip/pack-comic-chat", "@toonstrip/pack-example"] }),
    mdx(),
    // Only the playground island uses Preact (SITE_DEV_PLAN.md §3).
    preact(),
    sitemap({
      // The component kitchen sink is a design check, not a page for visitors.
      filter: (page) => !page.includes("/kitchen-sink"),
    }),
  ],

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
