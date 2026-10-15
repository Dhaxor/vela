// SVG path builders shared by the glyphs and the constellation renderer.
// Pure string geometry; numbers are rounded so paths stay short and stable.

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * A star polygon with `points` rays: alternating outer and inner radius,
 * first ray pointing straight up. `inner` is the inner/outer ratio.
 */
export function starPath(cx: number, cy: number, outer: number, points: number, inner: number): string {
  const steps = points * 2;
  const parts: string[] = [];
  for (let i = 0; i < steps; i++) {
    const radius = i % 2 === 0 ? outer : outer * inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / points;
    parts.push(`${i === 0 ? "M" : "L"}${r2(cx + radius * Math.cos(angle))} ${r2(cy + radius * Math.sin(angle))}`);
  }
  return `${parts.join(" ")} Z`;
}

/**
 * The navigator's four-point star (the icon's mast star and the 'did' proof):
 * concave sides drawn with quadratic curves, so it reads as light, not a cross.
 */
export function sparklePath(cx: number, cy: number, outer: number, waist: number = 0.22): string {
  const w = outer * waist;
  const top = `${r2(cx)} ${r2(cy - outer)}`;
  const right = `${r2(cx + outer)} ${r2(cy)}`;
  const bottom = `${r2(cx)} ${r2(cy + outer)}`;
  const left = `${r2(cx - outer)} ${r2(cy)}`;
  const q = (x: number, y: number) => `${r2(cx + x)} ${r2(cy + y)}`;
  return `M${top} Q${q(w, -w)} ${right} Q${q(w, w)} ${bottom} Q${q(-w, w)} ${left} Q${q(-w, -w)} ${top} Z`;
}

/** Circular arc from angle a0 to a1 (radians, clockwise from +x), as an SVG path. */
export function arcPath(cx: number, cy: number, radius: number, a0: number, a1: number): string {
  const x0 = cx + radius * Math.cos(a0);
  const y0 = cy + radius * Math.sin(a0);
  const x1 = cx + radius * Math.cos(a1);
  const y1 = cy + radius * Math.sin(a1);
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `M${r2(x0)} ${r2(y0)} A${r2(radius)} ${r2(radius)} 0 ${large} ${sweep} ${r2(x1)} ${r2(y1)}`;
}
