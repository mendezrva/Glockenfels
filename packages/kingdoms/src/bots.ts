/**
 * Heuristic bots for the balance simulator. Each bot scores every full turn (pile, swaps, spot,
 * Wanderer) with the same point estimates, then adds a style bias: cultivators favour their own
 * Stammland, reachers favour the gap, the Markt and foreign land, balanced bots weigh both.
 */
import { DX, DZ } from '@glockenfels/engine';
import { keyOf, sectorOf, zoneOf } from './board';
import {
  anchorKey, candidates, connects, current, featureValue, homeKey, majority, MARKT, neighbourCount, networks,
  placementsFor, preview, tileAnalysis, tileAt, type KAction, type KPiece, type KState, type PreviewFeature,
} from './game';

export interface BotProfile {
  name: string;
  /** Weight on closing the gap and linking to other duchies. */
  reach: number;
  /** Bias for Markt tiles and Markt-zone placements. */
  markt: number;
  /** Bias for placing in other duchies' land. */
  foreign: number;
  /** Bias for each swap (negative avoids swapping). */
  swap: number;
  /** Bias for placing in your own Stammland, and for filling holes there. */
  cultivate: number;
  noise: number;
}

export const PROFILES: Record<'balanced' | 'cultivator' | 'reacher', BotProfile> = {
  balanced: { name: 'balanced', reach: 1, markt: 0.6, foreign: 0.4, swap: 0, cultivate: 0.5, noise: 0.3 },
  cultivator: { name: 'cultivator', reach: 0, markt: -5, foreign: -5, swap: -5, cultivate: 1, noise: 0.3 },
  reacher: { name: 'reacher', reach: 2.5, markt: 2, foreign: 1.5, swap: 0.5, cultivate: -1, noise: 0.3 },
};

const featureKey = (f: PreviewFeature, i: number) => (f.roots.length ? `${f.kind}:${[...f.roots].sort((a, b) => a - b).join('.')}` : `local:${i}`);

/** Rough final value of an open feature for whoever holds it. */
function estimate(s: KState, f: PreviewFeature, x: number, z: number, late: number): number {
  const sc = s.cfg.scoring;
  switch (f.kind) {
    case 'town': {
      const pc = 1 / (1 + 0.5 * Math.max(0, f.open - 1));
      const done = (f.tiles + Math.ceil(f.open / 2)) * sc.burgPerTile + f.banner * sc.burgPerBanner;
      const left = f.tiles * sc.burgIncompletePerTile + f.banner * sc.burgIncompletePerBanner;
      return (pc * late) * done + (1 - pc * late) * left;
    }
    case 'road': return f.tiles * sc.roadPerTile + f.badge * sc.roadPerBadge + f.open * 0.6 * late;
    case 'monastery': {
      const nb = neighbourCount(s, { x, z });
      const now = Math.min(sc.stiftComplete - 1, (nb + 1) * sc.stiftIncompletePerTile);
      return now + (sc.stiftComplete - now) * Math.min(1, late * (0.4 + nb / 10));
    }
    case 'meadow': {
      const towns = new Set(f.towns);
      let done = 0, open = 0;
      for (const id of towns) { if (s.features[id].open === 0) done++; else open++; }
      return sc.fieldPerBurg * (done + open * 0.45 * late);
    }
  }
}

function manhattanToSet(x: number, z: number, keys: { x: number; z: number }[]) {
  let best = Infinity;
  for (const t of keys) best = Math.min(best, Math.abs(t.x - x) + Math.abs(t.z - z));
  return best;
}

export function chooseTurn(s: KState, profile: BotProfile, rnd: () => number): KAction {
  const p = current(s);
  const me = s.players[p];
  const n = s.players.length;
  const comp = networks(s);
  const mine = comp.get(homeKey(s, p))!;
  const homeTotal = s.cfg.duchies[p].home.reduce((a, e) => a + e.count, 0);
  const late = Math.max(0.15, Math.min(1, s.decks[p].length / homeTotal + 0.15));
  // Gap bookkeeping.
  const myTiles = Object.values(s.board).filter((t) => comp.get(t.key) === mine);
  const vorComp = comp.get(anchorKey(s, p));
  const vorTiles = s.gapClosed[p] ? [] : Object.values(s.board).filter((t) => comp.get(t.key) === vorComp && sectorOf(s.cfg, t.x, t.z) === p);
  const gapBefore = s.gapClosed[p] ? 0 : Math.min(...myTiles.map((t) => manhattanToSet(t.x, t.z, vorTiles)));
  const homeComps = new Map<number, number[]>();
  s.players.forEach((_, q) => { const c = comp.get(homeKey(s, q))!; homeComps.set(c, [...(homeComps.get(c) ?? []), q]); });
  const anchorComps = new Map<number, number[]>();
  s.players.forEach((_, q) => { const c = comp.get(anchorKey(s, q))!; anchorComps.set(c, [...(anchorComps.get(c) ?? []), q]); });
  const scarcity = 1.2 + Math.max(0, 4 - me.wanderers) * 0.8;

  let best: { a: KAction; v: number } | null = null;
  for (const c of candidates(s, p)) {
    const zollPaid = c.zoll.reduce((a, z) => a + z.amount, 0);
    const base = -zollPaid * (1 + 1 / (n - 1)) + c.swaps.length * profile.swap - (c.swaps.length ? 0.3 : 0);
    for (const pl of placementsFor(s, p, c.tileId, c.style)) {
      const pv = preview(s, c.tileId, pl.x, pl.z, pl.rot);
      const zone = zoneOf(s.cfg, pl.x, pl.z);
      const sector = sectorOf(s.cfg, pl.x, pl.z);
      // Style and reach bias for this spot.
      let bias = base;
      if (c.style === MARKT || zone === 'markt') bias += profile.markt;
      if (sector !== p && sector !== -1) bias += profile.foreign;
      let nb = 0;
      for (let e = 0; e < 4; e++) if (tileAt(s, pl.x + DX[e], pl.z + DZ[e])) nb++;
      if (sector === p && zone === 'stamm') bias += profile.cultivate * (0.5 + 0.4 * nb);
      if (!s.gapClosed[p]) {
        const after = Math.min(gapBefore, manhattanToSet(pl.x, pl.z, vorTiles));
        let joinsVor = false;
        for (let e = 0; e < 4; e++) {
          const t = tileAt(s, pl.x + DX[e], pl.z + DZ[e]);
          if (t && comp.get(t.key) === vorComp && connects(s, pl.x, pl.z, t.x, t.z)) joinsVor = true;
        }
        bias += profile.reach * (joinsVor ? 7 : (gapBefore - after) * 1.6);
      }
      // Networks this spot would merge into ours.
      if (comp.get(homeKey(s, p)) !== undefined) {
        const merged = new Set<number>();
        let touchesMine = false;
        for (let e = 0; e < 4; e++) {
          const t = tileAt(s, pl.x + DX[e], pl.z + DZ[e]);
          if (!t || !connects(s, pl.x, pl.z, t.x, t.z)) continue;
          const cc = comp.get(t.key)!;
          if (cc === mine) touchesMine = true; else merged.add(cc);
        }
        if (touchesMine) for (const cc of merged) {
          bias += profile.reach * 5 * (homeComps.get(cc)?.length ?? 0);
          bias += profile.reach * 2 * (anchorComps.get(cc)?.filter((q) => q !== p).length ?? 0);
        }
      }
      // Points from features this tile completes or grows.
      const seen = new Set<string>();
      let points = 0;
      const groups: { f: PreviewFeature; i: number; key: string }[] = [];
      pv.forEach((f, i) => {
        const k = featureKey(f, i);
        if (seen.has(k)) return;
        seen.add(k);
        groups.push({ f, i, key: k });
      });
      // Value to me of a feature's change, given who holds it.
      const settle = (f: PreviewFeature, pieces: KPiece[]) => {
        if (!pieces.length) return 0;
        const owners = majority({ pieces } as never);
        const value = f.complete ? featureValueFromPreview(s, f, pl.x, pl.z) : estimate(s, f, pl.x, pl.z, late) - estimateBefore(s, f, late);
        let v = 0;
        for (const o of owners) v += o === p ? value : -value / (n - 1);
        if (f.complete) for (const pc of pieces) if (pc.player === p) v += scarcity * 0.6;
        return v;
      };
      for (const g of groups) points += settle(g.f, g.f.pieces);
      // Stifte around the spot that this tile grows or completes.
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const t = tileAt(s, pl.x + dx, pl.z + dz);
        if (!t) continue;
        const mi = tileAnalysis(t).monastery;
        if (mi < 0) continue;
        const f = s.features[t.featureIds[mi]];
        if (f.scored || !f.pieces.length) continue;
        const nbc = neighbourCount(s, t);
        const sc = s.cfg.scoring;
        const was = Math.min(sc.stiftComplete - 1, (nbc + 1) * sc.stiftIncompletePerTile);
        const gain = (nbc === 7 ? sc.stiftComplete : Math.min(sc.stiftComplete - 1, (nbc + 2) * sc.stiftIncompletePerTile)) - was;
        const owner = f.pieces[0].player;
        points += owner === p ? gain + (nbc === 7 ? scarcity * 0.6 : 0) : -gain / (n - 1);
      }
      const evalClaim = (claim: number | null) => {
        let v = points + bias;
        if (claim !== null) {
          const f = pv[claim];
          if (f.complete) v += featureValueFromPreview(s, f, pl.x, pl.z);
          else v += estimate(s, f, pl.x, pl.z, late) - (f.kind === 'meadow' ? 1.5 * late : 0) - scarcity;
        }
        return v + rnd() * profile.noise;
      };
      const options: (number | null)[] = [null];
      if (me.wanderers > 0) pv.forEach((f, i) => { if (!f.pieces.length && seenClaimOk(pv, i)) options.push(i); });
      for (const claim of options) {
        const v = evalClaim(claim);
        if (!best || v > best.v) best = { a: { type: 'turn', source: c.source, swaps: c.swaps, ...pl, claim }, v };
      }
    }
  }
  if (!best) return { type: 'pass' };
  return best.a;
}

/** Only one claim per merged feature group is worth listing (they are the same feature). */
function seenClaimOk(pv: PreviewFeature[], i: number) {
  const k = featureKey(pv[i], i);
  for (let j = 0; j < i; j++) if (featureKey(pv[j], j) === k) return false;
  return true;
}

function featureValueFromPreview(s: KState, f: PreviewFeature, x: number, z: number) {
  return featureValue(s, { id: -1, kind: f.kind, tiles: Array(f.tiles).fill(keyOf(x, z)), open: f.open, banner: f.banner, badge: f.badge, pieces: f.pieces, scored: false, touchesTowns: f.towns }, true);
}

/** Estimated value of the largest existing part before this tile joined it (so growth counts, not the whole). */
function estimateBefore(s: KState, f: PreviewFeature, late: number) {
  let v = 0;
  for (const r of f.roots) {
    const g = s.features[r];
    if (g.kind === 'meadow') continue;
    const pf: PreviewFeature = { kind: g.kind, roots: [r], open: g.open, tiles: g.tiles.length, banner: g.banner, badge: g.badge, pieces: g.pieces, complete: false, towns: [] };
    const t = s.board[g.tiles[0]];
    v += estimate(s, pf, t.x, t.z, late);
  }
  return v;
}
