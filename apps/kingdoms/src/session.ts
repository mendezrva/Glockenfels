/** Local game state for Heimfall: the engine state, the seat list, saving and undo. */
import { useCallback, useMemo, useRef, useState } from 'react';
import { apply, buildConfig, createGame, replay, type DuchyId, type KAction, type KEvent, type KState } from '@glockenfels/kingdoms';
import { setTable } from './colors';

export interface Seat { name: string; bot: boolean }
export interface SavedKingdoms {
  v: 1; seed: number; first: number; seats: Seat[]; log: KAction[];
  /** Duchies in seat order; older saves are the original four. */
  duchies?: DuchyId[];
}

const SAVE_KEY = 'glockenfels.kingdoms.save.v5';

export function loadSave(): SavedKingdoms | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const s = raw ? (JSON.parse(raw) as SavedKingdoms) : null;
    return s && s.v === 1 ? s : null;
  } catch { return null; }
}
export function writeSave(s: SavedKingdoms | null) {
  try { if (s) localStorage.setItem(SAVE_KEY, JSON.stringify(s)); else localStorage.removeItem(SAVE_KEY); } catch { /* private mode */ }
}

export interface Batch { n: number; events: KEvent[]; player: number }

export function useKingdoms(saved: SavedKingdoms) {
  const cfg = useMemo(() => buildConfig({ duchyIds: saved.duchies }), []); // eslint-disable-line react-hooks/exhaustive-deps
  setTable(cfg.duchies);
  const ref = useRef<KState | null>(null);
  if (!ref.current) ref.current = replay(cfg, saved.seed, saved.first, saved.log);
  const [version, setVersion] = useState(0);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dispatch = useCallback((a: KAction) => {
    const s = ref.current!;
    const player = s.order[s.seat];
    try {
      apply(s, a);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setBatch({ n: Date.now(), events: s.events.slice(), player });
    setVersion((v) => v + 1);
    // A finished game is not offered for resuming.
    writeSave(s.ended ? null : { ...saved, log: s.log.slice() });
  }, [saved]);

  /** Takes back the last human move (and any bot moves after it). */
  const undo = useCallback((isBot: (p: number) => boolean) => {
    const s = ref.current!;
    const log = s.log.slice();
    const fresh = () => createGame(cfg, saved.seed, saved.first);
    // Walk back to the most recent action made by a human seat.
    let cut = log.length;
    const players: number[] = [];
    const probe = fresh();
    for (const a of log) { players.push(probe.order[probe.seat]); apply(probe, a); }
    while (cut > 0 && isBot(players[cut - 1])) cut--;
    if (cut === 0) return;
    cut--;
    ref.current = replay(cfg, saved.seed, saved.first, log.slice(0, cut));
    writeSave({ ...saved, log: ref.current.log.slice() });
    setBatch(null);
    setVersion((v) => v + 1);
  }, [cfg, saved]);

  return { state: ref.current, version, batch, error, clearError: () => setError(null), dispatch, undo, seats: saved.seats, seed: saved.seed };
}

export type KingdomsController = ReturnType<typeof useKingdoms>;
