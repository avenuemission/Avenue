import { STAR_COUNTS } from "@/lib/domain/scenes/stars";
import { Person, SceneDefs, Stars, cone, delay, glow } from "./parts";

const ID = "scene-streetlights";
const GROUND = 310;
const LAMPS = [190, 290, 390, 490];
/** Who stands under each lamp: [x offset from the lamp, size]. */
const PEOPLE: [number, number][][] = [
  [[-14, 1], [12, 1]],
  [[-2, 1]],
  [[-18, 1], [0, 0.8], [18, 1]],
  [[4, 1]],
];

/** Streetlights: from a lit home, four lamps switch on one by one and reveal the people beneath. */
export default function StreetlightsScene() {
  const g = glow(ID);

  return (
    <svg
      viewBox="0 0 600 400"
      role="img"
      aria-label="From a lit home, streetlights switch on one by one and light the people beneath them"
    >
      <SceneDefs id={ID} />
      <Stars count={STAR_COUNTS.streetlights} height={200} />
      <rect x={0} y={GROUND} width={600} height={90} fill="#0b1019" />
      <line x1={0} y1={GROUND} x2={600} y2={GROUND} stroke="#1a2130" />
      <line x1={0} y1={360} x2={600} y2={360} stroke="#222b3b" strokeWidth={1.5} strokeDasharray="14 12" />

      {/* the home */}
      <ellipse cx={70} cy={270} rx={90} ry={70} fill={g} className="glow" style={delay(0.2)} />
      <path d="M14 244 L70 204 L126 244 Z" fill="#121826" />
      <rect x={22} y={244} width={96} height={66} fill="#0f1522" stroke="#1c2436" />
      <rect x={36} y={258} width={26} height={20} rx={2} className="lit" style={delay(0.2)} />
      <rect x={78} y={262} width={22} height={48} rx={2} className="lit" style={delay(0.4)} />

      {/* the lamps, one by one, and the people each one reaches */}
      {LAMPS.map((x, i) => {
        const d = 1 + i * 0.7;
        return (
          <g key={x}>
            <path
              d={`M${x - 7} 150 L${x + 7} 150 L${x + 62} ${GROUND} L${x - 62} ${GROUND} Z`}
              fill={cone(ID)}
              className="glow"
              style={delay(d)}
            />
            <ellipse cx={x} cy={GROUND + 2} rx={70} ry={10} fill={g} className="glow" style={delay(d + 0.2)} />
            <rect x={x - 2} y={150} width={4} height={GROUND - 150} fill="#3a4458" />
            <rect x={x - 13} y={142} width={26} height={8} rx={3} className="lit" style={delay(d)} />
            <circle cx={x} cy={146} r={22} fill={g} className="glow" style={delay(d)} />
            {PEOPLE[i].map(([dx, size], k) => (
              <g key={k} className="fade" style={delay(d + 0.35 + k * 0.12)}>
                <Person x={x + dx} groundY={GROUND} size={size} fill="#dfe4ee" />
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
