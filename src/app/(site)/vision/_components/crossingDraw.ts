// Draws one frame of Cross the Avenue on a canvas. The rules (where things
// are) come from lib/domain/crossing/world; this file only paints them, in
// the "Avenue at night" palette from globals.css.
import { STREETLIGHT_COLS, laneAt, vehicleX, type World } from "@/lib/domain/crossing/world";

const C = {
  night: "#05070c",
  path: "#0e131c",
  road: "#080b11",
  park: "#07120d",
  line: "#263042",
  rail: "#2a3243",
  lamp: "#ffc56b",
  lampOff: "#263042",
  tree: "#1c4a33",
  treeShade: "#123524",
  tram: "#e9ece4",
  tramShade: "#a9b0a0",
  tramStripe: "#3c8a5c",
  glass: "#1a2230",
  headlight: "#fff3d6",
  taillight: "#ff5a4a",
  player: "#eef1f7",
  playerShade: "#aeb6c6",
};

// Car colours: [body, lower edge]. A vehicle's `paint` picks one.
const CAR_PAINTS: [string, string][] = [
  ["#2b4a8f", "#1b2f5c"],
  ["#d9dde6", "#9aa2b3"],
  ["#b8483a", "#7c2d24"],
  ["#4f7cff", "#2f4fb0"],
  ["#3a4150", "#232833"],
  ["#c9a23f", "#8a6d24"],
];

export interface View {
  width: number;
  height: number;
  tile: number;
  // The row at the bottom edge of the view (fractional while scrolling).
  camRow: number;
}

export interface Scene {
  world: World;
  seconds: number;
  furthestRow: number;
  // The player's drawn position in tiles, part way through a hop, and how
  // high the hop has lifted them (0 to 1).
  x: number;
  y: number;
  lift: number;
  dead: boolean;
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

// A block with a darker lower edge, which reads as a little height.
function block(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, top: string, edge: string) {
  box(ctx, x, y, w, h, r, edge);
  box(ctx, x, y, w, h * 0.78, r, top);
}

export function drawScene(ctx: CanvasRenderingContext2D, view: View, scene: Scene): void {
  const { width, height, tile, camRow } = view;
  const { world, seconds, furthestRow } = scene;
  const yOf = (row: number) => height - (row - camRow + 1) * tile;
  const first = Math.max(0, Math.floor(camRow) - 1);
  const last = Math.ceil(camRow + height / tile) + 1;

  ctx.fillStyle = C.night;
  ctx.fillRect(0, 0, width, height);

  // Pass 1: the ground.
  for (let row = first; row <= last; row++) {
    const lane = laneAt(world, row);
    const y = yOf(row);
    ctx.fillStyle = lane.kind === "path" ? C.path : lane.kind === "park" ? C.park : C.road;
    ctx.fillRect(0, y, width, tile + 1);

    if (lane.kind === "road" && laneAt(world, row + 1).kind === "road") {
      ctx.strokeStyle = C.line;
      ctx.lineWidth = Math.max(1, tile * 0.04);
      ctx.setLineDash([tile * 0.35, tile * 0.3]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (lane.kind === "tram") {
      ctx.fillStyle = C.rail;
      ctx.fillRect(0, y + tile * 0.28, width, tile * 0.05);
      ctx.fillRect(0, y + tile * 0.67, width, tile * 0.05);
    }
  }

  // Pass 2: streetlights and trees, drawn over the ground so a glow can
  // spill into the next lane.
  for (let row = first; row <= last; row++) {
    const lane = laneAt(world, row);
    const y = yOf(row);
    if (lane.kind === "path") {
      const lit = row <= furthestRow;
      for (const col of STREETLIGHT_COLS) {
        const cx = (col + 0.5) * tile;
        const cy = y + tile / 2;
        if (lit) {
          const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, tile * 1.1);
          glow.addColorStop(0, "rgba(255,197,107,0.30)");
          glow.addColorStop(1, "rgba(255,197,107,0)");
          ctx.fillStyle = glow;
          ctx.fillRect(cx - tile * 1.1, cy - tile * 1.1, tile * 2.2, tile * 2.2);
        }
        ctx.fillStyle = lit ? C.lamp : C.lampOff;
        ctx.beginPath();
        ctx.arc(cx, cy, tile * 0.11, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const col of lane.trees) {
      const inset = tile * 0.12;
      block(ctx, col * tile + inset, y + inset, tile - inset * 2, tile - inset * 2, tile * 0.14, C.tree, C.treeShade);
    }
  }

  // Pass 3: traffic.
  for (let row = first; row <= last; row++) {
    const lane = laneAt(world, row);
    if (lane.kind !== "road" && lane.kind !== "tram") continue;
    const y = yOf(row);
    for (const vehicle of lane.vehicles) {
      const x = vehicleX(lane, vehicle, seconds) * tile;
      const w = vehicle.length * tile;
      if (x > width + tile * 1.5 || x + w < -tile * 1.5) continue;
      const front = lane.dir === 1 ? x + w : x;
      const ahead = lane.dir === 1 ? 1 : -1;

      // Headlight beam on the road ahead.
      const beam = ctx.createLinearGradient(front, 0, front + ahead * tile * 1.3, 0);
      beam.addColorStop(0, "rgba(255,240,210,0.22)");
      beam.addColorStop(1, "rgba(255,240,210,0)");
      ctx.fillStyle = beam;
      ctx.fillRect(Math.min(front, front + ahead * tile * 1.3), y + tile * 0.12, tile * 1.3, tile * 0.76);

      const top = y + tile * 0.16;
      const h = tile * 0.68;
      if (lane.kind === "tram") {
        block(ctx, x, top, w, h, tile * 0.14, C.tram, C.tramShade);
        for (let i = 0; i < 4; i++) box(ctx, x + tile * (0.35 + i * 0.75), top + h * 0.18, tile * 0.5, h * 0.3, 3, C.glass);
        ctx.fillStyle = C.tramStripe;
        ctx.fillRect(x + tile * 0.2, top + h * 0.56, w - tile * 0.4, h * 0.1);
        if (lane.route !== null) {
          ctx.fillStyle = C.glass;
          ctx.font = `700 ${Math.round(tile * 0.26)}px ui-sans-serif, system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(lane.route), front - ahead * tile * 0.3, top + h * 0.33);
        }
      } else {
        const [body, edge] = CAR_PAINTS[vehicle.paint % CAR_PAINTS.length];
        block(ctx, x, top, w, h, tile * 0.14, body, edge);
        box(ctx, x + w * 0.3, top + h * 0.15, w * 0.4, h * 0.45, 3, C.glass);
      }
      // Headlights at the front, tail lights at the back.
      const lamp = tile * 0.1;
      const back = lane.dir === 1 ? x : x + w - lamp;
      const lampX = lane.dir === 1 ? front - lamp : front;
      ctx.fillStyle = C.headlight;
      ctx.fillRect(lampX, top + h * 0.08, lamp, lamp);
      ctx.fillRect(lampX, top + h * 0.62, lamp, lamp);
      ctx.fillStyle = C.taillight;
      ctx.fillRect(back, top + h * 0.08, lamp, lamp);
      ctx.fillRect(back, top + h * 0.62, lamp, lamp);
    }
  }

  // Pass 4: the player.
  const size = tile * 0.66;
  const px = scene.x * tile + (tile - size) / 2;
  const ground = yOf(scene.y) + (tile - size) / 2;
  const squash = scene.dead ? 0.5 : 1;
  const py = ground - scene.lift * tile * 0.28 + size * (1 - squash);

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.ellipse(px + size / 2, ground + size * 0.95, size * 0.45, size * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  block(ctx, px, py, size, size * squash, tile * 0.12, C.player, C.playerShade);
  ctx.fillStyle = C.lamp;
  ctx.fillRect(px, py + size * squash * 0.52, size, size * squash * 0.13);
  ctx.fillStyle = C.night;
  const eye = size * 0.14;
  ctx.fillRect(px + size * 0.22, py + size * squash * 0.24, eye, eye * squash);
  ctx.fillRect(px + size * 0.64, py + size * squash * 0.24, eye, eye * squash);
}
