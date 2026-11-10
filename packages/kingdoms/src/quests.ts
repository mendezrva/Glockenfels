/**
 * Side quests. Every line carries three optional cards from its story, a low, a medium and a high
 * one, worth the same total for every line. A card pays once, the moment it is met.
 */
import { sectorOf, zoneOf } from './board';
import { burgsOnRoad, find, league, majority, neighbourCount, residenzTiles, tileAnalysis, type KFeature, type KState } from './game';

export type QuestKind =
  | 'burg-size' | 'burg-banners' | 'burg-shared' | 'burg-markt'
  | 'stift' | 'stift-abroad'
  | 'road-size' | 'road-burgs' | 'road-loop'
  | 'field-burgs' | 'linked-all' | 'markt-tiles' | 'foreign-tiles' | 'swaps' | 'wanderers-out' | 'stift-claim' | 'stift-neighbours' | 'claims' | 'burgs-done';

export interface QuestDef {
  id: string;
  title: string;
  text: string;
  kind: QuestKind;
  /** Threshold for the kind: tiles, banners, Burgs, Stifte, swaps and so on. */
  n: number;
}

/** Checked only when the game ends. */
export const END_QUESTS = new Set<QuestKind>(['field-burgs', 'linked-all']);

/** A road with no end: every tile's stretch of it runs straight through. */
export function isLoop(s: KState, f: KFeature): boolean {
  if (f.kind !== 'road' || f.open !== 0 || f.tiles.length < 4) return false;
  const root = find(s, f.id);
  for (const k of f.tiles) {
    const t = s.board[k];
    const a = tileAnalysis(t);
    for (const [i, id] of t.featureIds.entries()) {
      if (a.features[i].kind !== 'road' || find(s, id) !== root) continue;
      if (a.features[i].edges.length !== 2) return false;
    }
  }
  return true;
}

/** Facts about a completed feature that quests look at. Built from a real feature or a preview. */
export interface Done {
  kind: KFeature['kind'];
  tiles: number;
  banner: number;
  marktTiles: number;
  burgs: number;
  shared: boolean;
  /** Is the feature's first tile outside player p's own portion? */
  abroad: boolean;
  loop: boolean;
}

export function doneOf(s: KState, f: KFeature, p: number): Done {
  const t = s.board[f.tiles[0]];
  return {
    kind: f.kind, tiles: f.tiles.length, banner: f.banner,
    marktTiles: residenzTiles(s, f.tiles), burgs: f.kind === 'road' ? burgsOnRoad(s, f) : 0,
    shared: majority(f).length > 1, abroad: sectorOf(s.cfg, t.x, t.z) !== p, loop: isLoop(s, f),
  };
}

/** Does completing `d` meet the quest? Only feature quests answer here. */
export function featureMeets(q: QuestDef, d: Done, stifteDone: number): boolean {
  switch (q.kind) {
    case 'burg-size': return d.kind === 'town' && d.tiles >= q.n;
    case 'burg-banners': return d.kind === 'town' && d.banner >= q.n;
    case 'burg-shared': return d.kind === 'town' && d.shared && d.tiles >= q.n;
    case 'burg-markt': return d.kind === 'town' && d.marktTiles >= q.n;
    case 'stift': return d.kind === 'monastery' && stifteDone >= q.n;
    case 'stift-abroad': return d.kind === 'monastery' && d.abroad;
    case 'road-size': return d.kind === 'road' && d.tiles >= q.n;
    case 'road-burgs': return d.kind === 'road' && d.burgs >= q.n;
    case 'road-loop': return d.kind === 'road' && d.loop;
    default: return false;
  }
}

/** State quests: met by what the player has done so far (checked after every turn, or at the end). */
export function stateMeets(s: KState, p: number, q: QuestDef, atEnd: boolean): boolean {
  const me = s.players[p];
  switch (q.kind) {
    case 'markt-tiles': return me.marktPlaced >= q.n;
    case 'foreign-tiles': return me.foreignPlaced >= q.n;
    case 'swaps': return me.swaps >= q.n;
    case 'wanderers-out': return me.wanderers === 0;
    case 'claims': return me.claims >= q.n;
    case 'burgs-done': return me.completed.town >= q.n;
    case 'stift-neighbours': {
      for (const f of s.features) {
        if (f.kind !== 'monastery' || !f.pieces.some((pc) => pc.player === p)) continue;
        if (neighbourCount(s, s.board[f.tiles[0]]) >= q.n) return true;
      }
      return me.completed.monastery > 0;
    }
    case 'stift-claim': {
      let n = 0;
      for (const f of s.features) if (f.kind === 'monastery' && (f.pieces.some((pc) => pc.player === p) || (f.scored && f.open === 0))) n++;
      return me.completed.monastery + s.features.filter((f) => f.kind === 'monastery' && !f.scored && f.pieces.some((pc) => pc.player === p)).length >= q.n && n >= q.n;
    }
    case 'linked-all': return atEnd && league(s, p).length === s.players.length;
    case 'field-burgs': {
      if (!atEnd) return false;
      for (const f of s.features) {
        if (s.parent[f.id] !== f.id || f.kind !== 'meadow' || !f.pieces.length || !majority(f).includes(p)) continue;
        const towns = new Set(f.touchesTowns.map((id) => find(s, id)));
        let done = 0;
        for (const id of towns) if (s.features[id].open === 0) done++;
        if (done >= q.n) return true;
      }
      return false;
    }
    default: return false;
  }
}

export const isStateQuest = (k: QuestKind) => ['markt-tiles', 'foreign-tiles', 'swaps', 'wanderers-out', 'linked-all', 'field-burgs', 'stift-claim', 'stift-neighbours', 'claims', 'burgs-done'].includes(k);

/** Is the spot in the Markt? Handy for bots weighing Markt quests. */
export const inMarkt = (s: KState, x: number, z: number) => zoneOf(s.cfg, x, z) === 'markt';
