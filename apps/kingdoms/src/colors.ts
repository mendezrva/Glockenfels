import { DUCHIES, type DuchyDef } from '@glockenfels/kingdoms';
import { PLAYER_COLORS } from '@gf/tiles/palette';

/** The duchies at the current table, in seat order. Set by the game session. */
let table: DuchyDef[] = DUCHIES.slice(0, 4);
export const setTable = (duchies: DuchyDef[]) => { table = duchies; };

/** Duchy colours (by seat) as strings for CSS and numbers for three.js. */
export const duchyCss = (d: number) => table[d]?.colour ?? '#888888';
export const duchyColor = (d: number) => parseInt(duchyCss(d).slice(1), 16);

/** The slot in the shared Glockenfels piece palette that matches a seat's duchy colour. */
export const pieceSlot = (d: number) => {
  const i = (PLAYER_COLORS as readonly number[]).indexOf(duchyColor(d));
  return i >= 0 ? i : d;
};
