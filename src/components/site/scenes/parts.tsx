import type { CSSProperties } from "react";
import { seconds } from "@/lib/domain/scenes/seeded";
import { starField } from "@/lib/domain/scenes/stars";

// Shared pieces of the night scenes. Server components: static SVG markup.

/** Inline CSS custom properties for the scene classes (--d, --t, --from, ...). */
export function vars(values: Record<string, string>): CSSProperties {
  return values as CSSProperties;
}

/** The --d delay style for a scene class. */
export function delay(d: number): CSSProperties {
  return vars({ "--d": seconds(d) });
}

/** The lamp glow and cone gradients, with ids unique to one scene. */
export function SceneDefs({ id }: { id: string }) {
  return (
    <defs>
      <radialGradient id={`${id}-glow`}>
        <stop offset="0%" stopColor="#ffc56b" stopOpacity=".75" />
        <stop offset="45%" stopColor="#ffc56b" stopOpacity=".22" />
        <stop offset="100%" stopColor="#ffc56b" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${id}-cone`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffc56b" stopOpacity=".5" />
        <stop offset="100%" stopColor="#ffc56b" stopOpacity="0" />
      </linearGradient>
    </defs>
  );
}

export const glow = (id: string) => `url(#${id}-glow)`;
export const cone = (id: string) => `url(#${id}-cone)`;

export function Stars({ count, height }: { count: number; height: number }) {
  return (
    <>
      {starField(count, height).map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#8a93a8" opacity={s.opacity} />
      ))}
    </>
  );
}

/** A small house seen from above or the side; its shape lights up at d. */
export function House({ x, y, scale, d }: { x: number; y: number; scale: number; d: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-10 -2 L0 -11 L10 -2 V9 H-10 Z" className="lit" style={delay(d)} />
    </g>
  );
}

/** A person on the ground line; lift raises them (the walkers stand 1 above it). */
export function Person(props: { x: number; groundY: number; fill: string; size?: number; lift?: number }) {
  const { x, fill, size = 1, lift = 0 } = props;
  const base = props.groundY - lift;
  return (
    <>
      <circle cx={x} cy={base - 26 * size} r={5 * size} fill={fill} />
      <rect x={x - 5 * size} y={base - 20 * size} width={10 * size} height={20 * size} rx={5 * size} fill={fill} />
    </>
  );
}
