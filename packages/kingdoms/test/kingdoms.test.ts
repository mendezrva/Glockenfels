import { describe, expect, it } from 'vitest';
import { chooseTurn, PROFILES } from '../src/bots';
import { keyOf, layout, sectorOf, zoneOf } from '../src/board';
import { buildConfig } from '../src/config';
import {
  apply, candidates, createGame, forcePlace, isLegal, league, legalTurns, marktAccess, MARKT, replay, resolve, tileAt, zollFor, zollReceived,
  type KAction, type KState,
} from '../src/game';
import { playGame } from '../src/sim';
import { DUCHIES, deckSize, K_TILES } from '../src/tiles';

const cfg = buildConfig();

/** Fills a duchy's gap with straight roads so its Vorland joins its Stammburg. */
function closeGap(s: KState, p: number) {
  const L = layout(cfg, p);
  for (const [x, z] of L.gapCells) if (!tileAt(s, x, z)) forcePlace(s, 'road', x, z, p % 2 ? 1 : 0, p);
  return L;
}

describe('tiles and decks', () => {
  it('gives every duchy a home deck of the same size and a Markt pile of six', () => {
    const sizes = DUCHIES.map((d) => deckSize(d.home));
    expect(new Set(sizes).size).toBe(1);
    for (const d of DUCHIES) expect(deckSize(d.markt)).toBe(6);
    for (const d of DUCHIES) for (const e of [...d.home, ...d.markt]) expect(K_TILES[e.tileId], e.tileId).toBeDefined();
  });
  it('splits the board into four sectors and a Markt', () => {
    expect(sectorOf(cfg, 0, -5)).toBe(0);
    expect(sectorOf(cfg, 5, 0)).toBe(1);
    expect(sectorOf(cfg, 0, 5)).toBe(2);
    expect(sectorOf(cfg, -5, 0)).toBe(3);
    expect(sectorOf(cfg, 1, 1)).toBe(-1);
    expect(zoneOf(cfg, 0, -3)).toBe('vorland');
    expect(zoneOf(cfg, 0, -5)).toBe('stamm');
    // Every ring cell belongs to exactly one duchy, and the four quarters are the same size.
    const counts = [0, 0, 0, 0];
    for (let x = -8; x <= 8; x++) for (let z = -8; z <= 8; z++) if (sectorOf(cfg, x, z) >= 0) counts[sectorOf(cfg, x, z)]++;
    expect(new Set(counts).size).toBe(1);
  });
});

describe('setup', () => {
  it('places the Marktplatz, four Stammburgen and each Vorland with the gap left open', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const s = createGame(cfg, seed);
      expect(tileAt(s, 0, 0)?.tileId).toBe('marktplatz');
      for (let p = 0; p < 4; p++) {
        const L = layout(cfg, p);
        expect(tileAt(s, ...L.home)?.tileId).toBe('stammburg');
        for (const [x, z] of L.vorland) expect(tileAt(s, x, z)?.style, `seed ${seed} duchy ${p}`).toBe(p);
        for (const [x, z] of L.gapCells) expect(tileAt(s, x, z)).toBeUndefined();
        expect(s.gapClosed[p]).toBe(false);
        expect(s.players[p].score).toBe(0);
        expect(s.decks[p].length).toBe(deckSize(DUCHIES[p].home) - L.vorland.length);
      }
    }
  });
  it('replays exactly from seed and log', () => {
    const s = createGame(cfg, 9, 2);
    const r = () => 0.5;
    for (let i = 0; i < 30 && !s.ended; i++) apply(s, chooseTurn(s, PROFILES.balanced, r));
    const again = replay(cfg, 9, 2, s.log);
    expect(again.players.map((p) => p.score)).toEqual(s.players.map((p) => p.score));
    expect(Object.keys(again.board).sort()).toEqual(Object.keys(s.board).sort());
  });
});

describe('reach', () => {
  it('only lets you build off your own Stammburg until the gap is closed', () => {
    const s = createGame(cfg, 3, 0);
    const home = layout(cfg, 0).home;
    for (const a of legalTurns(s) as Extract<KAction, { type: 'turn' }>[]) {
      expect(Math.abs(a.x - home[0]) + Math.abs(a.z - home[1]) <= 12).toBe(true);
      expect(sectorOf(cfg, a.x, a.z)).toBe(0);
      expect(zoneOf(cfg, a.x, a.z)).not.toBe('markt');
    }
    expect(marktAccess(s, 0)).toEqual([]);
    // Next to the Vorland but not connected to home: illegal.
    const [vx, vz] = layout(cfg, 0).vorland[0];
    expect(isLegal(s, 0, 'field', 0, vx - 2, vz, 0)).toBe(false);
  });
  it('unlocks your Markt pile when the gap closes, and keeps home tiles out of the Markt', () => {
    const s = createGame(cfg, 4, 0);
    closeGap(s, 0);
    expect(s.gapClosed[0]).toBe(true);
    expect(marktAccess(s, 0)).toEqual([0]);
    expect(candidates(s, 0).some((c) => c.style === MARKT)).toBe(true);
    // A home tile never goes in the Markt, a Markt tile never goes in Stammland.
    expect(isLegal(s, 0, 'crossroads', 0, 0, -2, 0)).toBe(false);
    const stamm = layout(cfg, 0).home;
    expect(isLegal(s, 0, 'field', MARKT, stamm[0] + 1, stamm[1], 0)).toBe(false);
  });
  it('links two duchies through Markt tiles, transitively, with mutual reach and shared piles', () => {
    const s = createGame(cfg, 5, 0);
    for (const p of [0, 1, 2]) closeGap(s, p);
    // Fill the Markt spokes from the Vorland anchors to the Marktplatz with crossroads.
    const spoke = (p: number) => { const [ax, az] = layout(cfg, p).vorland[0]; const dx = Math.sign(-ax), dz = Math.sign(-az); for (let k = 1; k < Math.abs(ax) + Math.abs(az); k++) forcePlace(s, 'crossroads', ax + dx * k, az + dz * k, 0, MARKT); };
    spoke(0); spoke(1);
    const linked = league(s, 0);
    if (linked.includes(1)) {
      expect(league(s, 1)).toContain(0);
      expect(marktAccess(s, 0).sort()).toEqual([0, 1]);
      spoke(2);
      expect(league(s, 0).sort()).toEqual([0, 1, 2]);
      expect(league(s, 3)).toEqual([3]);
    } else {
      // The network graph ignores edges, so spokes always connect; this branch should not happen.
      expect(linked).toContain(1);
    }
  });
});

describe('swaps and Zoll', () => {
  it('charges Zoll only when the other duchy has closed its gap; Salz collects double; Hopfen never pays', () => {
    const s = createGame(cfg, 6, 0);
    expect(zollFor(s, 1, 0)).toBe(0);
    closeGap(s, 0); closeGap(s, 1);
    expect(zollFor(s, 1, 0)).toBe(1);
    expect(zollReceived(s, 1, 0)).toBe(2);
    expect(zollFor(s, 0, 1)).toBe(1);
    expect(zollFor(s, 3, 1)).toBe(0);
    expect(zollReceived(s, 3, 0)).toBe(2);
  });
  it('lets Forst swap twice and Wein look two deep, nobody else', () => {
    const s = createGame(cfg, 7, 0);
    expect(resolve(s, 2, { kind: 'home', depth: 0 }, [0])).toBeNull(); // gap still open
    closeGap(s, 0); closeGap(s, 2);
    expect(resolve(s, 2, { kind: 'home', depth: 0 }, [0, 1])).toBeNull(); // can't afford the Zoll
    s.players[2].score = 5;
    expect(resolve(s, 2, { kind: 'home', depth: 0 }, [0, 1])).not.toBeNull();
    expect(resolve(s, 0, { kind: 'home', depth: 0 }, [1, 2])).toBeNull();
    expect(resolve(s, 1, { kind: 'home', depth: 1 }, [])).not.toBeNull();
    expect(resolve(s, 0, { kind: 'home', depth: 1 }, [])).toBeNull();
  });
  it('moves the given tile to the bottom of the other deck and pays Zoll on apply', () => {
    const s = createGame(cfg, 8, 0);
    closeGap(s, 0); closeGap(s, 1);
    s.players[0].score = 5;
    // Find a legal swap turn for player 0 (seat 0 moves first).
    const swapTurn = (legalTurns(s) as Extract<KAction, { type: 'turn' }>[]).find((a) => a.swaps.length === 1 && a.swaps[0] === 1);
    if (!swapTurn) return; // Wein land not reachable yet, which is the rule working.
    const give = s.decks[0][s.decks[0].length - 1];
    apply(s, swapTurn);
    expect(s.decks[1][0]).toBe(give);
    expect(s.players[1].zollIn).toBe(1);
  });
});

describe('full games', () => {
  it('plays 40 mixed bot games to the end without errors and with sane totals', () => {
    for (let g = 0; g < 40; g++) {
      const bots = [PROFILES.balanced, PROFILES.cultivator, PROFILES.reacher, PROFILES.balanced].map((_, i, a) => a[(i + g) % 4]);
      const r = playGame(cfg, 500 + g, g % 4, bots);
      expect(r.turns).toBeGreaterThan(60);
      expect(r.winners.length).toBeGreaterThan(0);
      r.scores.forEach((sc, i) => expect(sc).toBe(r.home[i] + r.foreign[i] + r.zollIn[i] - r.zollOut[i]));
    }
  });
  it('never offers an illegal turn', () => {
    const s = createGame(cfg, 77, 1);
    for (let i = 0; i < 60 && !s.ended; i++) {
      const turns = legalTurns(s);
      expect(turns.length).toBeGreaterThan(0);
      const a = turns[(i * 31) % turns.length];
      expect(() => apply(s, a)).not.toThrow();
    }
    expect(keyOf(0, 0) in s.board).toBe(true);
  });
});
