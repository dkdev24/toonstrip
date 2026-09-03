/**
 * `init`: scaffold an empty source pack, so the first thing an author (or an
 * agent following `skills/toonstrip/SKILL.md`) does is drop PNGs into
 * directories that already exist with the right names.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { promptChecklist, sourceJsonScaffold } from "./templates.js";

export interface InitResult {
  dir: string;
  files: string[];
  skipped: string[];
}

export function initSource(dir: string, name?: string): InitResult {
  const packName = name ?? basename(dir);
  const files: string[] = [];
  const skipped: string[] = [];

  const put = (relative: string, contents: string) => {
    const path = join(dir, relative);
    if (existsSync(path)) {
      skipped.push(relative);
      return;
    }
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, contents);
    files.push(relative);
  };

  mkdirSync(join(dir, "characters", "example"), { recursive: true });
  mkdirSync(join(dir, "backdrops"), { recursive: true });
  put("source.json", sourceJsonScaffold(packName));
  put("POSES.md", promptChecklist());

  return { dir, files, skipped };
}
