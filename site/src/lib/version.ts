/**
 * The library version the site displays, read from the workspace at build time
 * so the badge never drifts from what this deploy was built against
 * (SITE_DEV_PLAN.md §2). `@toonstrip/core` is the canonical version; the
 * packages are not lockstep, so the others are listed separately for the footer
 * and changelog.
 */
import core from "../../../packages/core/package.json";
import element from "../../../packages/element/package.json";
import astro from "../../../packages/astro/package.json";
import schema from "../../../packages/schema/package.json";

export const coreVersion: string = core.version;

export const packageVersions: Record<string, string> = {
  "@toonstrip/core": core.version,
  "@toonstrip/element": element.version,
  "@toonstrip/astro": astro.version,
  "@toonstrip/schema": schema.version,
};
