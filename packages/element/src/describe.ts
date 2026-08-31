import type { Panel } from "@toonstrip/schema";

/**
 * Alt text for a panel's canvas — a screen reader (or a search engine) gets
 * this whether or not the panel is currently painted. Generic over the
 * document's own `speaker`/`text` fields; no game- or role-specific labels.
 */
export function describePanel(panel: Panel): string {
  const parts = [`${panel.camera ?? "medium"} shot`];
  if (panel.roomTitle) parts.push(panel.roomTitle);
  for (const line of panel.speakers) {
    if (line.speaker === "caption") {
      parts.push(`caption: ${line.text}`);
      continue;
    }
    const verb = line.balloon === "thought" ? "thinks" : "says";
    parts.push(`${line.speaker} ${verb} "${line.text}"`);
  }
  if (parts.length === 1) parts.push("no dialogue");
  return parts.join("; ");
}
