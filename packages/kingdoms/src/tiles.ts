/**
 * Heimfall tile set: the four duchy home decks and their Markt piles.
 * Tile shapes reuse the Glockenfels edge model (town edges are Burgs, monasteries are Stifte,
 * meadows are fields). Placement is by edge shape only; style (which duchy a tile belongs to)
 * is identity, never points.
 */
import type { TileDef } from '@glockenfels/engine';

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
  power: string;
  /** Colour used by the client for Wanderers, banners and field style. */
  colour: string;
  home: DeckEntry[];
  markt: DeckEntry[];
}

/** Every duchy. A game seats 2 to 6 of them; the first four are the default table. */
export const DUCHIES: DuchyDef[] = [
  {
    id: 'salz', name: 'Salz', theme: 'Urban density', colour: '#2f74c0',
    power: 'Salzregal: collects double Zoll on every swap into Salz; the swapper pays only the normal Zoll.',
    home: [
      { tileId: 'burg-square', count: 2 }, { tileId: 'burg-square-banner', count: 1 },
      { tileId: 'burg-gate', count: 1 }, { tileId: 'burg-corner', count: 1 },
      { tileId: 'burg-corner-road', count: 1 }, { tileId: 'burg-street', count: 1 },
      { tileId: 'burg-edge', count: 4 }, { tileId: 'burg-edge-road', count: 3 },
      { tileId: 'road', count: 4 }, { tileId: 'road-bend', count: 2 },
      { tileId: 'junction', count: 1 }, { tileId: 'stift', count: 1 },
    ],
    markt: [
      { tileId: 'burg-cap-banner', count: 2 }, { tileId: 'burg-corner-banner', count: 2 },
      { tileId: 'burg-street-banner', count: 1 }, { tileId: 'burg-centre', count: 1 },
    ],
  },
  {
    id: 'wein', name: 'Wein', theme: 'Monks and contemplation', colour: '#d9482b',
    power: 'Besinnung: sees the top two tiles of its home deck and may take either.',
    home: [
      { tileId: 'stift', count: 1 }, { tileId: 'stift-lane', count: 1 },
      { tileId: 'burg-edge', count: 2 }, { tileId: 'burg-edge-road', count: 2 },
      { tileId: 'burg-corner', count: 2 }, { tileId: 'burg-street', count: 1 }, { tileId: 'burg-square', count: 2 },
      { tileId: 'road', count: 4 }, { tileId: 'road-bend', count: 5 },
      { tileId: 'junction', count: 1 }, { tileId: 'field', count: 1 },
    ],
    markt: [
      { tileId: 'stift-gate', count: 2 }, { tileId: 'stift-junction', count: 1 },
      { tileId: 'junction', count: 1 }, { tileId: 'burg-corner-road', count: 1 }, { tileId: 'burg-edge-road', count: 1 },
    ],
  },
  {
    id: 'forst', name: 'Forst', theme: 'Traveller variety', colour: '#2e9b6b',
    power: 'Waldläufer: may swap twice per turn.',
    home: [
      { tileId: 'road', count: 1 }, { tileId: 'road-badge', count: 4 },
      { tileId: 'road-bend', count: 2 }, { tileId: 'road-bend-badge', count: 3 },
      { tileId: 'burg-edge-road', count: 2 }, { tileId: 'burg-edge-bend', count: 2 },
      { tileId: 'burg-edge', count: 2 }, { tileId: 'burg-corner', count: 1 },
      { tileId: 'burg-corner-road', count: 1 }, { tileId: 'burg-square', count: 1 },
      { tileId: 'stift-lane', count: 1 }, { tileId: 'stift', count: 2 },
    ],
    markt: [
      { tileId: 'junction', count: 1 }, { tileId: 'burg-edge-junction', count: 3 }, { tileId: 'burg-corner-road', count: 2 },
    ],
  },
  {
    id: 'hopfen', name: 'Hopfen', theme: 'Rural peace and freedom', colour: '#f2b630',
    power: 'Landfrieden: pays no Zoll.',
    home: [
      { tileId: 'burg-edge', count: 3 }, { tileId: 'burg-edge-road', count: 3 },
      { tileId: 'burg-edge-bend', count: 2 }, { tileId: 'burg-corner', count: 2 },
      { tileId: 'burg-street', count: 1 }, { tileId: 'burg-square', count: 1 },
      { tileId: 'field', count: 2 }, { tileId: 'road', count: 3 }, { tileId: 'road-bend', count: 3 },
      { tileId: 'junction', count: 1 }, { tileId: 'stift', count: 1 },
    ],
    markt: [
      { tileId: 'burg-corner-road', count: 2 }, { tileId: 'burg-edge-road', count: 1 },
      { tileId: 'burg-street-banner', count: 1 }, { tileId: 'burg-gate', count: 1 }, { tileId: 'burg-edge-bend', count: 1 },
    ],
  },
  {
    id: 'erz', name: 'Erz', theme: 'Miners and smiths', colour: '#8a52c4',
    power: 'Bergleute: starts with three extra Wanderers.',
    home: [
      { tileId: 'burg-corner', count: 2 }, { tileId: 'burg-edge', count: 3 }, { tileId: 'burg-edge-road', count: 3 },
      { tileId: 'burg-square', count: 2 }, { tileId: 'burg-corner-road', count: 2 }, { tileId: 'burg-street', count: 1 },
      { tileId: 'road', count: 3 }, { tileId: 'road-bend', count: 3 }, { tileId: 'junction', count: 1 },
      { tileId: 'stift', count: 2 },
    ],
    markt: [
      { tileId: 'burg-centre', count: 1 }, { tileId: 'burg-corner-banner', count: 2 }, { tileId: 'burg-gate-banner', count: 1 },
      { tileId: 'burg-square-banner', count: 1 }, { tileId: 'stift-gate', count: 1 },
    ],
  },
  {
    id: 'tuch', name: 'Tuch', theme: 'Weavers and dyers', colour: '#e27fb0',
    power: 'Tuchhandel: may swap before closing its gap.',
    home: [
      { tileId: 'burg-edge', count: 3 }, { tileId: 'burg-edge-road', count: 2 }, { tileId: 'burg-corner', count: 2 },
      { tileId: 'burg-street-banner', count: 2 }, { tileId: 'burg-square', count: 2 },
      { tileId: 'road', count: 3 }, { tileId: 'road-bend', count: 3 }, { tileId: 'junction', count: 1 },
      { tileId: 'stift', count: 2 }, { tileId: 'stift-lane', count: 2 },
    ],
    markt: [
      { tileId: 'burg-street-banner', count: 2 }, { tileId: 'burg-corner-banner', count: 2 },
      { tileId: 'burg-square-banner', count: 1 }, { tileId: 'burg-gate-banner', count: 1 },
    ],
  },
];

export const deckSize = (d: DeckEntry[]) => d.reduce((n, e) => n + e.count, 0);
