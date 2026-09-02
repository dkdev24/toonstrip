import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Docs pages (SITE_DEV_PLAN.md §5.3): MDX with frontmatter that drives the
 * sidebar and prev/next. `section` groups; `order` sorts within and across
 * sections (sections are ordered by their lowest `order`).
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

export const collections = { docs };
