/**
 * Heimfall tile set: the four duchy home decks and their Markt piles.
 * Tile shapes reuse the Glockenfels edge model (town edges are Burgs, monasteries are Stifte,
 * meadows are fields). Placement is by edge shape only; style (which duchy a tile belongs to)
 * is identity, never points.
 */
import type { TileDef } from '@glockenfels/engine';
import type { QuestDef } from './quests';

export interface KTileDef extends TileDef {
  /** Road badges (waymarks) score +1 each on the road they sit on. */
  badge?: number;
}

export interface DeckEntry { tileId: string; count: number }

const t = (id: string, name: string, edges: TileDef['edges'], center: TileDef['center'] = 'none', extra: Partial<KTileDef> = {}): KTileDef =>
  ({ id, name, edges, center, ...extra });

export const K_TILES: Record<string, KTileDef> = Object.fromEntries([
  // Fixed board pieces.
  t('stammburg', 'Stammburg', ['meadow', 'road', 'meadow', 'road'], 'castle'),
  t('marktplatz', 'Marktburg', ['town', 'town', 'town', 'town'], 'maypole', { banner: 1 }),
  // Fields, roads and junctions.
  t('field', 'Open field', ['meadow', 'meadow', 'meadow', 'meadow']),
  t('road', 'Road', ['road', 'meadow', 'road', 'meadow']),
  t('road-badge', 'Waymarked road', ['road', 'meadow', 'road', 'meadow'], 'none', { badge: 1 }),
  t('road-bend', 'Road bend', ['meadow', 'meadow', 'road', 'road']),
  t('road-bend-badge', 'Waymarked bend', ['meadow', 'meadow', 'road', 'road'], 'none', { badge: 1 }),
  t('junction', 'Junction', ['meadow', 'road', 'road', 'road'], 'shrine'),
  t('crossroads', 'Crossroads', ['road', 'road', 'road', 'road'], 'shrine'),
  // Stifte.
  t('stift', 'Stift', ['meadow', 'meadow', 'meadow', 'meadow'], 'monastery'),
  t('stift-lane', 'Stift with lane', ['meadow', 'meadow', 'road', 'meadow'], 'monastery'),
  t('stift-gate', 'Stift by the Burg', ['town', 'meadow', 'road', 'meadow'], 'monastery'),
  t('stift-junction', 'Stift at the crossing', ['meadow', 'road', 'road', 'road'], 'monastery'),
  // Burgs.
  t('burg-edge', 'Burg wall', ['town', 'meadow', 'meadow', 'meadow']),
  t('burg-cap-banner', 'Burg wall with banner', ['town', 'meadow', 'meadow', 'meadow'], 'none', { banner: 1 }),
  t('burg-edge-road', 'Burg wall with road', ['town', 'road', 'meadow', 'road']),
  t('burg-edge-bend', 'Burg wall with bend', ['town', 'meadow', 'road', 'road']),
  t('burg-edge-junction', 'Burg wall at a junction', ['town', 'road', 'road', 'road'], 'shrine'),
  t('burg-corner', 'Burg corner', ['town', 'meadow', 'meadow', 'town']),
  t('burg-corner-banner', 'Burg corner with banner', ['town', 'meadow', 'meadow', 'town'], 'none', { banner: 1 }),
  t('burg-corner-road', 'Burg corner with road', ['town', 'road', 'road', 'town']),
  t('burg-street', 'Burg street', ['meadow', 'town', 'meadow', 'town']),
  t('burg-street-banner', 'Burg street with banner', ['meadow', 'town', 'meadow', 'town'], 'none', { banner: 1 }),
  t('burg-square', 'Burg square', ['town', 'town', 'meadow', 'town']),
  t('burg-square-banner', 'Burg square with banner', ['town', 'town', 'meadow', 'town'], 'none', { banner: 1 }),
  t('burg-gate', 'Burg gate', ['town', 'town', 'road', 'town']),
  t('burg-gate-banner', 'Burg gate with banner', ['town', 'town', 'road', 'town'], 'none', { banner: 1 }),
  t('burg-centre', 'Burg centre with maypole', ['town', 'town', 'town', 'town'], 'maypole', { banner: 1 }),
].map((d) => [d.id, d]));

export type DuchyId = 'salz' | 'wein' | 'forst' | 'hopfen' | 'erz' | 'tuch';

export interface DuchyDef {
  id: DuchyId;
  name: string;
  theme: string;
  /** One line of the line's story, shown on its card. */
  story: string;
  /** Three side quests: low, medium, high. */
  quests: QuestDef[];
  /** Colour used by the client for Wanderers, banners and field style. */
  colour: string;
  home: DeckEntry[];
  markt: DeckEntry[];
}

/** Every duchy. A game seats 2 to 6 of them; the first four are the default table. */
/** Every line draws from the same home deck (22 tiles) and the same Markt list (repeated to fill the pile). */
export const HOME_DECK: DeckEntry[] = [
  { tileId: 'burg-square', count: 2 }, { tileId: 'burg-gate', count: 1 },
  { tileId: 'burg-corner', count: 2 }, { tileId: 'burg-corner-road', count: 1 }, { tileId: 'burg-street', count: 1 },
  { tileId: 'burg-edge', count: 3 }, { tileId: 'burg-edge-road', count: 2 }, { tileId: 'burg-edge-bend', count: 1 },
  { tileId: 'road', count: 3 }, { tileId: 'road-bend', count: 3 }, { tileId: 'junction', count: 1 },
  { tileId: 'stift', count: 1 }, { tileId: 'field', count: 1 },
];
export const MARKT_LIST: DeckEntry[] = [
  { tileId: 'burg-corner-banner', count: 1 }, { tileId: 'burg-cap-banner', count: 1 }, { tileId: 'burg-edge-junction', count: 1 },
  { tileId: 'stift-gate', count: 1 }, { tileId: 'junction', count: 1 }, { tileId: 'burg-corner-road', count: 1 },
];

const q = (id: string, title: string, text: string, kind: QuestDef['kind'], n = 1): QuestDef => ({ id, title, text, kind, n });

export const DUCHIES: DuchyDef[] = [
  {
    id: 'salz', name: 'Salz', theme: 'Urban density', colour: '#2f74c0',
    story: 'The salt line builds walls. A town with no wall is a village.',
    quests: [
      q('salz-1', 'Stadtmauer', 'Finish a Burg of 4 or more tiles.', 'burg-size', 4),
      q('salz-2', 'Zwei Banner', 'Finish a Burg flying 2 or more banners.', 'burg-banners', 2),
      q('salz-3', 'Residenzstadt', 'Finish a Burg of 6 or more tiles.', 'burg-size', 6),
    ],
    home: HOME_DECK, markt: MARKT_LIST,
  },
  {
    id: 'wein', name: 'Wein', theme: 'Monks and contemplation', colour: '#d9482b',
    story: 'The wine line keeps the abbeys. Where a Stift stands, the line has a voice.',
    quests: [
      q('wein-1', 'Klostergarten', 'Hold a Stift with 7 of its 8 neighbours built.', 'stift-neighbours', 7),
      q('wein-2', 'Klostergründung', 'Finish a Stift.', 'stift', 1),
      q('wein-3', 'Abtei in der Fremde', 'Finish a Stift outside your own portion.', 'stift-abroad'),
    ],
    home: HOME_DECK, markt: MARKT_LIST,
  },
  {
    id: 'forst', name: 'Forst', theme: 'Traveller variety', colour: '#2e9b6b',
    story: 'The forest line keeps the roads. Whoever holds the road holds the trade.',
    quests: [
      q('forst-1', 'Landstraße', 'Finish a road of 5 or more tiles.', 'road-size', 5),
      q('forst-2', 'Fernstraße', 'Finish a road of 6 or more tiles.', 'road-size', 6),
      q('forst-3', 'Zollstraße', 'Finish a road that joins 4 Burgs.', 'road-burgs', 4),
    ],
    home: HOME_DECK, markt: MARKT_LIST,
  },
  {
    id: 'hopfen', name: 'Hopfen', theme: 'Rural peace and freedom', colour: '#f2b630',
    story: 'The hop line farms the open land between the towns.',
    quests: [
      q('hopfen-1', 'Gute Flur', 'End the game holding a field that touches 5 finished Burgs.', 'field-burgs', 5),
      q('hopfen-2', 'Reiche Flur', 'End the game holding a field that touches 8 finished Burgs.', 'field-burgs', 8),
      q('hopfen-3', 'Kornkammer', 'End the game holding a field that touches 10 finished Burgs.', 'field-burgs', 10),
    ],
    home: HOME_DECK, markt: MARKT_LIST,
  },
  {
    id: 'erz', name: 'Erz', theme: 'Miners and smiths', colour: '#8a52c4',
    story: 'The ore line digs, forges and sells it all at the Markt.',
    quests: [
      q('erz-1', 'Marktrecht', 'Place 10 Markt tiles.', 'markt-tiles', 10),
      q('erz-2', 'Residenzbau', 'Finish a Burg with 2 or more tiles in the Markt.', 'burg-markt', 2),
      q('erz-3', 'Marktherr', 'Place 15 Markt tiles.', 'markt-tiles', 15),
    ],
    home: HOME_DECK, markt: MARKT_LIST,
  },
  {
    id: 'tuch', name: 'Tuch', theme: 'Weavers and dyers', colour: '#e27fb0',
    story: 'The cloth line trades everywhere and settles wherever the trade is.',
    quests: [
      q('tuch-1', 'Niederlassung', 'Place 7 tiles on other lines\' land.', 'foreign-tiles', 7),
      q('tuch-2', 'Kontor', 'Place 11 tiles on other lines\' land.', 'foreign-tiles', 11),
      q('tuch-3', 'Tauschhandel', 'Swap 12 times.', 'swaps', 12),
    ],
    home: HOME_DECK, markt: MARKT_LIST,
  },
];

export const deckSize = (d: DeckEntry[]) => d.reduce((n, e) => n + e.count, 0);
