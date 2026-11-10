/** Every tunable number of Tiny Kingdoms. The balance simulator sweeps these. */
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
  /** Half-width of the square Markt zone around the Marktburg (2 means a 5 × 5 Markt). */
  marktRadius: number;
  /** Width of the Vorland band outside the Markt, in rings. */
  vorlandDepth: number;
  scoring: {
    burgPerTile: number; burgPerBanner: number; burgIncompletePerTile: number; burgIncompletePerBanner: number;
    roadPerTile: number; roadPerBadge: number;
    stiftComplete: number; stiftIncompletePerTile: number;
    fieldPerBurg: number;
  };
  zoll: number;
  powers: {
    /** Salz collects this many times the Zoll on every swap into Salz, even from Hopfen; the payer still pays only the normal Zoll. */
    salzZollFactor: number;
    weinPeek: number;
    /** 'choose': Wein takes any of its top tiles and the rest stay. 'bury': the tiles it passes over go to the bottom. */
    weinMode: 'choose' | 'bury';
    forstSwaps: number;
    hopfenPaysZoll: boolean;
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
  /** Replace a duchy's home deck or Markt pile. */
  decks?: Partial<Record<DuchyDef['id'], { home?: DeckEntry[]; markt?: DeckEntry[] }>>;
}

export const DEFAULT_CONFIG: KConfig = {
  wanderers: 7,
  rounds: 17,
  gap: 2,
  marktRadius: 1,
  vorlandDepth: 3,
  scoring: {
    burgPerTile: 2, burgPerBanner: 2, burgIncompletePerTile: 1, burgIncompletePerBanner: 1,
    roadPerTile: 1, roadPerBadge: 1,
    stiftComplete: 7, stiftIncompletePerTile: 1,
    fieldPerBurg: 3,
  },
  zoll: 1,
  powers: { salzZollFactor: 2, weinPeek: 2, weinMode: 'choose', forstSwaps: 2, hopfenPaysZoll: false },
  swapsPerTurn: 1,
  marktPile: 6,
  swapTargets: 'any',
  swapGivesTo: 'bottom',
  duchies: DUCHIES,
};

export function buildConfig(o: KOptions = {}): KConfig {
  const { scoring, powers, decks, ...rest } = o;
  return {
    ...DEFAULT_CONFIG,
    ...rest,
    scoring: { ...DEFAULT_CONFIG.scoring, ...scoring },
    powers: { ...DEFAULT_CONFIG.powers, ...powers },
    duchies: DEFAULT_CONFIG.duchies.map((d) => ({ ...d, home: decks?.[d.id]?.home ?? d.home, markt: decks?.[d.id]?.markt ?? d.markt })),
  };
}
