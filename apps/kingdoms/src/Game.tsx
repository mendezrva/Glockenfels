/**
 * Heimfall pass-and-play: the 3D board (reusing the Glockenfels tiles and scene), duchy
 * territory, and a touch-first turn dock: pick a pile, optionally swap, tap a spot, turn, choose a
 * Wanderer, confirm.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { analyze, type GameState } from '@glockenfels/engine';
import {
  canSwap, candidates, chooseTurn, current, K_TILES, league, layout, marktAccess, placementsFor, preview, PROFILES,
  resolve, swapsAllowed, zollFor, type KEvent, type KState, type Source,
} from '@glockenfels/kingdoms';
import { TILE } from '@gf/tiles/buildTile';
import { PALETTE } from '@gf/tiles/palette';
import { Clouds, Lights, Mountains } from '@gf/scene/World';
import { Confetti } from '@gf/scene/Confetti';
import { BoardTiles, ClaimSpots, FeatureIcon, GhostTile, Popups, SpotMarkers, Wanderers, type PieceItem, type Popup } from '@gf/scene/GameBoard';
import { boundsOf, declineQuality, defaultQuality, Effects, reducedMotion, type Quality } from '@gf/scene/Stage';
import { headingFor, MapCamera, TILT_DEFAULT, TILT_MAX, TILT_MIN, type Recenter } from './MapCamera';
import { builtTile, featureSpots } from '@gf/game/tiles3d';
import { TileCard } from '@gf/ui/TileCard';
import { Toggle } from '@gf/ui/Overlay';
import { GapPulse, StyleBands, Territory } from './Land';
import { duchyColor, duchyCss, pieceSlot } from './colors';
import type { KingdomsController } from './session';

const TILT_KEY = 'glockenfels.kingdoms.tilt';
const loadTilt = () => { try { const v = Number(localStorage.getItem(TILT_KEY)); return Number.isFinite(v) && localStorage.getItem(TILT_KEY) !== null ? v : TILT_DEFAULT; } catch { return TILT_DEFAULT; } };
const saveTilt = (v: number) => { try { localStorage.setItem(TILT_KEY, String(v)); } catch { /* private mode */ } };
const KIND: Record<string, string> = { town: 'Burg', road: 'Road', monastery: 'Stift', meadow: 'Field' };
const buzz = (ms = 12) => { try { navigator.vibrate?.(ms); } catch { /* not supported */ } };
const sameSource = (a: Source | null, b: Source | null) => !!a && !!b && JSON.stringify(a) === JSON.stringify(b);

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

interface Toast { id: number; text: string }

export function Game({ game, onQuit }: { game: KingdomsController; onQuit: () => void }) {
  const { state: s, version, batch, error, clearError, dispatch, seats } = game;
  const p = current(s);
  const duchy = s.cfg.duchies[p];
  const humans = seats.filter((x) => !x.bot).length;
  const isHuman = !seats[p].bot && !s.ended;
  const color = duchyColor(p);
  const nameOf = (q: number) => `${seats[q].name}`;
  const rounds = s.cfg.rounds;
  const round = Math.min(rounds, Math.ceil(s.turn / s.players.length));

  // ---------- view ----------
  const [quality, setQuality] = useState<Quality>(defaultQuality);
  const [tilt, setTiltState] = useState(loadTilt);
  const setTilt = (v: number) => { setTiltState(v); saveTilt(v); };
  const [recenter, setRecenter] = useState<Recenter>({ mode: 'board', n: 0 });
  const go = (mode: Recenter['mode']) => setRecenter({ mode, n: Date.now() });
  const compass = useRef<HTMLButtonElement>(null);
  const firstHuman = Math.max(0, seats.findIndex((x) => !x.bot));
  const startHeading = useMemo(() => (seats.some((x) => !x.bot) ? headingFor(firstHuman) : 0), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [focus, setFocus] = useState<{ x: number; z: number; n: number } | null>(null);
  const [menu, setMenu] = useState(false);
  const [help, setHelp] = useState(false);
  const [terrain, setTerrain] = useState(true);
  const onDecline = useCallback(() => setQuality((q) => declineQuality(q).q), []);

  const tiles = useMemo(() => Object.values(s.board).sort((a, b) => a.order - b.order)
    .map((t) => ({ key: t.key, x: t.x, z: t.z, def: K_TILES[t.tileId], rot: t.rot, falls: [] as number[] })), [s, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const pieces = useMemo(() => {
    const out: PieceItem[] = [];
    for (const f of s.features) {
      if (s.parent[f.id] !== f.id) continue;
      for (const pc of f.pieces) {
        const t = s.board[pc.tileKey];
        const def = K_TILES[t.tileId];
        const spot = featureSpots(def, t.rot, builtTile(def, t.rot, t.x, t.z))[pc.local];
        out.push({ id: `${pc.tileKey}:${pc.local}`, player: pieceSlot(pc.player), grand: false, x: t.x * TILE + spot[0], z: t.z * TILE + spot[1] });
      }
    }
    return out;
  }, [s, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const bounds = useMemo(() => boundsOf(tiles), [tiles]);

  // ---------- turn selections ----------
  const [source, setSource] = useState<Source | null>(null);
  const [swaps, setSwaps] = useState<number[]>([]);
  const [spot, setSpot] = useState<[number, number] | null>(null);
  const [rot, setRot] = useState(0);
  const [claim, setClaim] = useState<number | null>(null);
  const [curtain, setCurtain] = useState<number | null>(null);
  const [showEnd, setShowEnd] = useState(false);
  useEffect(() => { setSource(null); setSwaps([]); setSpot(null); setClaim(null); }, [s.turn, version]);

  const cands = useMemo(() => (isHuman ? candidates(s, p) : []), [s, version, isHuman]); // eslint-disable-line react-hooks/exhaustive-deps
  const playable = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const c of cands) m.set(JSON.stringify([c.source, c.swaps]), placementsFor(s, p, c.tileId, c.style).length > 0);
    return m;
  }, [cands]); // eslint-disable-line react-hooks/exhaustive-deps
  const canUse = (src: Source, sw: number[]) => playable.get(JSON.stringify([src, sw])) ?? false;
  const baseUsable = (src: Source) => cands.some((c) => sameSource(c.source, src) && canUse(c.source, c.swaps));

  // Piles this turn: home (Wein sees two), reserve, reachable Markt piles.
  const piles = useMemo(() => {
    const out: { src: Source; label: string; tileId: string }[] = [];
    const seen = new Set<string>();
    for (const c of cands) {
      if (c.swaps.length) continue;
      const k = JSON.stringify(c.source);
      if (seen.has(k)) continue;
      seen.add(k);
      const label = c.source.kind === 'home' ? (c.source.depth ? 'Home, 2nd' : 'Home deck')
        : c.source.kind === 'reserve' ? 'Reserve' : `Markt · ${s.cfg.duchies[c.source.duchy].name}`;
      out.push({ src: c.source, label, tileId: c.tileId });
    }
    return out;
  }, [cands]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pick the first usable pile automatically so a turn starts with a tile in hand.
  useEffect(() => {
    if (!isHuman || source || curtain !== null) return;
    const first = piles.find((x) => baseUsable(x.src));
    if (first) {
      const plain = canUse(first.src, []);
      setSource(first.src);
      if (!plain) {
        const sw = cands.find((c) => sameSource(c.source, first.src) && canUse(c.source, c.swaps));
        if (sw) setSwaps(sw.swaps);
      }
    }
  }, [piles, isHuman, source, curtain]); // eslint-disable-line react-hooks/exhaustive-deps

  const cand = source ? resolve(s, p, source, swaps) : null;
  const def = cand ? K_TILES[cand.tileId] : null;
  const fits = useMemo(() => {
    const m = new Map<string, number[]>();
    if (!cand) return m;
    for (const pl of placementsFor(s, p, cand.tileId, cand.style)) {
      const k = `${pl.x},${pl.z}`;
      m.set(k, [...(m.get(k) ?? []), pl.rot]);
    }
    const d = K_TILES[cand.tileId];
    for (const [k, rots] of m) {
      const ok = new Set(rots.map((r) => analyze(d, r).edges.join()));
      m.set(k, [0, 1, 2, 3].filter((r) => ok.has(analyze(d, r).edges.join())));
    }
    return m;
  }, [s, version, cand?.tileId, cand?.style]); // eslint-disable-line react-hooks/exhaustive-deps
  const cells = useMemo(() => [...fits.keys()].map((k) => k.split(',').map(Number) as [number, number]), [fits]);
  useEffect(() => { setSpot(null); setClaim(null); }, [cand?.tileId, cand?.style]);
  const keepVisible = useMemo(
    () => (isHuman && cells.length ? { points: cells.map(([x, z]) => [x * TILE, z * TILE] as [number, number]), n: Date.now() } : null),
    [cells, isHuman], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const pickSpot = (x: number, z: number) => {
    const rots = fits.get(`${x},${z}`);
    if (!rots) return;
    if (spot && spot[0] === x && spot[1] === z) { turnTile(); return; }
    buzz(8);
    setSpot([x, z]);
    setClaim(null);
    setRot(rots.includes(rot) ? rot : rots[0]);
  };
  const spotWays = spot ? (fits.get(`${spot[0]},${spot[1]}`) ?? []).length : 0;
  const turnTile = () => {
    if (!spot) { setRot((r) => (r + 1) % 4); return; }
    const rots = fits.get(`${spot[0]},${spot[1]}`) ?? [];
    setRot(rots[(rots.indexOf(rot) + 1) % rots.length]);
    setClaim(null);
  };

  // Claim options on the hovering tile (features that would still be free once it joins its neighbours).
  const claimOptions = useMemo(() => {
    if (!spot || !cand || s.players[p].wanderers <= 0) return [];
    const pv = preview(s, cand.tileId, spot[0], spot[1], rot);
    const a = analyze(K_TILES[cand.tileId], rot);
    const seen = new Set<string>();
    const opts: { local: number; kind: string; label: string }[] = [];
    pv.forEach((f, i) => {
      if (f.pieces.length) return;
      const key = f.roots.length ? `${f.kind}:${[...f.roots].sort().join('.')}` : `l${i}`;
      if (seen.has(key)) return;
      seen.add(key);
      opts.push({ local: i, kind: a.features[i].kind, label: KIND[a.features[i].kind] + (f.complete ? ' (scores now)' : '') });
    });
    const count = new Map<string, number>();
    for (const o of opts) count.set(o.kind, (count.get(o.kind) ?? 0) + 1);
    const n = new Map<string, number>();
    return opts.map((o) => {
      if ((count.get(o.kind) ?? 0) < 2) return o;
      const k = (n.get(o.kind) ?? 0) + 1; n.set(o.kind, k);
      return { ...o, label: `${KIND[o.kind]} ${k}${o.label.endsWith('(scores now)') ? ' (scores now)' : ''}` };
    });
  }, [spot, rot, cand?.tileId, s, version]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirm = () => {
    if (!spot || !source || !cand) return;
    buzz(15);
    dispatch({ type: 'turn', source, swaps, x: spot[0], z: spot[1], rot, claim });
  };

  // Shims so the Glockenfels ghost and claim components can read a Kingdoms board.
  const ghostShim = useMemo(() => ({ board: {} }) as unknown as GameState, []);
  const claimShim = useMemo(() => {
    if (!spot || !cand) return null;
    const key = `${spot[0]},${spot[1]}`;
    return { lastPlaced: key, board: { [key]: { x: spot[0], z: spot[1], tileId: cand.tileId, rot } }, config: { tiles: K_TILES } } as unknown as GameState;
  }, [spot, rot, cand?.tileId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- events ----------
  const [popups, setPopups] = useState<Popup[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [bounce, setBounce] = useState<{ keys: string[]; n: number } | null>(null);
  const [party, setParty] = useState<{ x: number; z: number; n: number } | null>(null);
  const fx = useRef(0);
  const toast = useCallback((text: string) => {
    const id = ++fx.current;
    setToasts((t) => [...t.slice(-2), { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);
  useEffect(() => {
    if (!batch) return;
    const add: Popup[] = [];
    for (const e of batch.events as KEvent[]) {
      switch (e.type) {
        case 'placed': { const t = s.board[e.tileKey]; if (t && !s.ended) setFocus({ x: t.x * TILE, z: t.z * TILE, n: Date.now() }); break; }
        case 'scored': {
          if (!e.points) break;
          const ts = e.tiles.map((k) => s.board[k]).filter(Boolean);
          const cx = (ts.reduce((a, t) => a + t.x, 0) / ts.length) * TILE, cz = (ts.reduce((a, t) => a + t.z, 0) / ts.length) * TILE;
          add.push({ id: ++fx.current, x: cx, z: cz, player: pieceSlot(e.players[0]), big: e.complete && e.points >= 8,
            text: `+${e.points}${e.players.length > 1 ? ' each' : ''}`, sub: `${KIND[e.kind]}${e.complete ? ' complete' : ''} · ${e.players.map(nameOf).join(' & ')}` });
          if (e.complete) { setBounce({ keys: e.tiles, n: Date.now() }); if (e.kind === 'town' && !reducedMotion) setParty({ x: cx, z: cz, n: Date.now() }); }
          break;
        }
        case 'gapClosed': toast(`${nameOf(e.player)} (${s.cfg.duchies[e.player].name}) closed the gap. Their Markt pile is open`); break;
        case 'linked': toast(`Markt league: ${e.players.map((q) => s.cfg.duchies[q].name).join(' and ')} are linked`); break;
        case 'swap': toast(`${nameOf(e.player)} swapped with ${s.cfg.duchies[e.with].name}${e.zoll ? ` and paid ${e.zoll} Zoll` : ''}`); break;
        case 'reserved': if (e.player === batch.player || !seats[e.player].bot) toast(`${s.cfg.duchies[e.player].name}'s top tile fits nowhere, so it went to the reserve`); break;
        case 'dead': toast(`A ${s.cfg.duchies[e.player].name} tile fit nowhere and was lost`); break;
        case 'passed': toast(`${nameOf(e.player)} had no tile to place`); break;
        case 'ended': setTimeout(() => setShowEnd(true), 1600); break;
      }
    }
    add.forEach((pp, i) => setTimeout(() => {
      setPopups((o) => [...o, pp]);
      setTimeout(() => setPopups((o) => o.filter((x) => x.id !== pp.id)), 1900);
    }, i * (s.ended ? 140 : 250)));
  }, [batch]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (error) { toast(error); clearError(); } }, [error]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (s.ended) setShowEnd(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- pass and play, bots ----------
  const lastTurnOf = useRef<number | null>(null);
  useEffect(() => {
    if (s.ended || lastTurnOf.current === p) return;
    const prev = lastTurnOf.current;
    lastTurnOf.current = p;
    if (!seats[p].bot && humans > 1 && prev !== null) setCurtain(p);
  }, [p, s.turn]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (s.ended || !seats[p].bot || curtain !== null) return;
    const t = setTimeout(() => dispatch(chooseTurn(s, PROFILES.balanced, rng(game.seed + s.log.length))), humans ? 900 : 450);
    return () => clearTimeout(t);
  }, [version, curtain]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isHuman || curtain !== null) return;
      if (e.key === 'r' || e.key === 'R' || e.key === ' ') { e.preventDefault(); turnTile(); }
      if (e.key === 'Enter' && spot) confirm();
      if (e.key === 'Escape') { setSpot(null); setClaim(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  (window as unknown as { __kingdoms?: unknown }).__kingdoms = { s, dispatch, cells, pickSpot, confirm };

  const hidden = curtain !== null;
  const myLeague = league(s, p);
  const access = marktAccess(s, p);
  const canSwapNow = isHuman && source && source.kind !== 'markt' && canSwap(s, p) && swaps.length < swapsAllowed(s, p);

  // ---------- dock ----------
  let dock: JSX.Element;
  if (s.ended) {
    dock = (
      <div className="dock-row">
        <p className="hint"><b>Game over.</b> {s.winners?.map(nameOf).join(' & ')} {s.winners && s.winners.length > 1 ? 'share the win' : 'wins'}.</p>
        <button type="button" className="primary" onClick={() => setShowEnd(true)}>Results</button>
      </div>
    );
  } else if (!isHuman) {
    dock = <div className="dock-row"><p className="hint"><span className="dot" style={{ background: duchyCss(p) }} /> <b>{nameOf(p)}</b>&nbsp;({duchy.name}) is thinking…</p></div>;
  } else {
    const pileCaption = (src: Source) => src.kind === 'home' ? (src.depth ? '2nd' : 'Home') : src.kind === 'reserve' ? 'Reserve' : s.cfg.duchies[src.duchy].name;
    dock = (
      <div className="k-bar">
        <div className="k-cards hand" role="group" aria-label="Pick a tile">
          {piles.map((x) => {
            const on = sameSource(source, x.src);
            const ok = baseUsable(x.src);
            const markt = x.src.kind === 'markt';
            return (
              <div key={JSON.stringify(x.src)} className={`k-pile${on ? ' on' : ''}${ok ? '' : ' off'}${markt ? ' markt' : ''}`}>
                <TileCard def={K_TILES[x.tileId]} rot={on && !swaps.length ? rot : 0} selected={on}
                  onClick={ok ? () => { buzz(8); if (on && !swaps.length) turnTile(); else { setSource(x.src); setSwaps(canUse(x.src, []) ? [] : (cands.find((c) => sameSource(c.source, x.src) && canUse(c.source, c.swaps))?.swaps ?? [])); } } : undefined}
                  label={`${x.label}: ${K_TILES[x.tileId].name}${ok ? '' : ' (fits nowhere)'}`} />
                <small>{markt && <span className="dot" style={{ background: 'var(--gold)' }} />}{pileCaption(x.src)}</small>
              </div>
            );
          })}
          {(canSwapNow || swaps.length > 0) && <span className="k-sep" aria-hidden="true">⇄</span>}
          {canSwapNow && s.players.map((_, q) => {
            if (q === p || !source) return null;
            const next = [...swaps, q];
            const c = resolve(s, p, source, next);
            if (!c) return null;
            const ok = canUse(source, next);
            const z = zollFor(s, p, q);
            return (
              <div key={q} className={`k-pile${ok ? '' : ' off'}`} style={{ '--pc': duchyCss(q) } as React.CSSProperties}>
                <TileCard def={K_TILES[c.tileId]} onClick={ok ? () => { buzz(8); setSwaps(next); } : undefined} label={`Swap for ${s.cfg.duchies[q].name}'s ${K_TILES[c.tileId].name}${z ? `, ${z} Zoll` : ''}`} />
                <small><span className="dot" />{s.cfg.duchies[q].name}{z ? ` −${z}` : ''}</small>
              </div>
            );
          })}
          {swaps.length > 0 && cand && (
            <div className="k-pile on" style={{ '--pc': duchyCss(swaps[swaps.length - 1]) } as React.CSSProperties}>
              <TileCard def={K_TILES[cand.tileId]} rot={rot} selected onClick={() => { buzz(8); turnTile(); }} label={`In hand after swapping: ${K_TILES[cand.tileId].name}. Tap to turn it`} />
              <small><span className="dot" />In hand</small>
            </div>
          )}
        </div>
        {spot && claimOptions.length > 0 && (
          <div className="claim-opts k-claims" role="group" aria-label="Wanderer">
            <button type="button" className="claim-opt" aria-pressed={claim === null} onClick={() => setClaim(null)}>None</button>
            {claimOptions.map((o) => (
              <button key={o.local} type="button" className="claim-opt" aria-pressed={claim === o.local} onClick={() => { buzz(8); setClaim(o.local); }}>
                <FeatureIcon kind={o.kind} />{o.label}
              </button>
            ))}
          </div>
        )}
        <div className="k-actions">
          {swaps.length > 0 && <button type="button" className="k-undo" aria-label="Undo swap" title="Undo swap" onClick={() => setSwaps([])}>↶</button>}
          <button type="button" className="k-turn" onClick={turnTile} disabled={!!spot && spotWays < 2} aria-label="Turn tile" title="Turn tile (R)">⟳</button>
          <button type="button" className="primary" disabled={!spot} onClick={confirm}>{!cand ? 'No tile' : spot ? (claim === null ? 'Place' : 'Place + Wanderer') : 'Tap a spot'}</button>
        </div>
      </div>
    );
  }

  const standings = s.players.map((pl, i) => ({ ...pl, i })).sort((a, b) => b.score - a.score);
  const homeCell = layout(s.cfg, p).home;
  const landRadius = Math.max(...s.players.map((_, i) => { const [hx, hz] = layout(s.cfg, i).home; return Math.max(Math.abs(hx), Math.abs(hz)); })) + 4;

  return (
    <div className={`app game kingdoms${s.players.length > 4 ? ' many' : ''}`}>
      <Canvas
        className="scene" shadows={quality.shadows ? 'soft' : false} dpr={quality.dpr} flat
        gl={{ antialias: !(quality.ao || quality.tiltShift), powerPreference: 'high-performance' }}
        camera={{ fov: 38, near: 0.1, far: 260, position: [26, 24, 26] }}
        onCreated={({ scene }) => { scene.background = new THREE.Color(PALETTE.sky); scene.fog = new THREE.Fog(PALETTE.sky, 50, 120); }}
      >
        <PerformanceMonitor onDecline={onDecline} flipflops={6} />
        <Suspense fallback={null}>
          <Lights extent={bounds.extent + 4} shadows={quality.shadows} />
          <Mountains />
          {tilt >= 15 && <Clouds extent={bounds.extent + 4} />}
          {terrain && <Territory s={s} version={version} player={isHuman ? p : null} radius={landRadius} />}
          {isHuman && !hidden && <GapPulse s={s} player={p} />}
          <BoardTiles tiles={tiles} bounce={bounce} shadows={quality.shadows} />
          <StyleBands s={s} version={version} />
          <Wanderers pieces={pieces} shadows={quality.shadows} />
          {isHuman && !hidden && def && (
            <>
              <SpotMarkers cells={cells} selected={spot} color={color} onPick={pickSpot} />
              {spot && <GhostTile def={def} rot={rot} x={spot[0]} z={spot[1]} s={ghostShim} onTap={turnTile} color={color} ways={spotWays} onConfirm={confirm} onCancel={cells.length > 1 ? () => setSpot(null) : undefined} />}
              {spot && claimShim && claimOptions.length === 1 && (
                <ClaimSpots s={claimShim} options={claimOptions} selected={claim} color={color} player={pieceSlot(p)} onPick={(l) => setClaim(claim === l ? null : l)} />
              )}
            </>
          )}
          <Confetti at={party} />
          <Popups items={popups} />
          <MapCamera tilt={tilt} recenter={recenter} bounds={bounds} heading={isHuman ? headingFor(p) : startHeading} home={{ x: homeCell[0] * TILE * 0.55, z: homeCell[1] * TILE * 0.55 }}
            focus={focus} keepVisible={curtain === null ? keepVisible : null} compass={compass} />
          <Effects quality={quality} />
        </Suspense>
      </Canvas>

      <header className="topbar game-top">
        <div className="players" role="list" aria-label="Duchies">
          {s.players.map((pl, i) => (
            <div key={i} role="listitem" className={`player${i === p && !s.ended ? ' current' : ''}`} style={{ '--pc': duchyCss(i) } as React.CSSProperties}>
              <span className="pname">{s.cfg.duchies[i].name}{seats[i].bot && <em> bot</em>}</span>
              <span className="pscore">{pl.score}</span>
              <span className="pmeta">
                <span className="pieces"><i style={{ background: duchyCss(i) }} />{pl.wanderers}</span>
                <span title={s.gapClosed[i] ? 'Gap closed' : 'Gap open'}>{s.gapClosed[i] ? '⛓ open' : '◌ gap'}</span>
                <span title="Home tiles left">▦{s.decks[i].length}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="top-right">
          <span className="chip" title="Round"><span className="k-round-word">Round&nbsp;</span>{Math.max(1, round)}/{rounds}</span>
          <button type="button" className="icon" aria-label="How to play" onClick={() => setHelp(true)}>?</button>
          <button type="button" className="icon" aria-expanded={menu} aria-label="Menu" onClick={() => setMenu(!menu)}>☰</button>
        </div>
      </header>

      {isHuman && !hidden && (
        <div className="k-status" style={{ '--pc': duchyCss(p) } as React.CSSProperties}>
          <b>{nameOf(p)} · {duchy.name}</b>
          <span>{s.gapClosed[p]
            ? `Markt: ${access.map((q) => s.cfg.duchies[q].name).join(', ') || 'none'}${myLeague.length > 1 ? ' · linked' : ''}`
            : 'Close your gap (pulsing cells)'}</span>
        </div>
      )}

      <div className="toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}</div>

      {menu && (
        <div className="panel menu" role="dialog" aria-label="Menu">
          <label className="k-slider" htmlFor="k-tilt-angle">
            <span>Viewing angle <em>{tilt === 0 ? 'straight down' : `${tilt}° from above`}</em></span>
            <input id="k-tilt-angle" type="range" min={TILT_MIN} max={TILT_MAX} step={5} value={tilt} onChange={(e) => setTilt(Number(e.target.value))} />
          </label>
          <Toggle id="k-terrain" label="Show duchy lands" checked={terrain} onChange={setTerrain} />
          <Toggle id="k-shadows" label="Shadows" checked={quality.shadows} onChange={(v) => setQuality({ ...quality, shadows: v })} />
          <Toggle id="k-tilt" label="Tilt-shift blur" checked={quality.tiltShift} onChange={(v) => setQuality({ ...quality, tiltShift: v, auto: false })} />
          <div className="panel-row">
            <button type="button" onClick={() => { game.undo((q) => seats[q].bot); setMenu(false); }}>↶ Undo my last move</button>
            <button type="button" onClick={onQuit}>Save and quit</button>
            <button type="button" className="primary" onClick={() => setMenu(false)}>Close</button>
          </div>
        </div>
      )}

      <nav className="dock game-dock" aria-label="Your turn">
        <div className="k-nav">
          <button type="button" onClick={() => go('board')}>Whole board</button>
          {isHuman && <button type="button" onClick={() => go('home')}>My land</button>}
          <button type="button" ref={compass} className="k-compass" aria-label="Turn north up" title="North up" onClick={() => go('north')}><span>N</span></button>
        </div>
        {!hidden && <div className="turn-panel" style={{ '--pc': duchyCss(p) } as React.CSSProperties}>{dock}</div>}
      </nav>

      {curtain !== null && (
        <div className="curtain" style={{ '--pc': duchyCss(curtain) } as React.CSSProperties}>
          <div className="curtain-card">
            <span className="big-dot" />
            <h2>Pass to {nameOf(curtain)}</h2>
            <p>{s.cfg.duchies[curtain].name}: {s.cfg.duchies[curtain].theme.toLowerCase()}.</p>
            <button type="button" className="primary" onClick={() => setCurtain(null)}>I’m {nameOf(curtain)}</button>
          </div>
        </div>
      )}

      {help && <HelpCard onClose={() => setHelp(false)} s={s} />}

      {showEnd && s.ended && (
        <div className="curtain soft">
          <div className="curtain-card results">
            <h2>{s.winners && s.winners.length > 1 ? 'A shared win!' : `${nameOf(s.winners?.[0] ?? 0)} wins!`}</h2>
            <ol>
              {standings.map((pl, i) => (
                <li key={pl.i} style={{ '--pc': duchyCss(pl.i) } as React.CSSProperties}>
                  <span className="rank">{s.winners?.includes(pl.i) ? '👑' : i + 1}</span>
                  <span className="dot" />
                  <span className="pname">{nameOf(pl.i)} <em>{s.cfg.duchies[pl.i].name}</em></span>
                  <small className="k-split">home {pl.homePts} · abroad {pl.foreignPts} · Zoll {pl.zollIn - pl.zollOut >= 0 ? '+' : ''}{pl.zollIn - pl.zollOut}</small>
                  <b>{pl.score}</b>
                </li>
              ))}
            </ol>
            <p className="note">{Object.keys(s.board).length} tiles on the board · {s.links.length} Markt links</p>
            <div className="panel-row">
              <button type="button" onClick={() => { setShowEnd(false); go('board'); }}>See the board</button>
              <button type="button" className="primary" onClick={onQuit}>New game</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HelpCard({ onClose, s }: { onClose: () => void; s: KState }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="curtain soft" onClick={onClose}>
      <div className="curtain-card rules" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="k-close" aria-label="Close" onClick={onClose}>✕</button>
        <h2>Heimfall</h2>
        <p className="k-lore">The Duke is dead without a son, and his land falls home to his cousins. The board is his duchy. The castle in the centre is his empty Residenz. The Emperor forbids a feud and will confirm what each line holds after {s.cfg.rounds} seasons.</p>
        <ul>
          <li><b>Pick a pile.</b> <span>Your home deck, your reserve, or any Markt pile you can reach. The top tile is face up.</span></li>
          <li><b>Close your gap.</b> <span>Build from your Stammburg to your Vorland by the Markt. That opens your Markt pile and lets you swap.</span></li>
          <li><b>Link through the Markt.</b> <span>Markt tiles join Vorlands. Linked duchies build on each other's Vorland and share Markt piles. Links chain into one league.</span></li>
          <li><b>Swap.</b> <span>Trade your tile for another duchy's top tile, then play it on your land or theirs. Pay {s.cfg.zoll} Zoll if that duchy has closed its gap.</span></li>
          <li><b>Score.</b> <span>Burg 2 a tile (+2 a banner), road 1 a tile (+1 a waymark), Stift {s.cfg.scoring.stiftComplete}, fields {s.cfg.scoring.fieldPerBurg} for each finished Burg. {s.cfg.rounds} rounds.</span></li>
        </ul>
        <ul>
          {s.cfg.duchies.map((d, i) => <li key={d.id} style={{ '--pc': duchyCss(i) } as React.CSSProperties}><b><span className="dot" /> {d.name}</b> <span>{d.theme}. {d.power}</span></li>)}
        </ul>
        <button type="button" className="primary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

