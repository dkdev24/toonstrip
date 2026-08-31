import { defineConfig } from "astro/config";
import { toonstrip } from "@toonstrip/astro";

export default defineConfig({
  integrations: [toonstrip({ packs: ["@toonstrip/pack-comic-chat"] })],
  // The dev toolbar's entrypoint request hangs indefinitely in this repo's
  // headless-verification environment (see NOTES.md "M4"); disabled so both
  // interactive `astro dev` and the Playwright verify script behave the same.
  devToolbar: { enabled: false },
});
