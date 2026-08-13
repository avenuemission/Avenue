"use client";

import { useMemo, useRef, useState } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { layoutNetwork, type NetworkPerson } from "@/lib/networkLayout";

interface NetworkGraphProps {
  people: NetworkPerson[];
  viewerId?: string | null;
  selectedId?: string | null;
  onSelect?: (person: NetworkPerson) => void;
}

const NODE_R = 26;
const PAD = 110;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;

function initialsOf(person: NetworkPerson) {
  const first = person.firstName?.[0] ?? "";
  const last = person.lastName?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

export default function NetworkGraph({
  people,
  viewerId,
  selectedId,
  onSelect,
}: NetworkGraphProps) {
  const layout = useMemo(() => layoutNetwork(people), [people]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const nodeById = useMemo(
    () => new Map(layout.nodes.map((n) => [n.id, n])),
    [layout.nodes]
  );

  const { minX, minY, maxX, maxY } = layout.bounds;
  const viewBox = [
    minX - PAD,
    minY - PAD,
    Math.max(maxX - minX + PAD * 2, 1),
    Math.max(maxY - minY + PAD * 2, 1),
  ].join(" ");

  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    setIsDragging(true);
    drag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    setPan({
      x: drag.current.panX + (e.clientX - drag.current.x) / zoom,
      y: drag.current.panY + (e.clientY - drag.current.y) / zoom,
    });
  };

  const onPointerUp = () => {
    setIsDragging(false);
    drag.current = null;
  };

  const nudgeZoom = (factor: number) =>
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));

  const buttonClass =
    "inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-white hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition-all";

  return (
    <div className="panel relative overflow-hidden">
      <div className="absolute right-4 top-4 z-10 flex gap-2">
        <button onClick={() => nudgeZoom(1.25)} aria-label="Zoom in" className={buttonClass}>
          <Plus className="h-4 w-4" />
        </button>
        <button onClick={() => nudgeZoom(0.8)} aria-label="Zoom out" className={buttonClass}>
          <Minus className="h-4 w-4" />
        </button>
        <button onClick={reset} aria-label="Fit the whole network" className={buttonClass}>
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      <svg
        data-testid="network-graph"
        viewBox={viewBox}
        className="h-[70vh] w-full touch-none select-none"
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <defs>
          {layout.nodes
            .filter((n) => n.person.avatarUrl)
            .map((n) => (
              <clipPath key={n.id} id={`clip-${n.id}`}>
                <circle cx={n.x} cy={n.y} r={NODE_R} />
              </clipPath>
            ))}
        </defs>

        <g transform={`scale(${zoom}) translate(${pan.x} ${pan.y})`}>
          {layout.edges.map((edge) => {
            const from = nodeById.get(edge.fromId);
            const to = nodeById.get(edge.toId);
            if (!from || !to) return null;
            return (
              <line
                key={`${edge.fromId}-${edge.toId}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="var(--border)"
                strokeWidth={1.5}
                strokeDasharray={edge.confirmed ? undefined : "5 5"}
                data-confirmed={edge.confirmed ? "true" : "false"}
              />
            );
          })}

          {layout.nodes.map((node) => {
            const p = node.person;
            const isViewer = p.id === viewerId;
            const isSelected = p.id === selectedId;
            const ring = isViewer || isSelected ? "var(--accent)" : "var(--border)";

            return (
              <g
                key={node.id}
                data-person-id={p.id}
                data-joined={p.joined ? "true" : "false"}
                data-viewer={isViewer ? "true" : "false"}
                opacity={p.joined ? 1 : 0.55}
                onClick={() => onSelect?.(p)}
                className="cursor-pointer"
              >
                {p.avatarUrl ? (
                  <image
                    href={p.avatarUrl}
                    x={node.x - NODE_R}
                    y={node.y - NODE_R}
                    width={NODE_R * 2}
                    height={NODE_R * 2}
                    clipPath={`url(#clip-${node.id})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                ) : (
                  <circle cx={node.x} cy={node.y} r={NODE_R} fill="var(--surface-hover)" />
                )}

                <circle
                  cx={node.x}
                  cy={node.y}
                  r={NODE_R}
                  fill="none"
                  stroke={ring}
                  strokeWidth={isViewer || isSelected ? 2.5 : 1}
                />

                {!p.avatarUrl && (
                  <text
                    x={node.x}
                    y={node.y + 5}
                    textAnchor="middle"
                    fontSize={15}
                    fontWeight={700}
                    fill="var(--accent)"
                  >
                    {initialsOf(p)}
                  </text>
                )}

                <text
                  x={node.x}
                  y={node.y + NODE_R + 18}
                  textAnchor="middle"
                  fontSize={13}
                  fill={isViewer ? "#ffffff" : "var(--muted)"}
                >
                  {p.firstName}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
