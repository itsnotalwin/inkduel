import type { ReactNode } from "react";

/**
 * Shared "hand-inked" stroke vocabulary for all card illustrations.
 * Stroke spec: #17140F, width 3, fill none. Fills limited to paper tones
 * and graphite washes — strictly monochrome.
 */
export const INK = "var(--color-ink)";
export const PENCIL = "var(--color-pencil)";
export const GRAPHITE = "var(--color-graphite)";
export const PAPER = "var(--color-paper)";
export const DEEP = "var(--color-paper-deep)";

/** Art window canvas: 100 × 62 units, drawn edge to edge. */
export function ArtCanvas({
  children,
  bg = DEEP,
  label,
}: {
  children: ReactNode;
  bg?: string;
  label: string;
}) {
  return (
    <svg
      viewBox="0 0 100 62"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-label={label}
    >
      <rect x="-2" y="-2" width="104" height="66" fill={bg} />
      {children}
    </svg>
  );
}

/** A group with the standard hand-inked stroke. */
export function Ink({
  children,
  width = 3,
  fill = "none",
}: {
  children: ReactNode;
  width?: number;
  fill?: string;
}) {
  return (
    <g
      stroke={INK}
      strokeWidth={width}
      fill={fill}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </g>
  );
}

/** Pencil-thin sketch strokes (lighter, shakier). */
export function Sketch({
  children,
  width = 1.6,
}: {
  children: ReactNode;
  width?: number;
}) {
  return (
    <g stroke={GRAPHITE} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.75}>
      {children}
    </g>
  );
}

/** Parallel hatching along a line segment (shading). */
export function Hatch({
  x,
  y,
  angle = 45,
  length = 10,
  count = 5,
  gap = 2.4,
  width = 1.4,
}: {
  x: number;
  y: number;
  angle?: number;
  length?: number;
  count?: number;
  gap?: number;
  width?: number;
}) {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  // perpendicular
  const px = -dy;
  const py = dx;
  const lines = [];
  for (let i = 0; i < count; i++) {
    const ox = x + px * gap * i;
    const oy = y + py * gap * i;
    lines.push(
      <path
        key={i}
        d={`M${ox} ${oy} L${ox + dx * length} ${oy + dy * length}`}
        stroke={INK}
        strokeWidth={width}
        strokeLinecap="round"
      />,
    );
  }
  return <g opacity={0.8}>{lines}</g>;
}

/** A quick scribbled blob (ink pooling). */
export function Splotch({
  cx,
  cy,
  r = 4,
  fill = INK,
  opacity = 1,
}: {
  cx: number;
  cy: number;
  r?: number;
  fill?: string;
  opacity?: number;
}) {
  return (
    <path
      opacity={opacity}
      fill={fill}
      stroke="none"
      d={`M${cx - r} ${cy}
          C ${cx - r * 1.3} ${cy - r * 1.2}, ${cx - r * 0.2} ${cy - r * 1.4}, ${cx + r * 0.3} ${cy - r * 0.9}
          C ${cx + r * 1.4} ${cy - r * 1.1}, ${cx + r * 1.3} ${cy + r * 0.6}, ${cx + r * 0.5} ${cy + r * 0.9}
          C ${cx - r * 0.4} ${cy + r * 1.5}, ${cx - r * 1.4} ${cy + r * 0.9}, ${cx - r} ${cy} Z`}
    />
  );
}

/** Hand-drawn ground line — everything stands on something. */
export function GroundLine({ y = 54, wobble = 0.6 }: { y?: number; wobble?: number }) {
  const pts: string[] = [];
  for (let x = 4; x <= 96; x += 8) {
    const dy = ((x * 7919) % 100) / 100 - 0.5;
    pts.push(`${x === 4 ? "M" : "L"}${x} ${y + dy * wobble * 2}`);
  }
  return <path d={pts.join(" ")} stroke={INK} strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.85} />;
}
