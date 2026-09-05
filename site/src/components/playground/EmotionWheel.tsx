/**
 * Emotion wheel (DESIGN.md §6.2): angle around, intensity out from centre.
 * The inner 12 % is the NEUTRAL zone. Keyboard: ←/→ step angle by π/8,
 * ↑/↓ step intensity by 0.1; `aria-valuetext` announces the named emotion.
 */
import { useRef } from "preact/hooks";
import type { Lang } from "../../i18n/utils";

// Mirrors the relevant subset of @toonstrip/core's EMOTION_NAMES (packages/core/src/emotion.ts):
// the 8 named emotions around the wheel plus NEUTRAL for the low-intensity centre.
const NAMES = ["HAPPY", "COY", "BORED", "SCARED", "SAD", "ANGRY", "SHOUT", "LAUGH"];
const TAU = Math.PI * 2;
const NEUTRAL_ZONE = 0.12;

// English id -> Korean label. The id itself is never translated: it's what a caller
// reads back off the wheel (SITE_DEV_PLAN.md §13.2 — "the id is what goes into the JSON").
const KO_LABELS: Record<string, string> = {
  HAPPY: "기쁨",
  COY: "수줍음",
  BORED: "지루함",
  SCARED: "무서움",
  SAD: "슬픔",
  ANGRY: "화남",
  SHOUT: "고함",
  LAUGH: "웃음",
  NEUTRAL: "무표정",
};

export function emotionName(angle: number, intensity: number): string {
  if (intensity <= NEUTRAL_ZONE) return "NEUTRAL";
  const index = Math.round((((angle % TAU) + TAU) % TAU) / (TAU / 8)) % 8;
  return NAMES[index];
}

/** Renders an emotion id: plain mono on EN, translated label + mono id on KO. */
export function EmotionLabel({ name, lang }: { name: string; lang?: Lang }) {
  if (lang === "ko") {
    return (
      <span class="text-sm">
        {KO_LABELS[name] ?? name} <code class="mono">{name}</code>
      </span>
    );
  }
  return <span class="mono text-sm">{name}</span>;
}

interface Props {
  angle: number;
  intensity: number;
  onChange: (angle: number, intensity: number) => void;
  size?: number;
  lang?: Lang;
}

export function EmotionWheel({ angle, intensity, onChange, size = 120, lang = "en" }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const r = size / 2;
  const radius = r - 14;
  const dotX = r + Math.cos(angle) * radius * intensity;
  const dotY = r - Math.sin(angle) * radius * intensity;

  function fromPointer(event: PointerEvent) {
    const rect = ref.current!.getBoundingClientRect();
    const x = event.clientX - rect.left - r;
    const y = -(event.clientY - rect.top - r);
    const dist = Math.min(1, Math.hypot(x, y) / radius);
    let a = Math.atan2(y, x);
    if (a < 0) a += TAU;
    onChange(round(a), round(dist <= NEUTRAL_ZONE ? 0 : dist, 2));
  }

  function onPointerDown(event: PointerEvent) {
    (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
    fromPointer(event);
  }
  function onPointerMove(event: PointerEvent) {
    if (event.buttons & 1) fromPointer(event);
  }
  function onKeyDown(event: KeyboardEvent) {
    const step = Math.PI / 8;
    let a = angle;
    let i = intensity;
    switch (event.key) {
      case "ArrowLeft":
        a = (a + step) % TAU;
        break;
      case "ArrowRight":
        a = (a - step + TAU) % TAU;
        break;
      case "ArrowUp":
        i = Math.min(1, i + 0.1);
        break;
      case "ArrowDown":
        i = Math.max(0, i - 0.1);
        break;
      case "Home":
        i = 0;
        break;
      case "End":
        i = 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    onChange(round(a), round(i, 2));
  }

  const name = emotionName(angle, intensity);
  return (
    <svg
      ref={ref}
      class="emotion-wheel"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="slider"
      tabindex={0}
      aria-label={lang === "ko" ? "감정" : "Emotion"}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={intensity}
      aria-valuetext={lang === "ko" ? `${KO_LABELS[name] ?? name}, 강도 ${intensity.toFixed(1)}` : `${name}, intensity ${intensity.toFixed(1)}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
    >
      <circle cx={r} cy={r} r={radius} class="emotion-wheel__ring" />
      <circle cx={r} cy={r} r={radius * NEUTRAL_ZONE} class="emotion-wheel__neutral" />
      {NAMES.map((n, k) => {
        const a = (k * TAU) / 8;
        const x1 = r + Math.cos(a) * radius * NEUTRAL_ZONE;
        const y1 = r - Math.sin(a) * radius * NEUTRAL_ZONE;
        const x2 = r + Math.cos(a) * radius;
        const y2 = r - Math.sin(a) * radius;
        const lx = r + Math.cos(a) * (radius + 9);
        const ly = r - Math.sin(a) * (radius + 9);
        return (
          <g key={n}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} class="emotion-wheel__spoke" />
            <text x={lx} y={ly} class={`emotion-wheel__label${n === name ? " is-active" : ""}`} text-anchor="middle" dominant-baseline="middle">
              {n[0]}
            </text>
          </g>
        );
      })}
      <circle cx={dotX} cy={dotY} r={6} class="emotion-wheel__dot" />
    </svg>
  );
}

function round(n: number, places = 4): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}
