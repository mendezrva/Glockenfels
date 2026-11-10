/**
 * Headless balance simulator. Usage:
 *   npm run sim -w packages/kingdoms -- [games] [--json] [--opt key=value ...]
 * Runs three experiments: all-balanced seat fairness (duchies rotate through every seat), a mixed
 * table (1 cultivator, 1 reacher, the rest balanced, rotated over every duchy), and cultivators
 * versus reachers head to head. `players=6` or `duchyIds=salz,wein,erz` picks the table.
 */
import { chooseTurn, PROFILES, type BotProfile } from './bots';
import { buildConfig, defaultDuchies, type KConfig, type KOptions } from './config';
import { apply, createGame, type KState } from './game';
import { DUCHIES, type DuchyId } from './tiles';

export interface GameResult {
  winners: number[]; scores: number[]; profiles: string[]; names: string[];
  home: number[]; foreign: number[]; zollIn: number[]; zollOut: number[];
  gapTurn: (number | null)[]; linkTurn: (number | null)[]; swaps: number[]; markt: number[]; foreignPlaced: number[];
  dead: number; placed: number; turns: number;
  byKind: Record<string, number>[];
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function playGame(cfg: KConfig, seed: number, first: number, bots: BotProfile[]): GameResult {
  const s: KState = createGame(cfg, seed, first);
  const r = rng(seed * 7919 + 13);
  const before = Object.keys(s.board).length;
  let turns = 0;
  while (!s.ended && turns < 400) {
    const p = s.order[s.seat];
    const a = chooseTurn(s, bots[p], r);
    if (a.type === 'pass') break;
    apply(s, a);
    turns++;
  }
  const P = s.players;
  return {
    winners: s.winners ?? [], scores: P.map((p) => p.score), profiles: bots.map((b) => b.name), names: cfg.duchies.map((d) => d.name),
    home: P.map((p) => p.homePts), foreign: P.map((p) => p.foreignPts), zollIn: P.map((p) => p.zollIn), zollOut: P.map((p) => p.zollOut),
    gapTurn: P.map((p) => p.gapClosedTurn), linkTurn: P.map((p) => p.firstLinkTurn), swaps: P.map((p) => p.swaps),
    markt: P.map((p) => p.marktPlaced), foreignPlaced: P.map((p) => p.foreignPlaced),
    byKind: P.map((p) => ({ ...p.byKind })),
    dead: s.dead, placed: Object.keys(s.board).length - before, turns,
  };
}

const pct = (a: number, b: number) => (b ? (100 * a) / b : 0);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export interface Report {
  games: number;
  duchyWin: Record<string, number>;
  duchyScore: Record<string, number>;
  /** Wins by seat (position at the table), with every duchy rotated through every seat. */
  seatWin: Record<string, number>;
  profileWinPerSeat: Record<string, number>;
  headToHead: { cultivator: number; reacher: number };
  homeShare: number;
  deadRate: number;
  gapClosedRate: number;
  gapTurnAvg: number;
  linkedRate: number;
  everyoneLinkedRate: number;
  swapsPerGame: number;
  marktPerGame: number;
  zollPerGame: number;
  avgScore: number;
  duchyKinds: Record<string, Record<string, number>>;
  scoreSpread: number;
}

/** Splits shared wins evenly so rates sum to 100. */
function credit(res: GameResult[], key: (r: GameResult, i: number) => string) {
  const out: Record<string, number> = {};
  const seats: Record<string, number> = {};
  for (const r of res) {
    r.scores.forEach((_, i) => { const k = key(r, i); seats[k] = (seats[k] ?? 0) + 1; out[k] ??= 0; });
    for (const w of r.winners) out[key(r, w)] += 1 / r.winners.length;
  }
  return { wins: out, seats };
}

export function runReport(cfg: KConfig, games: number, seed0 = 1): Report {
  const n = cfg.duchies.length;
  const names = cfg.duchies.map((d) => d.name);
  // 1. Seat fairness: everyone balanced, first player rotates, and the duchies rotate through the seats.
  const rotated = Array.from({ length: n }, (_, k) => ({ ...cfg, duchies: cfg.duchies.map((_, i) => cfg.duchies[(i + k) % n]) }));
  const fair: GameResult[] = [];
  for (let g = 0; g < games; g++) fair.push(playGame(rotated[Math.floor(g / n) % n], seed0 + g, g % n, Array(n).fill(PROFILES.balanced)));
  // 2. Mixed table: each duchy cycles through cultivator, reacher, balanced, balanced.
  const mixed: GameResult[] = [];
  const pattern = [PROFILES.cultivator, PROFILES.reacher, ...Array(Math.max(0, n - 2)).fill(PROFILES.balanced)];
  for (let g = 0; g < games; g++) {
    const shift = g % n;
    mixed.push(playGame(cfg, 100000 + seed0 + g, Math.floor(g / n) % n, cfg.duchies.map((_, i) => pattern[(i + shift) % n])));
  }
  // 3. Head to head: two cultivators against two reachers, alternating seats.
  const h2h: GameResult[] = [];
  for (let g = 0; g < Math.max(4, games); g++) {
    const flip = g % 2;
    h2h.push(playGame(cfg, 200000 + seed0 + g, g % n, cfg.duchies.map((_, i) => ((i + flip) % 2 ? PROFILES.reacher : PROFILES.cultivator))));
  }
  const dw = credit(fair, (r, i) => r.names[i]);
  const sw = credit(fair, (_, i) => `seat ${i + 1}`);
  const pw = credit(mixed, (r, i) => r.profiles[i]);
  const hw = credit(h2h, (r, i) => r.profiles[i]);
  const all = [...fair, ...mixed];
  const homePts = mean(fair.map((r) => r.home.reduce((a, b) => a + b, 0)));
  const forPts = mean(fair.map((r) => r.foreign.reduce((a, b) => a + b, 0)));
  const placed = all.reduce((a, r) => a + r.placed, 0);
  const dead = all.reduce((a, r) => a + r.dead, 0);
  const seats = fair.length * n;
  const gapTurns = fair.flatMap((r) => r.gapTurn.filter((t): t is number => t !== null));
  return {
    games,
    duchyWin: Object.fromEntries(names.map((k) => [k, +pct(dw.wins[k], fair.length).toFixed(1)])),
    duchyScore: Object.fromEntries(names.map((k) => [k, +mean(fair.map((r) => r.scores[r.names.indexOf(k)])).toFixed(1)])),
    seatWin: Object.fromEntries(Object.keys(sw.wins).map((k) => [k, +pct(sw.wins[k], fair.length).toFixed(1)])),
    profileWinPerSeat: Object.fromEntries(Object.keys(pw.wins).map((k) => [k, +pct(pw.wins[k], pw.seats[k]).toFixed(1)])),
    headToHead: { cultivator: +pct(hw.wins.cultivator ?? 0, h2h.length).toFixed(1), reacher: +pct(hw.wins.reacher ?? 0, h2h.length).toFixed(1) },
    homeShare: +pct(homePts, homePts + forPts).toFixed(1),
    deadRate: +pct(dead, dead + placed).toFixed(2),
    gapClosedRate: +pct(gapTurns.length, seats).toFixed(1),
    gapTurnAvg: +(mean(gapTurns) / n).toFixed(1),
    linkedRate: +pct(fair.reduce((a, r) => a + r.linkTurn.filter((t) => t !== null).length, 0), seats).toFixed(1),
    everyoneLinkedRate: +pct(fair.filter((r) => r.linkTurn.every((t) => t !== null)).length, fair.length).toFixed(1),
    swapsPerGame: +mean(fair.map((r) => r.swaps.reduce((a, b) => a + b, 0))).toFixed(1),
    marktPerGame: +mean(fair.map((r) => r.markt.reduce((a, b) => a + b, 0))).toFixed(1),
    zollPerGame: +mean(fair.map((r) => r.zollIn.reduce((a, b) => a + b, 0))).toFixed(1),
    duchyKinds: Object.fromEntries(names.map((k) => [k, Object.fromEntries(['town', 'road', 'monastery', 'meadow'].map((kind) => [kind, +mean(fair.map((r) => r.byKind[r.names.indexOf(k)][kind])).toFixed(1)]))])),
    avgScore: +mean(fair.flatMap((r) => r.scores)).toFixed(1),
    scoreSpread: +mean(fair.map((r) => Math.max(...r.scores) - Math.min(...r.scores))).toFixed(1),
  };
}

function parseOpts(args: string[]): KOptions {
  const o: Record<string, unknown> = {};
  for (const a of args) {
    const [k, v] = a.split('=');
    if (k.startsWith('deck.')) {
      // deck.<duchy>.<home|markt>.<tileId>=<count>
      const [, duchy, which, tileId] = k.split('.') as [string, DuchyId, 'home' | 'markt', string];
      const decks = (o.decks ??= {}) as NonNullable<KOptions['decks']>;
      const base = DUCHIES.find((d) => d.id === duchy)!;
      const entry = (decks[duchy] ??= {});
      const list = (entry[which] ??= base[which].map((e) => ({ ...e })));
      const hit = list.find((e) => e.tileId === tileId);
      if (hit) hit.count = Number(v); else list.push({ tileId, count: Number(v) });
      continue;
    }
    if (k === 'players') { o.duchyIds = defaultDuchies(Number(v)); continue; }
    if (k === 'duchyIds') { o.duchyIds = v.split(','); continue; }
    const path = k.split('.');
    let t = o as Record<string, unknown>;
    for (const seg of path.slice(0, -1)) t = (t[seg] ??= {}) as Record<string, unknown>;
    t[path[path.length - 1]] = v === 'true' ? true : v === 'false' ? false : isNaN(Number(v)) ? v : Number(v);
  }
  return o as KOptions;
}

if (process.argv[1]?.endsWith('sim.ts')) {
  const args = process.argv.slice(2);
  const games = Number(args.find((a) => /^\d+$/.test(a)) ?? 200);
  const opts = parseOpts(args.filter((a) => a.includes('=')));
  const t0 = Date.now();
  const rep = runReport(buildConfig(opts), games);
  if (args.includes('--json')) console.log(JSON.stringify(rep));
  else console.log(rep, `\n${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
