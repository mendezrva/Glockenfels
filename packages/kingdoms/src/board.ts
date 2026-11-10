/**
 * Board geometry. North is -z. The Marktburg sits at the origin inside a rectangular Markt zone.
 * Duchies sit around the Markt on seats (a side of the Markt plus an offset along it); each owns
 * the cells nearer its own spine (the line from the Markt out to its Stammburg) than any other.
 * The band just outside the Markt is the Vorland; everything further out is Stammland.
 */
import type { KConfig } from './config';

export type Zone = 'markt' | 'vorland' | 'stamm';

export const keyOf = (x: number, z: number) => `${x},${z}`;
export const ring = (x: number, z: number) => Math.max(Math.abs(x), Math.abs(z));

/** Rotates a canonical (north duchy) cell a quarter turn clockwise `d` times. */
export function rotateCell(x: number, z: number, d: number): [number, number] {
  for (let i = 0; i < ((d % 4) + 4) % 4; i++) [x, z] = [-z, x];
  return [x + 0, z + 0];
}

/** A place at the table: which side of the Markt (0 north, 1 east, 2 south, 3 west) and how far along it. */
export interface Seat { side: number; offset: number }
export interface BoardShape {
  /** Half-width (x) and half-height (z) of the Markt rectangle. */
  mx: number;
  mz: number;
  seats: Seat[];
}

/**
 * Seats for each table size, clockwise from the north-west. Up to four players get a side each
 * (three leave the south side open, which the neighbours split). Five or six share the long north
 * and south sides of a wider Markt (5 × 3 by default), two to a side.
 */
export function boardShape(cfg: KConfig): BoardShape {
  const n = cfg.duchies.length;
  const r = cfg.marktRadius;
  const w = r + cfg.pairSpread;
  const seat = (side: number, offset = 0): Seat => ({ side, offset });
  switch (n) {
    case 2: return { mx: r, mz: r, seats: [seat(0), seat(2)] };
    case 3: return { mx: r, mz: r, seats: [seat(0), seat(1), seat(3)] };
    case 4: return { mx: r, mz: r, seats: [seat(0), seat(1), seat(2), seat(3)] };
    case 5: return { mx: w, mz: r, seats: [seat(0, -w), seat(0, w), seat(1), seat(2), seat(3)] };
    case 6: return { mx: w, mz: r, seats: [seat(0, -w), seat(0, w), seat(1), seat(2, -w), seat(2, w), seat(3)] };
    default: throw new Error(`Heimfall seats 2 to 6 duchies, not ${n}`);
  }
}

const shapeCache = new WeakMap<KConfig, BoardShape>();
const shapeOf = (cfg: KConfig) => {
  let v = shapeCache.get(cfg);
  if (!v) { v = boardShape(cfg); shapeCache.set(cfg, v); }
  return v;
};

export function zoneOf(cfg: KConfig, x: number, z: number): Zone {
  const { mx, mz } = shapeOf(cfg);
  const d = Math.max(Math.abs(x) - mx, Math.abs(z) - mz);
  if (d <= 0) return 'markt';
  if (d <= cfg.vorlandDepth) return 'vorland';
  return 'stamm';
}

const sectorCache = new WeakMap<KConfig, Map<string, number>>();

/** Which duchy's land a cell is (its seat index), or -1 inside the Markt. */
export function sectorOf(cfg: KConfig, x: number, z: number): number {
  let cache = sectorCache.get(cfg);
  if (!cache) { cache = new Map(); sectorCache.set(cfg, cache); }
  const k = keyOf(x, z);
  const hit = cache.get(k);
  if (hit !== undefined) return hit;
  let best = -1;
  if (zoneOf(cfg, x, z) !== 'markt') {
    let bestD = Infinity;
    cfg.duchies.forEach((_, d) => {
      const L = layout(cfg, d);
      const [ax, az] = L.vorland[0], [bx, bz] = L.home;
      const vx = bx - ax, vz = bz - az, len2 = vx * vx + vz * vz;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / len2));
      const px = ax + t * vx - x, pz = az + t * vz - z;
      // Ties (cells exactly between two spines) go to the duchy they lie clockwise of.
      const cw = vx * (z - az) - vz * (x - ax) > 0 ? 1e-6 : 0;
      const dist = Math.hypot(px, pz) - cw;
      if (dist < bestD - 1e-9) { bestD = dist; best = d; }
    });
  }
  cache.set(k, best);
  return best;
}

export interface DuchyLayout {
  home: [number, number];
  /** Rotation that points the Stammburg's road at the Markt. */
  homeRot: number;
  /** Setup slots for the preplaced Vorland, in placement order. The first is the anchor. */
  vorland: [number, number][];
  /** Index in `vorland` of the slot on the gap side (the middle of the T's crossbar). */
  gapSide: number;
  /** Edge of the gap-side Vorland slot that faces home, and the cells of the straight gap. */
  gapEdge: number;
  gapCells: [number, number][];
}

const layoutCache = new WeakMap<KConfig, DuchyLayout[]>();

export function layout(cfg: KConfig, d: number): DuchyLayout {
  let all = layoutCache.get(cfg);
  if (!all) { all = []; layoutCache.set(cfg, all); }
  if (all[d]) return all[d];
  const shape = shapeOf(cfg);
  const { side, offset: o } = shape.seats[d];
  const h = side % 2 === 0 ? shape.mz : shape.mx;
  const inner = h + 1;
  const outer = h + cfg.vorlandDepth;
  // A T pointing at the Markt: a stem from the Markt edge out to the outer ring, then a three-wide
  // crossbar on the outer ring facing home (1-1-3 with the default depth of 3).
  const canon: [number, number][] = [];
  for (let r = inner; r <= outer; r++) canon.push([o, -r]);
  const gapSide = canon.length - 1;
  canon.push([o - 1, -outer], [o + 1, -outer]);
  const homeZ = -(outer + cfg.gap + 1);
  const gap: [number, number][] = [];
  for (let z = -(outer + 1); z > homeZ; z--) gap.push([o, z]);
  all[d] = {
    home: rotateCell(o, homeZ, side),
    homeRot: (1 + side) % 4,
    vorland: canon.map(([x, z]) => rotateCell(x, z, side)),
    gapSide,
    gapEdge: side % 4,
    gapCells: gap.map(([x, z]) => rotateCell(x, z, side)),
  };
  return all[d];
}
