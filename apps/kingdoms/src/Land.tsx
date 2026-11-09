/**
 * Kingdom overlays for the 3D board: a band in the duchy's colour around every tile's slab (its
 * field style), faint duchy ground under empty cells, the gold Markt square, and the gap to close.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TILE } from '@gf/tiles/buildTile';
import { keyOf, layout, sectorOf, zoneOf, type KState, MARKT } from '@glockenfels/kingdoms';
import { duchyColor } from './colors';

const W = TILE * 0.985;
/** A thin frame just under the grass rim: four boxes merged into one. */
const bandGeometry = (() => {
  const t = 0.07, h = 0.11;
  const parts = [
    new THREE.BoxGeometry(W + t, h, t).translate(0, 0, -W / 2),
    new THREE.BoxGeometry(W + t, h, t).translate(0, 0, W / 2),
    new THREE.BoxGeometry(t, h, W + t).translate(-W / 2, 0, 0),
    new THREE.BoxGeometry(t, h, W + t).translate(W / 2, 0, 0),
  ];
  const g = new THREE.BufferGeometry();
  const pos: number[] = [], nor: number[] = [], idx: number[] = [];
  let off = 0;
  for (const p of parts) {
    const pa = p.attributes.position, na = p.attributes.normal, ia = p.index!;
    for (let i = 0; i < pa.count; i++) { pos.push(pa.getX(i), pa.getY(i), pa.getZ(i)); nor.push(na.getX(i), na.getY(i), na.getZ(i)); }
    for (let i = 0; i < ia.count; i++) idx.push(ia.getX(i) + off);
    off += pa.count;
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
})();
const bandMats = new Map<number, THREE.Material>();
const bandMat = (style: number) => {
  let m = bandMats.get(style);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: style === MARKT ? 0xe0b84a : duchyColor(style), roughness: 0.6, metalness: 0.05, flatShading: true });
    bandMats.set(style, m);
  }
  return m;
};

/** Field-style bands, one per placed tile. Hidden while the tile is still dropping in. */
export function StyleBands({ s, version }: { s: KState; version: number }) {
  const tiles = useMemo(() => Object.values(s.board), [s, version]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group>
      {tiles.map((t) => (
        <mesh key={t.key} geometry={bandGeometry} material={bandMat(t.style)} position={[t.x * TILE, -0.09, t.z * TILE]} />
      ))}
    </group>
  );
}

const cellGeometry = new THREE.PlaneGeometry(TILE * 0.94, TILE * 0.94).rotateX(-Math.PI / 2);

/** Faint ground in each duchy's colour under empty cells, the Markt in gold, and the gap. */
export function Territory({ s, version, player, radius = 11 }: { s: KState; version: number; player: number | null; radius?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const cells = useMemo(() => {
    const out: { x: number; z: number; color: THREE.Color }[] = [];
    const gap = new Set<string>();
    if (player !== null && !s.gapClosed[player]) for (const [x, z] of layout(s.cfg, player).gapCells) gap.add(keyOf(x, z));
    for (let x = -radius; x <= radius; x++) for (let z = -radius; z <= radius; z++) {
      if (s.board[keyOf(x, z)]) continue;
      const zone = zoneOf(s.cfg, x, z);
      const sec = sectorOf(s.cfg, x, z);
      const c = new THREE.Color(zone === 'markt' ? 0xe0b84a : duchyColor(sec));
      const base = new THREE.Color(0xdde9f3);
      const k = gap.has(keyOf(x, z)) ? 0.75 : zone === 'markt' ? 0.55 : zone === 'vorland' ? 0.32 : 0.18;
      out.push({ x, z, color: base.lerp(c, k) });
    }
    return out;
  }, [s, version, player, radius]); // eslint-disable-line react-hooks/exhaustive-deps
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false }), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    cells.forEach((c, i) => {
      o.position.set(c.x * TILE, -0.9, c.z * TILE);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.color);
    });
    m.count = cells.length;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [cells]);
  return <instancedMesh key={cells.length > 0 ? 'on' : 'off'} ref={ref} args={[cellGeometry, mat, Math.max(1, (2 * radius + 1) ** 2)]} frustumCulled={false} />;
}

/** A soft pulse over the empty gap cells of the player to move, so the goal is easy to see. */
export function GapPulse({ s, player }: { s: KState; player: number | null }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false }), []);
  useFrame(({ clock }) => { mat.opacity = 0.15 + 0.15 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 2)); });
  if (player === null || s.gapClosed[player]) return null;
  const cells = layout(s.cfg, player).gapCells.filter(([x, z]) => !s.board[keyOf(x, z)]);
  return (
    <group>
      {cells.map(([x, z]) => <mesh key={`${x},${z}`} geometry={cellGeometry} material={mat} position={[x * TILE, -0.85, z * TILE]} />)}
    </group>
  );
}
