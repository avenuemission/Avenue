import { createElement, type ReactNode } from "react";
import { SKYLINE_HEIGHT, SKYLINE_WIDTH, skylineScene, type Shape } from "@/lib/domain/scenes/skyline";
import { delay } from "./parts";

const ID = "scene-skyline";
const paint = (name: NonNullable<Shape["paint"]>) => `url(#${ID}-${name})`;

function draw(shape: Shape, key: number): ReactNode {
  const props: Record<string, unknown> = { key, ...shape.attrs };
  if (shape.paint) props.fill = paint(shape.paint);
  if (shape.cls) props.className = shape.cls;
  if (shape.delay !== undefined) props.style = delay(shape.delay);
  return createElement(shape.tag, props, shape.children?.map(draw));
}

/**
 * The landing page scene: Melbourne at night from above. The cross on the
 * horizon lights first, its light washes over the city, then windows and
 * streetlights come on from the horizon towards the viewer.
 */
export default function SkylineScene() {
  const { shapes } = skylineScene();

  return (
    <svg
      viewBox={`0 0 ${SKYLINE_WIDTH} ${SKYLINE_HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Melbourne at night, with the roads leading to a glowing cross on the horizon"
    >
      <defs>
        <linearGradient id={`${ID}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#04060b" />
          <stop offset="70%" stopColor="#0a0f1c" />
          <stop offset="100%" stopColor="#141a2c" />
        </linearGradient>
        <radialGradient id={`${ID}-glow`}>
          <stop offset="0%" stopColor="#ffe2a8" stopOpacity=".95" />
          <stop offset="25%" stopColor="#ffc56b" stopOpacity=".45" />
          <stop offset="100%" stopColor="#ffc56b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${ID}-soft`}>
          <stop offset="0%" stopColor="#ffc56b" stopOpacity=".6" />
          <stop offset="100%" stopColor="#ffc56b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${ID}-wash`} cx="0.6" cy="0" r="0.75">
          <stop offset="0%" stopColor="#ffc56b" stopOpacity=".32" />
          <stop offset="60%" stopColor="#ffc56b" stopOpacity=".06" />
          <stop offset="100%" stopColor="#ffc56b" stopOpacity="0" />
        </radialGradient>
      </defs>
      {shapes.map(draw)}
    </svg>
  );
}
