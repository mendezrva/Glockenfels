/**
 * Tiny Kingdoms rules engine. Four duchies, a fractured central Markt, earned gaps, Markt piles,
 * reach through a transitive Markt league, swaps and Zoll. State is plain JSON-safe data and every
 * change goes through `apply`, so a seed plus the action log replays a game exactly.
 */
import { analyze, DX, DZ, OPPOSITE, oppositeSlot, type FeatureKind, type TileAnalysis } from '@glockenfels/engine';
import { keyOf, layout, sectorOf, zoneOf } from './board';
import type { KConfig } from './config';
import { K_TILES } from './tiles';

export const MARKT = -1;

export interface KTile {
  key: string; x: number; z: number; tileId: string; rot: number;
  /** Duchy whose style the tile carries, or MARKT for Markt tiles and the Marktburg. */
  style: number;
  /** Player who placed it, -1 for setup. */
  by: number;
  order: number;
  featureIds: number[];
}

export interface KPiece { player: number; tileKey: string; local: number }

export interface KFeature {
  id: number; kind: FeatureKind; tiles: string[]; open: number; banner: number; badge: number;
  pieces: KPiece[]; scored: boolean; touchesTowns: number[];
}

export interface KPlayer {
  duchy: number;
  score: number;
  wanderers: number;
  /** Score split for the balance report. */
  homePts: number; foreignPts: number; zollIn: number; zollOut: number;
  byKind: Record<FeatureKind, number>;
  swaps: number; marktPlaced: number; foreignPlaced: number;
  gapClosedTurn: number | null; firstLinkTurn: number | null;
}

export type Source = { kind: 'home'; depth: number } | { kind: 'reserve' } | { kind: 'markt'; duchy: number };

export type KAction =
  | { type: 'turn'; source: Source; swaps: number[]; x: number; z: number; rot: number; claim: number | null }
  | { type: 'pass' };

export type KEvent =
  | { type: 'placed'; tileKey: string; player: number }
  | { type: 'claimed'; tileKey: string; local: number; player: number }
  | { type: 'scored'; featureId: number; kind: FeatureKind; players: number[]; points: number; complete: boolean; tiles: string[] }
  | { type: 'returned'; piece: KPiece }
  | { type: 'swap'; player: number; with: number; zoll: number }
  | { type: 'reserved'; player: number; tileId: string }
  | { type: 'dead'; player: number; tileId: string }
  | { type: 'gapClosed'; player: number }
  | { type: 'linked'; players: number[] }
  | { type: 'passed'; player: number }
  | { type: 'ended'; winners: number[] };

export interface KState {
  cfg: KConfig;
  seed: number;
  rngA: number;
  board: Record<string, KTile>;
  features: KFeature[];
  parent: number[];
  /** Home decks; the top is the last element. */
  decks: string[][];
  markt: string[][];
  reserve: (string | null)[];
  players: KPlayer[];
  /** Turn order as player indexes; player i rules duchy i. */
  order: number[];
  seat: number;
  turn: number;
  passes: number;
  gapClosed: boolean[];
  /** Pairs of players already linked through the Markt, as "a-b". */
  links: string[];
  dead: number;
  ended: boolean;
  winners: number[] | null;
  log: KAction[];
  events: KEvent[];
}

const def = (id: string) => K_TILES[id];
export const tileAnalysis = (t: { tileId: string; rot: number }): TileAnalysis => analyze(def(t.tileId), t.rot);
export const tileAt = (s: KState, x: number, z: number): KTile | undefined => s.board[keyOf(x, z)];
export const current = (s: KState) => s.order[s.seat];

// ---------- random ----------

function rand(s: KState) {
  s.rngA = (s.rngA + 0x6d2b79f5) >>> 0;
  let t = s.rngA;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function shuffleInPlace<T>(s: KState, a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- feature graph ----------

export function find(s: KState, id: number): number {
  let r = id;
  while (s.parent[r] !== r) r = s.parent[r];
  while (s.parent[id] !== r) { const n = s.parent[id]; s.parent[id] = r; id = n; }
  return r;
}
export const featureOf = (s: KState, id: number) => s.features[find(s, id)];

function union(s: KState, a: number, b: number) {
  const ra = find(s, a), rb = find(s, b);
  if (ra === rb) return ra;
  const [keep, drop] = s.features[ra].tiles.length >= s.features[rb].tiles.length ? [ra, rb] : [rb, ra];
  const K = s.features[keep], D = s.features[drop];
  s.parent[drop] = keep;
  for (const t of D.tiles) if (!K.tiles.includes(t)) K.tiles.push(t);
  K.open += D.open;
  K.banner += D.banner;
  K.badge += D.badge;
  K.pieces.push(...D.pieces);
  K.scored &&= D.scored;
  K.touchesTowns.push(...D.touchesTowns);
  return keep;
}

// ---------- territory and reach ----------

/**
 * Two adjacent tiles join the same network if they are in the same duchy's land, or one is in the
 * Markt and the other duchy has closed its gap (a duchy only opens to the Markt once it is connected
 * from Stammburg to Vorland). Different duchies' lands never join directly.
 */
export function connects(s: KState, ax: number, az: number, bx: number, bz: number) {
  const sa = sectorOf(s.cfg, ax, az), sb = sectorOf(s.cfg, bx, bz);
  if (sa === sb) return true;
  if (sa === -1) return s.gapClosed[sb];
  if (sb === -1) return s.gapClosed[sa];
  return false;
}

/** Is duchy p's Vorland joined to its Stammburg through its own land? */
function gapIsClosed(s: KState, p: number) {
  const start = s.board[homeKey(s, p)];
  const goal = anchorKey(s, p);
  const seen = new Set([start.key]);
  const stack = [start];
  while (stack.length) {
    const t = stack.pop()!;
    if (t.key === goal) return true;
    for (let e = 0; e < 4; e++) {
      const n = tileAt(s, t.x + DX[e], t.z + DZ[e]);
      if (!n || seen.has(n.key) || sectorOf(s.cfg, n.x, n.z) !== p) continue;
      seen.add(n.key);
      stack.push(n);
    }
  }
  return false;
}

const compCache = new WeakMap<KState, { size: string; comp: Map<string, number> }>();

/** Labels every tile with its network (connected component). Cached until the board changes. */
export function networks(s: KState): Map<string, number> {
  const size = `${Object.keys(s.board).length}/${s.gapClosed.join()}`;
  const hit = compCache.get(s);
  if (hit && hit.size === size) return hit.comp;
  const comp = new Map<string, number>();
  let label = 0;
  for (const start of Object.values(s.board)) {
    if (comp.has(start.key)) continue;
    const stack = [start];
    comp.set(start.key, label);
    while (stack.length) {
      const t = stack.pop()!;
      for (let e = 0; e < 4; e++) {
        const n = tileAt(s, t.x + DX[e], t.z + DZ[e]);
        if (!n || comp.has(n.key) || !connects(s, t.x, t.z, n.x, n.z)) continue;
        comp.set(n.key, label);
        stack.push(n);
      }
    }
    label++;
  }
  compCache.set(s, { size, comp });
  return comp;
}

export const homeKey = (s: KState, p: number) => keyOf(...layout(s.cfg, p).home);
export const anchorKey = (s: KState, p: number) => keyOf(...layout(s.cfg, p).vorland[0]);
export const networkOf = (s: KState, p: number) => networks(s).get(homeKey(s, p))!;

/** Players whose Stammburg shares a network with player p (p included). */
export function league(s: KState, p: number): number[] {
  const comp = networks(s);
  const mine = comp.get(homeKey(s, p));
  return s.players.map((_, q) => q).filter((q) => comp.get(homeKey(s, q)) === mine);
}

/** Markt piles player p may draw from: their own once the gap is closed, plus every linked duchy's open pile. */
export function marktAccess(s: KState, p: number): number[] {
  return league(s, p).filter((q) => s.gapClosed[q]);
}

// ---------- placement ----------

export interface Candidate {
  source: Source;
  swaps: number[];
  tileId: string;
  style: number;
  zoll: { to: number; amount: number }[];
}

/** Zoll player p pays for one swap into duchy q (only once q has closed its gap). */
export function zollFor(s: KState, p: number, q: number): number {
  if (!s.gapClosed[q]) return 0;
  if (s.cfg.duchies[p].id === 'hopfen' && !s.cfg.powers.hopfenPaysZoll) return 0;
  return s.cfg.zoll;
}

/** What duchy q collects for one swap into it: Salz collects more than is paid (the Salzregal). */
export function zollReceived(s: KState, p: number, q: number): number {
  if (!s.gapClosed[q]) return 0;
  const base = s.cfg.duchies[p].id === 'hopfen' && !s.cfg.powers.hopfenPaysZoll ? 0 : s.cfg.zoll;
  return s.cfg.duchies[q].id === 'salz' ? Math.max(base, s.cfg.zoll) * s.cfg.powers.salzZollFactor : base;
}

export function swapsAllowed(s: KState, p: number) {
  return s.cfg.duchies[p].id === 'forst' ? s.cfg.powers.forstSwaps : s.cfg.swapsPerTurn;
}

/** Works out which tile a source plus a swap sequence yields, without changing the state. */
export function resolve(s: KState, p: number, source: Source, swaps: number[]): Candidate | null {
  let tileId: string | null = null;
  let style = p;
  if (source.kind === 'home') {
    const deck = s.decks[p];
    const peek = s.cfg.duchies[p].id === 'wein' ? s.cfg.powers.weinPeek : 1;
    if (source.depth < 0 || source.depth >= peek) return null;
    tileId = deck[deck.length - 1 - source.depth] ?? null;
  } else if (source.kind === 'reserve') {
    tileId = s.reserve[p];
  } else {
    if (!marktAccess(s, p).includes(source.duchy)) return null;
    const pile = s.markt[source.duchy];
    tileId = pile[pile.length - 1] ?? null;
    style = MARKT;
  }
  if (!tileId) return null;
  if (swaps.length) {
    // Swapping is the reward for connecting: your own gap must be closed.
    if (source.kind === 'markt' || swaps.length > swapsAllowed(s, p) || !s.gapClosed[p]) return null;
    const decks = new Map<number, string[]>();
    let paid = 0;
    const zoll: Candidate['zoll'] = [];
    for (const q of swaps) {
      if (q === p || q < 0 || q >= s.players.length) return null;
      if (s.cfg.swapTargets === 'league' && !league(s, p).includes(q)) return null;
      const d = decks.get(q) ?? s.decks[q].slice();
      decks.set(q, d);
      if (!d.length) return null;
      const taken = d.pop()!;
      if (s.cfg.swapGivesTo === 'top') d.push(tileId); else d.unshift(tileId);
      tileId = taken;
      style = q;
      const z = zollFor(s, p, q);
      if (z) { zoll.push({ to: q, amount: z }); paid += z; }
    }
    if (paid > Math.max(0, s.players[p].score)) return null;
    return { source, swaps, tileId, style, zoll };
  }
  return { source, swaps, tileId, style, zoll: [] };
}

/** Every tile the current player could take this turn (before checking where it fits). */
export function candidates(s: KState, p = current(s)): Candidate[] {
  const out: Candidate[] = [];
  const bases: Source[] = [];
  const peek = s.cfg.duchies[p].id === 'wein' ? s.cfg.powers.weinPeek : 1;
  for (let d = 0; d < Math.min(peek, s.decks[p].length); d++) bases.push({ kind: 'home', depth: d });
  if (s.reserve[p]) bases.push({ kind: 'reserve' });
  for (const q of marktAccess(s, p)) if (s.markt[q].length) bases.push({ kind: 'markt', duchy: q });
  const max = swapsAllowed(s, p);
  const others = s.players.map((_, q) => q).filter((q) => q !== p);
  for (const b of bases) {
    const seqs: number[][] = [[]];
    if (b.kind !== 'markt' && max > 0) {
      for (const q of others) seqs.push([q]);
      if (max > 1) for (const q of others) for (const r of others) seqs.push([q, r]);
    if (!s.gapClosed[p]) seqs.length = 1;
    }
    for (const sw of seqs) {
      const c = resolve(s, p, b, sw);
      if (c) out.push(c);
    }
  }
  return out;
}

/** Can player p put this tile (with this style) here? */
export function isLegal(s: KState, p: number, tileId: string, style: number, x: number, z: number, rot: number): boolean {
  if (tileAt(s, x, z)) return false;
  const zone = zoneOf(s.cfg, x, z);
  const sector = sectorOf(s.cfg, x, z);
  if (style === MARKT) {
    if (zone === 'stamm') return false;
  } else {
    if (zone === 'markt') return false;
    // Your tiles (and tiles you swapped for) go on your own land or any Vorland you reach;
    // a swapped tile may also go on the land of the duchy whose style it carries.
    const ownReach = sector === p || zone === 'vorland';
    if (style === p ? !ownReach : !(ownReach || sector === style)) return false;
  }
  const a = analyze(def(tileId), rot);
  const comp = networks(s);
  const mine = comp.get(homeKey(s, p));
  let neighbours = 0, reached = false;
  for (let e = 0; e < 4; e++) {
    const n = tileAt(s, x + DX[e], z + DZ[e]);
    if (!n) continue;
    neighbours++;
    if (tileAnalysis(n).edges[OPPOSITE[e]] !== a.edges[e]) return false;
    if (!reached && comp.get(n.key) === mine && connects(s, x, z, n.x, n.z)) reached = true;
  }
  return neighbours > 0 && reached;
}

export interface Placement { x: number; z: number; rot: number }

const rotCache = new Map<string, number[]>();
/** Distinct rotations of a tile (symmetric tiles need fewer). */
export function rotations(tileId: string): number[] {
  const hit = rotCache.get(tileId);
  if (hit) return hit;
  const seen = new Set<string>();
  const out: number[] = [];
  for (let r = 0; r < 4; r++) {
    const k = analyze(def(tileId), r).edges.join();
    if (!seen.has(k)) { seen.add(k); out.push(r); }
  }
  rotCache.set(tileId, out);
  return out;
}

/** Empty cells next to player p's network. */
export function frontier(s: KState, p: number): [number, number][] {
  const comp = networks(s);
  const mine = comp.get(homeKey(s, p));
  const seen = new Set<string>();
  const out: [number, number][] = [];
  for (const t of Object.values(s.board)) {
    if (comp.get(t.key) !== mine) continue;
    for (let e = 0; e < 4; e++) {
      const x = t.x + DX[e], z = t.z + DZ[e], k = keyOf(x, z);
      if (s.board[k] || seen.has(k)) continue;
      seen.add(k);
      out.push([x, z]);
    }
  }
  return out;
}

export function placementsFor(s: KState, p: number, tileId: string, style: number): Placement[] {
  const out: Placement[] = [];
  const rots = rotations(tileId);
  for (const [x, z] of frontier(s, p)) for (const rot of rots) if (isLegal(s, p, tileId, style, x, z, rot)) out.push({ x, z, rot });
  return out;
}

// ---------- setup ----------

function addTile(s: KState, tileId: string, x: number, z: number, rot: number, style: number, by: number): KTile {
  const key = keyOf(x, z);
  const d = def(tileId);
  const a = analyze(d, rot);
  const tile: KTile = { key, x, z, tileId, rot, style, by, order: Object.keys(s.board).length, featureIds: [] };
  let badgeGiven = false;
  for (const f of a.features) {
    const id = s.features.length;
    s.parent.push(id);
    let badge = 0;
    if (f.kind === 'road' && d.badge && !badgeGiven) { badge = d.badge; badgeGiven = true; }
    s.features.push({ id, kind: f.kind, tiles: [key], open: f.edges.length, banner: f.banner, badge, pieces: [], scored: false, touchesTowns: [] });
    tile.featureIds.push(id);
  }
  for (const [i, f] of a.features.entries()) if (f.kind === 'meadow') s.features[tile.featureIds[i]].touchesTowns = f.touchesTowns.map((t) => tile.featureIds[t]);
  s.board[key] = tile;
  for (let e = 0; e < 4; e++) {
    const n = tileAt(s, x + DX[e], z + DZ[e]);
    if (!n) continue;
    const na = tileAnalysis(n);
    const li = a.byEdge[e], ni = na.byEdge[OPPOSITE[e]];
    if (li >= 0 && ni >= 0) {
      const r = union(s, tile.featureIds[li], n.featureIds[ni]);
      s.features[r].open -= 2;
    }
    for (const half of [0, 1]) {
      const slot = 2 * e + half;
      const ms = a.bySlot[slot], ns = na.bySlot[oppositeSlot(slot)];
      if (ms >= 0 && ns >= 0) union(s, tile.featureIds[ms], n.featureIds[ns]);
    }
  }
  return tile;
}

/** Edges match every present neighbour (setup ignores the reach rule). */
function fitsHere(s: KState, tileId: string, x: number, z: number, rot: number) {
  const a = analyze(def(tileId), rot);
  for (let e = 0; e < 4; e++) {
    const n = tileAt(s, x + DX[e], z + DZ[e]);
    if (n && tileAnalysis(n).edges[OPPOSITE[e]] !== a.edges[e]) return false;
  }
  return true;
}

/** Setup preference: close Burg edges, point the road at home on the gap side, avoid walls facing nothing useful. */
function setupScore(s: KState, tileId: string, x: number, z: number, rot: number, homeEdge: number | null) {
  const a = analyze(def(tileId), rot);
  let v = 0;
  for (let e = 0; e < 4; e++) {
    const n = tileAt(s, x + DX[e], z + DZ[e]);
    if (n && a.edges[e] === 'town') v += 3;
    if (n && a.edges[e] === 'road') v += 1;
    if (!n && a.edges[e] === 'town') v -= 1;
  }
  if (homeEdge !== null) v += a.edges[homeEdge] === 'road' ? 4 : a.edges[homeEdge] === 'town' ? -2 : 0;
  return v;
}

function setupVorland(s: KState, p: number) {
  const L = layout(s.cfg, p);
  const deck = s.decks[p];
  let reserve: string | null = null;
  L.vorland.forEach(([x, z], i) => {
    const homeEdge = i === L.gapSide ? L.gapEdge : null;
    for (let tries = 0; tries < deck.length + 2; tries++) {
      const pool: { id: string; from: 'reserve' | 'deck' }[] = [];
      if (reserve) pool.push({ id: reserve, from: 'reserve' });
      if (deck.length) pool.push({ id: deck[deck.length - 1], from: 'deck' });
      let best: { id: string; from: 'reserve' | 'deck'; rot: number; v: number } | null = null;
      for (const c of pool) for (const rot of rotations(c.id)) {
        if (!fitsHere(s, c.id, x, z, rot)) continue;
        const v = setupScore(s, c.id, x, z, rot, homeEdge);
        if (!best || v > best.v) best = { ...c, rot, v };
      }
      if (best) {
        if (best.from === 'reserve') reserve = null; else deck.pop();
        addTile(s, best.id, x, z, best.rot, p, -1);
        return;
      }
      // Nothing fits: park the top tile in the reserve slot, or send it to the bottom.
      const top = deck.pop();
      if (!top) return;
      if (!reserve) reserve = top; else deck.unshift(top);
    }
  });
  if (reserve) deck.unshift(reserve);
}

export function createGame(cfg: KConfig, seed: number, first = 0): KState {
  const n = cfg.duchies.length;
  const s: KState = {
    cfg, seed, rngA: seed >>> 0,
    board: {}, features: [], parent: [],
    decks: [], markt: [], reserve: Array(n).fill(null),
    players: cfg.duchies.map((_, i) => ({
      duchy: i, score: 0, wanderers: cfg.wanderers, byKind: { road: 0, town: 0, monastery: 0, meadow: 0 }, homePts: 0, foreignPts: 0, zollIn: 0, zollOut: 0,
      swaps: 0, marktPlaced: 0, foreignPlaced: 0, gapClosedTurn: null, firstLinkTurn: null,
    })),
    order: Array.from({ length: n }, (_, i) => (first + i) % n),
    seat: 0, turn: 0, passes: 0, gapClosed: Array(n).fill(false), links: [], dead: 0,
    ended: false, winners: null, log: [], events: [],
  };
  const expand = (d: { tileId: string; count: number }[]) => d.flatMap((e) => Array(e.count).fill(e.tileId) as string[]);
  for (const d of cfg.duchies) {
    s.decks.push(shuffleInPlace(s, expand(d.home)));
    s.markt.push(shuffleInPlace(s, expand(d.markt)).slice(0, cfg.marktPile));
  }
  addTile(s, 'marktplatz', 0, 0, 0, MARKT, -1);
  for (let p = 0; p < n; p++) {
    const L = layout(cfg, p);
    addTile(s, 'stammburg', L.home[0], L.home[1], L.homeRot, p, -1);
  }
  for (let p = 0; p < n; p++) setupVorland(s, p);
  refreshReach(s, -1);
  s.events = [];
  beginTurn(s);
  return s;
}

// ---------- scoring ----------

export function neighbourCount(s: KState, t: { x: number; z: number }) {
  let n = 0;
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if ((dx || dz) && tileAt(s, t.x + dx, t.z + dz)) n++;
  return n;
}

export function featureValue(s: KState, f: KFeature, complete: boolean): number {
  const sc = s.cfg.scoring;
  const n = f.tiles.length;
  switch (f.kind) {
    case 'road': return n * sc.roadPerTile + f.badge * sc.roadPerBadge;
    case 'town': return complete ? n * sc.burgPerTile + f.banner * sc.burgPerBanner : n * sc.burgIncompletePerTile + f.banner * sc.burgIncompletePerBanner;
    // An unfinished Stift scores per tile of its 3 × 3, but always less than a finished one.
    case 'monastery': return complete ? sc.stiftComplete : Math.min(sc.stiftComplete - 1, (neighbourCount(s, s.board[f.tiles[0]]) + 1) * sc.stiftIncompletePerTile);
    case 'meadow': {
      const towns = new Set(f.touchesTowns.map((id) => find(s, id)));
      let done = 0;
      for (const id of towns) if (s.features[id].open === 0) done++;
      return done * sc.fieldPerBurg;
    }
  }
}

export function majority(f: KFeature): number[] {
  const count = new Map<number, number>();
  for (const p of f.pieces) count.set(p.player, (count.get(p.player) ?? 0) + 1);
  let best = 0;
  for (const v of count.values()) best = Math.max(best, v);
  return best ? [...count.entries()].filter(([, v]) => v === best).map(([p]) => p).sort() : [];
}

/** Is most of the feature in player p's own land? Used only for the home/foreign report. */
function isHomeFor(s: KState, f: KFeature, p: number) {
  let own = 0;
  for (const k of f.tiles) { const t = s.board[k]; if (sectorOf(s.cfg, t.x, t.z) === p) own++; }
  return own * 2 >= f.tiles.length;
}

function scoreFeature(s: KState, f: KFeature, complete: boolean) {
  if (f.scored) return;
  f.scored = true;
  const winners = majority(f);
  const points = featureValue(s, f, complete);
  for (const p of winners) {
    s.players[p].score += points;
    s.players[p].byKind[f.kind] += points;
    if (isHomeFor(s, f, p)) s.players[p].homePts += points; else s.players[p].foreignPts += points;
  }
  if (winners.length) s.events.push({ type: 'scored', featureId: f.id, kind: f.kind, players: winners, points, complete, tiles: f.tiles.slice() });
  if (complete) {
    for (const piece of f.pieces) { s.players[piece.player].wanderers++; s.events.push({ type: 'returned', piece }); }
    f.pieces = [];
  }
}

function scoreCompleted(s: KState, placed: KTile) {
  const roots = new Set(placed.featureIds.map((id) => find(s, id)));
  for (const id of roots) {
    const f = s.features[id];
    if ((f.kind === 'road' || f.kind === 'town') && f.open === 0 && !f.scored) scoreFeature(s, f, true);
  }
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    const t = tileAt(s, placed.x + dx, placed.z + dz);
    if (!t) continue;
    const mi = tileAnalysis(t).monastery;
    if (mi < 0) continue;
    const f = featureOf(s, t.featureIds[mi]);
    if (!f.scored && neighbourCount(s, t) === 8) scoreFeature(s, f, true);
  }
}

function endGame(s: KState) {
  if (s.ended) return;
  s.ended = true;
  for (const f of s.features) {
    if (s.parent[f.id] !== f.id || f.scored || !f.pieces.length) continue;
    scoreFeature(s, f, false);
  }
  const top = Math.max(...s.players.map((p) => p.score));
  s.winners = s.players.map((_, i) => i).filter((i) => s.players[i].score === top);
  s.events.push({ type: 'ended', winners: s.winners });
}

// ---------- reach bookkeeping ----------

function refreshReach(s: KState, by: number) {
  const n = s.players.length;
  for (let p = 0; p < n; p++) {
    if (!s.gapClosed[p] && gapIsClosed(s, p)) {
      s.gapClosed[p] = true;
      s.players[p].gapClosedTurn = s.turn;
      if (by >= 0) s.events.push({ type: 'gapClosed', player: p });
    }
  }
  const comp = networks(s);
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
    const k = `${a}-${b}`;
    if (s.links.includes(k) || comp.get(homeKey(s, a)) !== comp.get(homeKey(s, b))) continue;
    s.links.push(k);
    for (const p of [a, b]) s.players[p].firstLinkTurn ??= s.turn;
    if (by >= 0) s.events.push({ type: 'linked', players: [a, b] });
  }
}

// ---------- turn flow ----------

/** A tile this player can actually place, from any source. */
export function hasPlay(s: KState, p: number) {
  return candidates(s, p).some((c) => placementsFor(s, p, c.tileId, c.style).length > 0);
}

function beginTurn(s: KState) {
  for (let guard = 0; guard < 200 && !s.ended; guard++) {
    const p = current(s);
    if (s.cfg.rounds && s.turn >= s.cfg.rounds * s.players.length) return endGame(s);
    s.turn++;
    // Clear dead draws: an unplayable home top goes to the reserve slot, or is lost if the slot is full.
    for (;;) {
      if (hasPlay(s, p)) { s.passes = 0; return; }
      const top = s.decks[p].pop();
      if (!top) break;
      if (!s.reserve[p]) { s.reserve[p] = top; s.events.push({ type: 'reserved', player: p, tileId: top }); }
      else { s.dead++; s.events.push({ type: 'dead', player: p, tileId: top }); }
    }
    s.events.push({ type: 'passed', player: p });
    s.passes++;
    if (s.passes >= s.players.length) return endGame(s);
    s.seat = (s.seat + 1) % s.order.length;
  }
  endGame(s);
}

/** Local features of a tile that can take a Wanderer right after it is placed. */
export function claimable(s: KState, key: string): number[] {
  const t = s.board[key];
  const out: number[] = [];
  tileAnalysis(t).features.forEach((_, i) => {
    const g = featureOf(s, t.featureIds[i]);
    if (!g.pieces.length && !g.scored) out.push(i);
  });
  return out;
}

export function apply(s: KState, action: KAction): KState {
  s.events = [];
  if (s.ended) throw new Error('The game is over.');
  const p = current(s);
  if (action.type === 'pass') {
    if (hasPlay(s, p)) throw new Error('You have a tile you can place.');
    throw new Error('Passing happens automatically.');
  }
  const c = resolve(s, p, action.source, action.swaps);
  if (!c) throw new Error('You cannot take that tile.');
  if (!isLegal(s, p, c.tileId, c.style, action.x, action.z, action.rot)) throw new Error('That tile does not fit there.');
  // Take the tile from its source.
  const src = action.source;
  let tileId: string;
  if (src.kind === 'home') {
    const deck = s.decks[p];
    tileId = deck.splice(deck.length - 1 - src.depth, 1)[0];
    // Wein in 'bury' mode: the tiles it looked past go to the bottom of its deck.
    if (src.depth > 0 && s.cfg.powers.weinMode === 'bury') deck.unshift(...deck.splice(deck.length - src.depth, src.depth));
  }
  else if (src.kind === 'reserve') { tileId = s.reserve[p]!; s.reserve[p] = null; }
  else tileId = s.markt[src.duchy].pop()!;
  // Swaps: hand the tile to the bottom of the other duchy's deck and take its top tile.
  const me = s.players[p];
  for (const q of action.swaps) {
    const taken = s.decks[q].pop()!;
    if (s.cfg.swapGivesTo === 'top') s.decks[q].push(tileId); else s.decks[q].unshift(tileId);
    tileId = taken;
    const z = zollFor(s, p, q), got = zollReceived(s, p, q);
    me.score -= z; me.zollOut += z;
    s.players[q].score += got; s.players[q].zollIn += got;
    me.swaps++;
    s.events.push({ type: 'swap', player: p, with: q, zoll: z });
  }
  if (tileId !== c.tileId) throw new Error('Internal: swap replay mismatch.');
  s.log.push(action);
  const placed = addTile(s, tileId, action.x, action.z, action.rot, c.style, p);
  s.events.push({ type: 'placed', tileKey: placed.key, player: p });
  if (c.style === MARKT) me.marktPlaced++;
  if (sectorOf(s.cfg, action.x, action.z) !== p) me.foreignPlaced++;
  if (action.claim !== null) {
    if (me.wanderers <= 0) throw new Error('No Wanderers left.');
    if (!claimable(s, placed.key).includes(action.claim)) throw new Error('That feature is already claimed.');
    const f = featureOf(s, placed.featureIds[action.claim]);
    me.wanderers--;
    f.pieces.push({ player: p, tileKey: placed.key, local: action.claim });
    s.events.push({ type: 'claimed', tileKey: placed.key, local: action.claim, player: p });
  }
  scoreCompleted(s, placed);
  refreshReach(s, p);
  s.seat = (s.seat + 1) % s.order.length;
  const events = s.events;
  beginTurn(s);
  s.events = [...events, ...s.events];
  return s;
}

/** Every full turn the current player may take (source, swaps, placement, claim). */
export function legalTurns(s: KState): KAction[] {
  if (s.ended) return [];
  const p = current(s);
  const out: KAction[] = [];
  for (const c of candidates(s, p)) {
    for (const pl of placementsFor(s, p, c.tileId, c.style)) {
      out.push({ type: 'turn', source: c.source, swaps: c.swaps, ...pl, claim: null });
      if (s.players[p].wanderers > 0) {
        // Claims depend on how the tile joins its neighbours, so check against a preview.
        for (const local of previewClaimable(s, c.tileId, pl.x, pl.z, pl.rot)) out.push({ type: 'turn', source: c.source, swaps: c.swaps, ...pl, claim: local });
      }
    }
  }
  return out;
}

// ---------- preview (no mutation), for bots and the client ----------

export interface PreviewFeature {
  kind: FeatureKind;
  roots: number[];
  open: number;
  tiles: number;
  banner: number;
  badge: number;
  pieces: KPiece[];
  complete: boolean;
  /** Meadow only: roots of Burgs it touches. */
  towns: number[];
}

/** How each local feature of a tile would look once placed here. */
export function preview(s: KState, tileId: string, x: number, z: number, rot: number): PreviewFeature[] {
  const d = def(tileId);
  const a = analyze(d, rot);
  const joins: { roots: Set<number>; edgeJoins: number }[] = a.features.map(() => ({ roots: new Set<number>(), edgeJoins: 0 }));
  for (let e = 0; e < 4; e++) {
    const n = tileAt(s, x + DX[e], z + DZ[e]);
    if (!n) continue;
    const na = tileAnalysis(n);
    const li = a.byEdge[e], ni = na.byEdge[OPPOSITE[e]];
    if (li >= 0 && ni >= 0) { joins[li].roots.add(find(s, n.featureIds[ni])); joins[li].edgeJoins++; }
    for (const half of [0, 1]) {
      const slot = 2 * e + half;
      const ms = a.bySlot[slot], ns = na.bySlot[oppositeSlot(slot)];
      if (ms >= 0 && ns >= 0) joins[ms].roots.add(find(s, n.featureIds[ns]));
    }
  }
  // Two local features that touch the same neighbour feature become one once placed.
  const grp = a.features.map((_, i) => i);
  const g = (i: number): number => (grp[i] === i ? i : (grp[i] = g(grp[i])));
  for (let i = 0; i < joins.length; i++) for (let k = i + 1; k < joins.length; k++) {
    if ([...joins[i].roots].some((r) => joins[k].roots.has(r))) grp[g(k)] = g(i);
  }
  let badgeGiven = false;
  const localBadge = a.features.map((f) => {
    if (f.kind === 'road' && d.badge && !badgeGiven) { badgeGiven = true; return d.badge; }
    return 0;
  });
  return a.features.map((f, i) => {
    const members = a.features.map((_, k) => k).filter((k) => g(k) === g(i));
    const roots = new Set<number>();
    let open = 0, banner = 0, badge = 0;
    for (const k of members) {
      for (const r of joins[k].roots) roots.add(r);
      open += a.features[k].edges.length - 2 * joins[k].edgeJoins;
      banner += a.features[k].banner;
      badge += localBadge[k];
    }
    let tiles = 1;
    const pieces: KPiece[] = [];
    const towns: number[] = [];
    for (const r of roots) {
      const gf = s.features[r];
      open += gf.open; tiles += gf.tiles.length; banner += gf.banner; badge += gf.badge;
      pieces.push(...gf.pieces);
      if (f.kind === 'meadow') for (const t of gf.touchesTowns) towns.push(find(s, t));
    }
    const complete = f.kind === 'road' || f.kind === 'town' ? open === 0 : f.kind === 'monastery' ? neighbourCount(s, { x, z }) === 8 : false;
    return { kind: f.kind, roots: [...roots], open, tiles, banner, badge, pieces, complete, towns };
  });
}

export function previewClaimable(s: KState, tileId: string, x: number, z: number, rot: number): number[] {
  return preview(s, tileId, x, z, rot).map((f, i) => (f.pieces.length ? -1 : i)).filter((i) => i >= 0);
}

/** Rebuilds a game from its seed and log. */
export function replay(cfg: KConfig, seed: number, first: number, log: KAction[]): KState {
  const s = createGame(cfg, seed, first);
  for (const a of log) apply(s, a);
  return s;
}

/** Test and tooling hook: puts a tile on the board directly, then updates reach. No scoring. */
export function forcePlace(s: KState, tileId: string, x: number, z: number, rot: number, style: number, by = -1) {
  const t = addTile(s, tileId, x, z, rot, style, by);
  refreshReach(s, by);
  return t;
}
