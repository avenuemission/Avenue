import { seconds } from "@/lib/domain/scenes/seeded";
import { STAR_COUNTS } from "@/lib/domain/scenes/stars";
import { House, SceneDefs, Stars, delay, glow, vars } from "./parts";

const ID = "scene-intersection";
const CX = 300;
const CY = 220;
const W = 56;

/** Homes at the street ends. */
const HOMES: [number, number][] = [[34, CY - 50], [CX + 50, 30], [566, CY + 50], [CX - 50, 410]];
/** Where each street's light starts, relative to the centre. */
const ENDS: [number, number][] = [[-250, 0], [0, -200], [250, 0], [0, 200]];
/** Three lights per street, this far apart in seconds. */
const TRAIN = [0, 0.45, 0.9];

/** Intersection: light from four homes travels in and blooms at the crossroads. */
export default function IntersectionScene() {
  const g = glow(ID);

  return (
    <svg
      viewBox="0 0 600 440"
      role="img"
      aria-label="Light from four homes travels along the streets and meets at a glowing crossroads"
    >
      <SceneDefs id={ID} />
      <Stars count={STAR_COUNTS.intersection} height={440} />
      <rect x={0} y={CY - W / 2} width={600} height={W} fill="#10151f" />
      <rect x={CX - W / 2} y={0} width={W} height={440} fill="#10151f" />
      <line x1={0} y1={CY} x2={600} y2={CY} stroke="#27314a" strokeWidth={1.5} strokeDasharray="12 12" />
      <line x1={CX} y1={0} x2={CX} y2={440} stroke="#27314a" strokeWidth={1.5} strokeDasharray="12 12" />

      {HOMES.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={44} fill={g} className="glow" style={delay(0.2 + i * 0.25)} />
          <House x={x} y={y} scale={1.5} d={0.2 + i * 0.25} />
        </g>
      ))}

      {/* light travelling from each street end to the centre */}
      {ENDS.map(([fx, fy], i) =>
        TRAIN.map((k) => (
          <g
            key={`${i}-${k}`}
            className="travel"
            style={vars({ "--fx": `${fx}px`, "--fy": `${fy}px`, "--d": seconds(1.4 + i * 0.2 + k), "--t": "2.1s" })}
          >
            <circle cx={CX} cy={CY} r={9} fill={g} />
            <circle cx={CX} cy={CY} r={3.4} fill="#ffdca0" />
          </g>
        ))
      )}

      <circle cx={CX} cy={CY} r={96} fill={g} className="grow" style={delay(3.6)} />
      <circle
        cx={CX}
        cy={CY}
        r={30}
        fill="none"
        stroke="#ffc56b"
        strokeOpacity=".45"
        strokeWidth={1.5}
        className="grow"
        style={delay(3.9)}
      />
      <circle cx={CX} cy={CY} r={6} fill="#fff3d6" className="fade" style={delay(3.8)} />
    </svg>
  );
}
