/**
 * Board geometry. North is -z. The Marktplatz sits at the origin inside a square Markt zone.
 * Each duchy owns a quarter of the board (its sector). The rings just outside the Markt are the
 * Vorland band; everything further out is Stammland.
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

export function zoneOf(cfg: KConfig, x: number, z: number): Zone {
  const r = ring(x, z);
  if (r <= cfg.marktRadius) return 'markt';
  if (r <= cfg.marktRadius + cfg.vorlandDepth) return 'vorland';
  return 'stamm';
}

/** Which duchy's land a cell is (0 north, 1 east, 2 south, 3 west), or -1 inside the Markt. */
export function sectorOf(cfg: KConfig, x: number, z: number): number {
  if (ring(x, z) <= cfg.marktRadius) return -1;
  if (x > z && x <= -z) return 0;
  if (z > -x && z <= x) return 1;
  if (x < z && x >= -z) return 2;
  return 3;
}

export interface DuchyLayout {
  home: [number, number];
  /** Rotation that points the Stammburg's road at the Markt. */
  homeRot: number;
  /** Setup slots for the preplaced Vorland, in placement order. The first is the anchor. */
  vorland: [number, number][];
  /** Edge of the gap-side Vorland slot that faces home, and the cells of the straight gap. */
  gapEdge: number;
  gapCells: [number, number][];
}

export function layout(cfg: KConfig, d: number): DuchyLayout {
  const inner = cfg.marktRadius + 1;
  const outer = cfg.marktRadius + cfg.vorlandDepth;
  const canon: [number, number][] = [[0, -inner]];
  for (let r = inner + 1; r <= outer; r++) canon.push([0, -r]);
  canon.push([-1, -inner], [1, -inner]);
  const homeZ = -(outer + cfg.gap + 1);
  const gap: [number, number][] = [];
  for (let z = -(outer + 1); z > homeZ; z--) gap.push([0, z]);
  return {
    home: rotateCell(0, homeZ, d),
    homeRot: (1 + d) % 4,
    vorland: canon.map(([x, z]) => rotateCell(x, z, d)),
    gapEdge: d % 4,
    gapCells: gap.map(([x, z]) => rotateCell(x, z, d)),
  };
}
