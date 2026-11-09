import { DUCHIES } from '@glockenfels/kingdoms';

/** Duchy colours as numbers for three.js and strings for CSS. */
export const duchyCss = (d: number) => DUCHIES[d]?.colour ?? '#888888';
export const duchyColor = (d: number) => parseInt(duchyCss(d).slice(1), 16);

/** The shared Glockenfels piece palette is blue, red, gold, green; duchies are blue, red, green, gold. */
export const pieceSlot = (d: number) => [0, 1, 3, 2][d] ?? d;
