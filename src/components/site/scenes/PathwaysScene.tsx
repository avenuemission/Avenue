import { STAR_COUNTS } from "@/lib/domain/scenes/stars";
import { Person, SceneDefs, Stars, delay, glow, vars } from "./parts";

const ID = "scene-pathways";
const GROUND = 300;
// the main house
const HX = 230;
const HW = 170;
const HH = 110;
const TOP = GROUND - HH;
const DOOR = HX + 129;
// the house to the right, lit when the group multiplies
const SX = 470;
const SW = 90;
const SH = 64;
const ST = GROUND - SH;

const WINDOWS: [number, number][] = [[HX + 20, TOP + 20], [HX + 110, TOP + 20], [HX + 20, TOP + 62]];
/** People strolling in to the door: [start offset in px, delay in s]. */
const WALKERS: [number, number][] = [[-260, 0.2], [-210, 0.9], [230, 0.5], [280, 1.5], [-300, 2.1]];
/** The two sent out, one each way: [where they arrive, start offset back at the door]. */
const SENT_OUT: [number, number][] = [[SX + SW / 2, DOOR - (SX + SW / 2)], [100, DOOR - 100]];

/**
 * Pathways: people stroll to one home and its windows light. Then two people
 * are sent out, one each way, and the houses either side light up.
 */
export default function PathwaysScene() {
  const g = glow(ID);

  return (
    <svg
      viewBox="0 0 600 400"
      role="img"
      aria-label="People arrive at a home at night and its windows light up; a second home begins to glow"
    >
      <SceneDefs id={ID} />
      <Stars count={STAR_COUNTS.pathways} height={230} />
      <rect x={0} y={GROUND} width={600} height={100} fill="#0b1019" />
      <line x1={0} y1={GROUND} x2={600} y2={GROUND} stroke="#1a2130" strokeWidth={1} />
      <line x1={0} y1={352} x2={600} y2={352} stroke="#222b3b" strokeWidth={1.5} strokeDasharray="14 12" />

      {/* main house */}
      <ellipse cx={HX + HW / 2} cy={GROUND - 40} rx={170} ry={120} fill={g} className="glow" style={delay(5)} />
      <path d={`M${HX - 12} ${TOP} L${HX + HW / 2} ${TOP - 62} L${HX + HW + 12} ${TOP} Z`} fill="#121826" />
      <rect x={HX} y={TOP} width={HW} height={HH} fill="#0f1522" stroke="#1c2436" />
      {WINDOWS.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={40} height={28} rx={2} className="lit" style={delay(4.8 + i * 0.6)} />
      ))}
      <rect x={HX + 112} y={TOP + 56} width={34} height={HH - 56} rx={2} className="lit" style={delay(6.6)} />

      {/* people stroll to the door, unhurried */}
      {WALKERS.map(([from, d], i) => (
        <g key={i} className="walk" style={vars({ "--from": `${from}px`, "--d": `${d}s`, "--t": "4.6s" })}>
          <Person x={DOOR + (i % 2 ? 6 : -6)} groundY={GROUND} lift={1} fill="#dfe4ee" />
        </g>
      ))}

      {/* the group multiplies: the house to the right */}
      <ellipse cx={SX + SW / 2} cy={GROUND - 26} rx={90} ry={66} fill={g} className="glow" style={delay(12.2)} />
      <path d={`M${SX - 8} ${ST} L${SX + SW / 2} ${ST - 36} L${SX + SW + 8} ${ST} Z`} fill="#121826" />
      <rect x={SX} y={ST} width={SW} height={SH} fill="#0f1522" stroke="#1c2436" />
      <rect x={SX + 14} y={ST + 14} width={24} height={18} rx={2} className="lit" style={delay(12.2)} />
      <rect x={SX + 52} y={ST + 14} width={24} height={18} rx={2} className="lit" style={delay(12.6)} />

      {/* and the house to the left */}
      <ellipse cx={85} cy={274} rx={90} ry={66} fill={g} className="glow" style={delay(12.4)} />
      <path d="M40 240 L85 206 L130 240 Z" fill="#121826" />
      <rect x={48} y={240} width={74} height={60} fill="#0f1522" stroke="#1c2436" />
      <rect x={60} y={254} width={22} height={16} rx={2} className="lit" style={delay(12.4)} />
      <rect x={92} y={262} width={16} height={38} rx={2} className="lit" style={delay(12.8)} />

      {/* two people are sent out, one each way */}
      {SENT_OUT.map(([x, from]) => (
        <g key={x} className="walk" style={vars({ "--from": `${from}px`, "--d": "8s", "--t": "4.2s" })}>
          <Person x={x} groundY={GROUND} lift={1} fill="#ffdca0" />
        </g>
      ))}
    </svg>
  );
}
