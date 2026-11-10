/** Every tunable number of Heimfall. The balance simulator sweeps these. */
import { DUCHIES, type DeckEntry, type DuchyDef } from './tiles';

export interface KConfig {
  /** Wanderers per player. */
  wanderers: number;
  /**
   * Turns each player gets. Taking a Markt tile then means a home tile is left undrawn, so the Markt
   * is a choice, not extra tiles. 0 plays until nobody can place.
   */
  rounds: number;
  /** Empty cells between a duchy's Stammburg and its Vorland. */
  gap: number;
  /** Half-height of the Markt around the Marktburg (1 means 3 cells deep; five or six players widen it by pairSpread on each side). */
  marktRadius: number;
  /** With five or six duchies, how far beyond the Markt's half-height the two duchies sharing a side sit from the centre (and how much wider the Markt gets). */
  pairSpread: number;
  /** Width of the Vorland band outside the Markt, in rings. */
  vorlandDepth: number;
  scoring: {
    burgPerTile: number; burgPerBanner: number; burgIncompletePerTile: number; burgIncompletePerBanner: number;
    roadPerTile: number; roadPerBadge: number;
    stiftComplete: number; stiftIncompletePerTile: number;
    fieldPerBurg: number;
    /** Extra points per Burg or road tile that lies in the Residenz land (the Markt zone). */
    residenzPerTile: number;
  };
  zoll: number;
  /**
   * The award: points from your own portion count only up to this many times your points from
   * contested land (the Markt and other lines' portions), plus the allowance. 0 turns the rule off.
   */
  awardRatio: number;
  awardAllowance: number;
  /** Zoll paid to a line for drawing from its Markt pile (not your own). */
  marktFee: number;
  /** Zoll paid to a line for building on its Vorland. */
  vorlandToll: number;
  /** Points the duke who places the linking tile pays (to nobody) for each new pact it creates. */
  pactFee: number;
  powers: {
    /** Salz collects this many times the Zoll on every swap into Salz, even from Hopfen; the payer still pays only the normal Zoll. */
    salzZollFactor: number;
    weinPeek: number;
    /** 'choose': Wein takes any of its top tiles and the rest stay. 'bury': the tiles it passes over go to the bottom. */
    weinMode: 'choose' | 'bury';
    forstSwaps: number;
    hopfenPaysZoll: boolean;
    /** Wanderers Erz starts with. */
    erzWanderers: number;
    /** Tuch may swap before closing its gap. */
    tuchEarlySwap: boolean;
  };
  swapsPerTurn: number;
  /** Who you may swap with: any duchy, or only duchies in your Markt league. */
  swapTargets: 'any' | 'league';
  /** Where the tile you give away goes in the other deck. */
  swapGivesTo: 'bottom' | 'top';
  /** Markt pile size per duchy (piles are shuffled, then cut to this size). */
  marktPile: number;
  duchies: DuchyDef[];
}

export interface KOptions extends Partial<Omit<KConfig, 'scoring' | 'powers' | 'duchies'>> {
  scoring?: Partial<KConfig['scoring']>;
  powers?: Partial<KConfig['powers']>;
  /** Which duchies play, in seat order (2 to 6). Defaults to Salz, Wein, Forst and Hopfen. */
  duchyIds?: DuchyDef['id'][];
  /** Replace a duchy's home deck or Markt pile. */
  decks?: Partial<Record<DuchyDef['id'], { home?: DeckEntry[]; markt?: DeckEntry[] }>>;
}

export const DEFAULT_CONFIG: KConfig = {
  wanderers: 7,
  rounds: 19,
  gap: 3,
  marktRadius: 1,
  vorlandDepth: 3,
  pairSpread: 1,
  scoring: {
    burgPerTile: 2, burgPerBanner: 2, burgIncompletePerTile: 1, burgIncompletePerBanner: 1,
    roadPerTile: 1, roadPerBadge: 1,
    stiftComplete: 7, stiftIncompletePerTile: 1,
    fieldPerBurg: 3,
    residenzPerTile: 1,
  },
  zoll: 1,
  awardRatio: 1,
  awardAllowance: 10,
  marktFee: 1,
  vorlandToll: 0,
  pactFee: 3,
  powers: { salzZollFactor: 2, weinPeek: 2, weinMode: 'choose', forstSwaps: 2, hopfenPaysZoll: false, erzWanderers: 10, tuchEarlySwap: true },
  swapsPerTurn: 1,
  marktPile: 6,
  swapTargets: 'any',
  swapGivesTo: 'bottom',
  duchies: DUCHIES.slice(0, 4),
};

/** The default table for each player count. */
export const defaultDuchies = (n: number): DuchyDef['id'][] => DUCHIES.slice(0, Math.max(2, Math.min(6, n))).map((d) => d.id);

export function buildConfig(o: KOptions = {}): KConfig {
  const { scoring, powers, decks, duchyIds, ...rest } = o;
  const picked = (duchyIds ?? DEFAULT_CONFIG.duchies.map((d) => d.id)).map((id) => {
    const d = DUCHIES.find((x) => x.id === id);
    if (!d) throw new Error(`Unknown duchy ${id}`);
    return d;
  });
  if (picked.length < 2 || picked.length > 6 || new Set(picked).size !== picked.length) throw new Error('Pick 2 to 6 different duchies');
  return {
    ...DEFAULT_CONFIG,
    ...rest,
    scoring: { ...DEFAULT_CONFIG.scoring, ...scoring },
    powers: { ...DEFAULT_CONFIG.powers, ...powers },
    duchies: picked.map((d) => ({ ...d, home: decks?.[d.id]?.home ?? d.home, markt: decks?.[d.id]?.markt ?? d.markt })),
  };
}
