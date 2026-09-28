"use client";

import { useId } from "react";
import { STATUS_LABEL, type AvenueStop, type HereAction, type StopId } from "@/lib/domain/avenue";
import AvenueStreet from "./AvenueStreet";

export interface AvenueMapProps {
  stops: AvenueStop[];
  selectedId: StopId | null;
  onSelect: (id: StopId) => void;
  hereAction: HereAction | null;
  onAction?: () => void;
  compact?: boolean; // dashboard: crops the sky
}

const LAMP_X = [120, 310, 500, 690, 880];
const STARS: [number, number, number][] = [
  [60, 40, 1],
  [180, 80, 1.2],
  [320, 30, 0.9],
  [470, 70, 1],
  [610, 26, 1.3],
  [760, 60, 0.9],
  [900, 34, 1.1],
  [960, 96, 0.8],
  [120, 120, 0.7],
  [540, 110, 0.8],
];
// Text colours come from the tokens (spec 2: text colours from tokens only).
// SVG presentation attributes do not take var(), so text sets fill via style.
const STATUS_FILL = { walked: "var(--lamp)", ongoing: "var(--lamp)", here: "var(--accent)", ahead: "var(--dim)" } as const;

// Map A (spec 2): the avenue seen from the side, five lamp posts in a row.
// Walked stops are lit (warm head, halo, cone of light); ongoing stops
// (Growth, Multiply once started) are lit the same and their cone and halo
// breathe slowly (round 3 spec 3). The current stop
// has a blue outlined head and a blue "you are here" dot, stops ahead are
// dim. The SVG is decoration; a transparent button over each lamp is the
// real control (av-map-hit keeps its focus ring inside the clipped map).
// Below md the vertical AvenueStreet is shown instead.
export default function AvenueMap({ stops, selectedId, onSelect, hereAction, onAction, compact = false }: AvenueMapProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const glowId = `av-cone-${uid}`;
  const haloId = `av-halo-${uid}`;
  if (stops.length !== LAMP_X.length) throw new Error(`AvenueMap needs exactly five stops, got ${stops.length}`);

  return (
    <div>
      <div className="relative hidden overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--night-2)] md:block">
        <svg viewBox={compact ? "0 70 1000 350" : "0 0 1000 420"} aria-hidden="true" className="block h-auto w-full">
          <defs>
            <radialGradient id={glowId} cx="50%" cy="0%" r="100%">
              <stop offset="0%" stopColor="#ffc56b" stopOpacity={0.55} />
              <stop offset="60%" stopColor="#ffc56b" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#ffc56b" stopOpacity={0} />
            </radialGradient>
            <radialGradient id={haloId}>
              <stop offset="0%" stopColor="#ffdca0" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#ffc56b" stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect width="1000" height="420" fill="#07090f" />
          <g fill="#c9d3ea" opacity={0.55}>
            {STARS.map(([cx, cy, r]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
            ))}
          </g>
          <rect x="0" y="300" width="1000" height="120" fill="#0b0f18" />
          <line x1="0" y1="300" x2="1000" y2="300" stroke="#1f2736" />
          <line x1="0" y1="350" x2="1000" y2="350" stroke="#2b3446" strokeDasharray="18 16" />
          {stops.map((stop, i) => {
            const x = LAMP_X[i];
            if (stop.status === "walked" || stop.status === "ongoing") {
              const ongoing = stop.status === "ongoing";
              return (
                <g key={stop.id}>
                  <polygon
                    points={`${x},120 ${x - 60},300 ${x + 60},300`}
                    fill={`url(#${glowId})`}
                    className={ongoing ? "av-breathe-light" : undefined}
                  />
                  <circle
                    cx={x}
                    cy={112}
                    r={34}
                    fill={`url(#${haloId})`}
                    className={ongoing ? "av-breathe-halo" : undefined}
                  />
                  <rect x={x - 2} y={112} width={4} height={188} fill="#3a4458" />
                  <rect x={x - 16} y={104} width={32} height={10} rx={3} fill="#ffc56b" />
                </g>
              );
            }
            if (stop.status === "here") {
              return (
                <g key={stop.id}>
                  <rect x={x - 2} y={112} width={4} height={188} fill="#3a4458" />
                  <rect x={x - 16} y={104} width={32} height={10} rx={3} fill="#1a2130" stroke="#4f7cff" strokeWidth={2} />
                  <circle cx={x} cy={322} r={9} fill="#4f7cff" />
                  <circle cx={x} cy={322} r={18} fill="none" stroke="#4f7cff" strokeOpacity={0.35} strokeWidth={2} />
                </g>
              );
            }
            return (
              <g key={stop.id}>
                <rect x={x - 2} y={112} width={4} height={188} fill="#252d3c" />
                <rect x={x - 16} y={104} width={32} height={10} rx={3} fill="#161c28" />
              </g>
            );
          })}
          <g
            style={{ fontFamily: "var(--font-geist-sans), sans-serif", textTransform: "uppercase" }}
            fontSize={22}
            fontWeight={700}
            letterSpacing={-0.5}
            textAnchor="middle"
          >
            {stops.map((stop, i) => (
              <text key={stop.id} x={LAMP_X[i]} y={392} style={{ fill: stop.status === "ahead" ? "var(--dim)" : "var(--ink)" }}>
                {stop.name}
              </text>
            ))}
          </g>
          <g style={{ fontFamily: "var(--font-geist-mono), monospace" }} fontSize={11} letterSpacing={2} textAnchor="middle">
            {stops.map((stop, i) => (
              <text key={stop.id} x={LAMP_X[i]} y={410} style={{ fill: STATUS_FILL[stop.status] }}>
                {STATUS_LABEL[stop.status].toUpperCase()}
              </text>
            ))}
          </g>
          {stops.map((stop, i) =>
            stop.id === selectedId ? (
              <line
                key={`sel-${stop.id}`}
                x1={LAMP_X[i] - 44}
                x2={LAMP_X[i] + 44}
                y1={417}
                y2={417}
                stroke="#eef1f7"
                strokeOpacity={0.5}
                strokeWidth={2}
              />
            ) : null
          )}
        </svg>
        {stops.map((stop, i) => (
          <button
            key={stop.id}
            type="button"
            onClick={() => onSelect(stop.id)}
            aria-label={`${stop.name}: ${STATUS_LABEL[stop.status]}`}
            aria-current={selectedId === stop.id ? "true" : undefined}
            className="av-map-hit absolute top-0 h-full rounded-xl"
            style={{ left: `${(LAMP_X[i] - 95) / 10}%`, width: "19%" }}
          />
        ))}
      </div>
      <div className="md:hidden">
        <AvenueStreet
          stops={stops}
          selectedId={selectedId}
          onSelect={onSelect}
          hereAction={hereAction}
          onAction={onAction}
        />
      </div>
    </div>
  );
}
