/**
 * Map-style camera for Tiny Kingdoms. Touch works like a maps app: one finger drags the board,
 * two fingers pinch to zoom, drag to pan and twist to turn. The viewing angle (how far the camera
 * leans from straight down) is not a gesture; it comes from settings and stays put while you move.
 * On a desktop the left button drags, the right button turns and the wheel zooms.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import type { Bounds } from '@gf/scene/Stage';

/** Smallest polar angle: a hair off vertical, so the heading stays defined when looking straight down. */
const TOP = 0.0001;
/** A twist has to pass this angle before the map starts turning, so a plain pinch never turns it. */
const TWIST_START = 0.18;

export const TILT_MIN = 0;
export const TILT_MAX = 70;
export const TILT_DEFAULT = 45;
export const tiltRad = (deg: number) => Math.max(TOP, (Math.min(TILT_MAX, Math.max(TILT_MIN, deg)) * Math.PI) / 180);

/** Heading (azimuth) that puts duchy d's home at the bottom of the screen with the Markt above it. */
export const headingFor = (d: number) => Math.PI - (d * Math.PI) / 2;

export type Recenter = { mode: 'board' | 'home' | 'north'; n: number };

export function MapCamera({ tilt, recenter, bounds, home, heading, focus, keepVisible, minDistance = 8, compass }: {
  /** Viewing angle in degrees from straight down. */
  tilt: number;
  /** Bump to frame the whole board, the current player's land, or turn north up. */
  recenter: Recenter;
  bounds: Bounds;
  /** World point between the current player's home and the Markt. */
  home: { x: number; z: number };
  /** Heading used by the first frame and by "My land". */
  heading: number;
  focus: { x: number; z: number; n: number } | null;
  keepVisible?: { points: [number, number][]; n: number } | null;
  minDistance?: number;
  /** Element turned to show where north is. */
  compass?: React.RefObject<HTMLElement>;
}) {
  const ref = useRef<CameraControls>(null);
  const first = useRef(true);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const polar = tiltRad(tilt);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const A = CameraControlsImpl.ACTION;
    c.touches.one = A.TOUCH_TRUCK;
    c.touches.two = A.TOUCH_DOLLY_TRUCK;
    c.touches.three = A.TOUCH_TRUCK;
    c.mouseButtons.left = A.TRUCK;
    c.mouseButtons.middle = A.NONE;
    c.mouseButtons.right = A.ROTATE;
    c.mouseButtons.wheel = A.DOLLY;
    c.dollyToCursor = true;
    c.smoothTime = 0.3;
    c.azimuthRotateSpeed = 0.6;
    (window as unknown as { __camera?: CameraControls }).__camera = c;
  }, []);

  // Two-finger twist turns the map around the point between the fingers' midpoint and the target.
  useEffect(() => {
    const el = gl.domElement;
    let last: number | null = null;
    let total = 0;
    let turning = false;
    const angle = (t: TouchList) => Math.atan2(t[1].clientY - t[0].clientY, t[1].clientX - t[0].clientX);
    const start = (e: TouchEvent) => {
      if (e.touches.length === 2) { last = angle(e.touches); total = 0; turning = false; } else last = null;
    };
    const move = (e: TouchEvent) => {
      if (last === null || e.touches.length !== 2) return;
      const a = angle(e.touches);
      let d = a - last;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      last = a;
      total += d;
      if (!turning && Math.abs(total) < TWIST_START) return;
      if (!turning) { turning = true; d = total; }
      ref.current?.rotate(d, 0, false);
    };
    const end = (e: TouchEvent) => { if (e.touches.length < 2) last = null; else start(e); };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: true });
    el.addEventListener('touchend', end, { passive: true });
    el.addEventListener('touchcancel', end, { passive: true });
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, [gl]);

  const boardDistance = () => Math.max(minDistance, bounds.extent * 2.3) * Math.max(1, 0.95 / aspect);

  // The viewing angle from settings: lock the polar angle there.
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.minPolarAngle = 0;
    c.maxPolarAngle = Math.PI / 2;
    c.rotatePolarTo(polar, !first.current);
    c.minPolarAngle = polar;
    c.maxPolarAngle = polar;
  }, [polar]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const animate = !first.current;
    if (first.current) {
      first.current = false;
      c.setTarget(bounds.cx, 0, bounds.cz, false);
      c.rotateTo(heading, polar, false);
      c.dollyTo(boardDistance(), false);
      return;
    }
    if (recenter.mode === 'north') { c.rotateAzimuthTo(0, true); return; }
    if (recenter.mode === 'board') {
      c.setTarget(bounds.cx, 0, bounds.cz, animate);
      c.dollyTo(boardDistance(), animate);
    } else {
      c.setTarget(home.x, 0, home.z, animate);
      c.rotateAzimuthTo(nearestAngle(c.azimuthAngle, heading), animate);
      c.dollyTo(Math.max(minDistance, 14) * Math.max(1, 0.95 / aspect), animate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenter.n]);

  useEffect(() => {
    if (focus) ref.current?.moveTo(focus.x, 0, focus.z, true);
  }, [focus]);

  useEffect(() => {
    const c = ref.current;
    if (!c || !keepVisible || !keepVisible.points.length) return;
    const timer = setTimeout(() => fit(c, keepVisible.points), 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keepVisible]);

  useFrame(() => {
    const el = compass?.current;
    if (el && ref.current) el.style.setProperty('--heading', `${ref.current.azimuthAngle}rad`);
  });

  /** Brings every point on screen (above the dock, below the score bar) without changing heading or angle. */
  function fit(c: CameraControls, points: [number, number][]) {
    camera.updateMatrixWorld();
    const fits = (cam: THREE.Camera) => points.every(([x, z]) => {
      const v = new THREE.Vector3(x, 0, z).project(cam);
      return Math.abs(v.x) < 0.86 && v.y < 0.6 && v.y > -0.35 && v.z < 1;
    });
    if (fits(camera)) return;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of points) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    const target = new THREE.Vector3((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
    const dir = camera.position.clone().sub(c.getTarget(new THREE.Vector3())).normalize();
    const probe = camera.clone();
    let d = minDistance * 0.8;
    for (; d < 70; d *= 1.08) {
      probe.position.copy(target).addScaledVector(dir, d);
      probe.up.copy(camera.up);
      probe.quaternion.copy(camera.quaternion);
      probe.updateMatrixWorld();
      if (fits(probe)) break;
    }
    c.moveTo(target.x, target.y, target.z, true);
    c.dollyTo(Math.max(d, c.distance), true);
  }

  return <CameraControls ref={ref} makeDefault minDistance={3} maxDistance={80} minPolarAngle={polar} maxPolarAngle={polar} />;
}

/** The angle equal to `to` (mod 2π) closest to `from`, so the camera turns the short way. */
function nearestAngle(from: number, to: number) {
  const tau = Math.PI * 2;
  return to + Math.round((from - to) / tau) * tau;
}
