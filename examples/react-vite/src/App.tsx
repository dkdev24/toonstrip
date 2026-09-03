import { useState } from "react";
import { ComicStrip } from "@toonstrip/react";
import { STRIPS } from "./strips.js";

export function App() {
  const [which, setWhich] = useState<keyof typeof STRIPS>("intro");

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>toonstrip + React</h1>
      <p>
        <code>@toonstrip/react</code>'s <code>&lt;ComicStrip&gt;</code> component, embedded in a
        plain Vite + React app. The button below switches the <code>document</code> prop between
        two different strips — open devtools' Elements panel and watch the same{" "}
        <code>&lt;comic-strip&gt;</code> node update in place instead of being removed and
        re-created.
      </p>
      <button type="button" onClick={() => setWhich((w) => (w === "intro" ? "punchline" : "intro"))}>
        Show the {which === "intro" ? "punchline" : "intro"}
      </button>
      <ComicStrip document={STRIPS[which]} packs={["/packs/comic-chat/"]} />
    </main>
  );
}
