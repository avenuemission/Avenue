import { visionSuburb } from "@/lib/domain/scenes/vision";
import { seconds } from "@/lib/domain/scenes/seeded";
import { House, SceneDefs, delay, glow } from "./parts";

const ID = "scene-vision";

/**
 * Vision: a suburb at night from above. Homes light up, lamps come on along
 * their streets, light travels to where neighbours meet and blooms, then
 * flows back along the streets to the light at the centre.
 */
export default function VisionScene() {
  const s = visionSuburb();
  const [cx, cy] = s.centre;
  const g = glow(ID);

  return (
    <svg
      viewBox="0 0 600 440"
      role="img"
      aria-label="A suburb at night seen from above: homes light up, streetlights spread, light meets at crossings and flows back to a light at the centre"
    >
      <SceneDefs id={ID} />
      <rect x={0} y={0} width={600} height={440} fill="#06080d" />

      {/* blocks of rooftops, and one park */}
      <rect x={s.park.x} y={s.park.y} width={s.park.width} height={s.park.height} rx={6} fill="#08130e" />
      {s.park.trees.map((t, i) => (
        <circle key={`t${i}`} cx={t.cx} cy={t.cy} r={t.r} fill="#0c1f15" />
      ))}
      {s.rooftops.map((r, i) => (
        <rect key={`r${i}`} x={r.x} y={r.y} width={r.width} height={r.height} rx={1.5} fill={r.fill} />
      ))}

      {/* streets, with the two main avenues a little wider */}
      {s.streetsX.map((st) => (
        <rect key={`x${st.at}`} x={st.at - st.width / 2} y={0} width={st.width} height={440} fill="#10151f" />
      ))}
      {s.streetsY.map((st) => (
        <rect key={`y${st.at}`} x={0} y={st.at - st.width / 2} width={600} height={st.width} fill="#10151f" />
      ))}

      {/* the centre: one light at the main crossroads */}
      <circle cx={cx} cy={cy} r={26} fill="#0b0f17" />
      <circle cx={cx} cy={cy} r={110} fill={g} className="glow" style={delay(0.2)} />
      <circle cx={cx} cy={cy} r={150} fill={g} className="grow" style={delay(7.6)} />
      <circle cx={cx} cy={cy} r={7} fill="#fff3d6" className="fade" style={delay(0)} />

      {/* pathway homes and the lamps on their street */}
      {s.homes.map((h) => (
        <g key={`h${h.at.join()}`}>
          <circle cx={h.at[0]} cy={h.at[1]} r={40} fill={g} className="glow" style={delay(h.d)} />
          <House x={h.at[0]} y={h.at[1]} scale={1.15} d={h.d} />
          {h.lamps.map((l) => (
            <g key={l.at.join()}>
              <circle cx={l.at[0]} cy={l.at[1]} r={10} fill={g} className="glow" style={delay(l.d)} />
              <circle cx={l.at[0]} cy={l.at[1]} r={2.4} className="lit" style={delay(l.d)} />
            </g>
          ))}
        </g>
      ))}

      {/* where neighbours meet */}
      {s.meets.map((m) => (
        <g key={`m${m.at.join()}`}>
          <circle cx={m.at[0]} cy={m.at[1]} r={34} fill={g} className="grow" style={delay(m.d)} />
          <circle cx={m.at[0]} cy={m.at[1]} r={3.4} fill="#fff0cf" className="fade" style={delay(m.d)} />
        </g>
      ))}

      {/* travelling light: SMIL so it can follow the streets; SceneStage starts it */}
      {s.pulses.map((p) => (
        <g key={`p${p.path}`} opacity={0}>
          <circle r={9} fill={g} />
          <circle r={3} fill="#ffdca0" />
          <animateMotion path={p.path} dur={seconds(p.dur)} begin="indefinite" fill="freeze" data-at={p.at} />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.15;0.85;1"
            dur={seconds(p.dur)}
            begin="indefinite"
            fill="freeze"
            data-at={p.at}
          />
        </g>
      ))}
    </svg>
  );
}
