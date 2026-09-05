import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Docs pages (SITE_DEV_PLAN.md §5.3, §13.3): MDX with frontmatter that drives
 * the sidebar and prev/next. `section` groups; `order` sorts within and across
 * sections (sections are ordered by their lowest `order`). Files live under
 * `{en,ko}/<slug>.mdx`; the loader's entry `id` is `<lang>/<slug>`, so
 * `src/lib/docs-nav.ts` derives `lang` and `slug` from it rather than the
 * schema carrying a redundant field.
 */
const docs = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
    section: z.enum(["Start", "Authoring", "Integrate", "Reference"]),
  }),
});

/**
 * The public changelog is the repo-root CHANGELOG.md (SITE_DEV_PLAN.md §7),
 * loaded as a one-entry collection so Astro renders its Markdown; the page and
 * the feed parse versions out of the body (src/data/changelog.ts).
 */
const changelog = defineCollection({
  loader: glob({ pattern: "CHANGELOG.md", base: "../" }),
  schema: z.object({}).passthrough(),
});

export const collections = { docs, changelog };
