'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  EDIT_FLAG,
  EMPTY_LAYOUT,
  ElStyle,
  Layout,
  PlanetTweak,
  StyleKey,
  ZONE_KEYS,
  ZoneKey,
  clearLayout,
  defaultModesRect,
  exportSnippet,
  loadLayout,
  saveLayout,
  styleFx,
} from './layout';
import type { ModeId, Rect, Theme } from './themes';

const r1 = (v: number) => Math.round(v * 10) / 10;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const DEFAULT_TWEAK: PlanetTweak = { dx: 0, dy: 0, scale: 1, labelScale: 1, showLabel: true };

// Sélection : une zone, le bandeau du profil, ou une icône de mode ("planet:classique")
export type Selection = StyleKey | `planet:${ModeId}` | null;

export function useLayout(theme: Theme, stageRef: React.RefObject<HTMLElement>) {
  const [layout, setLayout] = useState<Layout>(EMPTY_LAYOUT);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Selection>(null);
  const [linked, setLinked] = useState(true); // un écran entraîne son petit afficheur

  // Chargement de la disposition du thème courant
  useEffect(() => {
    setLayout(loadLayout(theme.id));
    setSelected(null);
  }, [theme.id]);

  // Ouverture directe en mode disposition depuis Paramétrage
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(EDIT_FLAG)) {
        window.sessionStorage.removeItem(EDIT_FLAG);
        setEditing(true);
      }
    } catch {
      // ignoré
    }
  }, []);

  const commit = useCallback(
    (fn: (l: Layout) => Layout) =>
      setLayout((prev) => {
        const next = fn(prev);
        saveLayout(theme.id, next);
        return next;
      }),
    [theme.id],
  );

  // Zones effectives = réglages du thème + modifications de l'utilisateur
  const zones: Theme['zones'] & { modes: Rect } = {
    ...theme.zones,
    ...layout.zones,
    modes: layout.zones.modes ?? (theme.zones as { modes?: Rect }).modes ?? defaultModesRect(theme.zones.hub),
    profile: layout.profile ?? theme.zones.profile,
  };

  const setZone = (k: ZoneKey, rect: Rect) => commit((l) => ({ ...l, zones: { ...l.zones, [k]: rect } }));
  const setProfile = (pos: { left: number; top: number }) => commit((l) => ({ ...l, profile: pos }));
  const setPlanet = (id: ModeId, patch: Partial<PlanetTweak>) =>
    commit((l) => ({ ...l, planets: { ...l.planets, [id]: { ...DEFAULT_TWEAK, ...l.planets[id], ...patch } } }));
  const setStyle = (k: StyleKey, patch: Partial<ElStyle>) =>
    commit((l) => {
      const merged: ElStyle = { ...l.styles[k], ...patch };
      (Object.keys(merged) as (keyof ElStyle)[]).forEach((key) => (merged[key] === undefined || merged[key] === false) && delete merged[key]);
      const styles = { ...l.styles };
      if (Object.keys(merged).length) styles[k] = merged;
      else delete styles[k];
      return { ...l, styles };
    });

  const resetSelected = () => {
    if (!selected) return;
    commit((l) => {
      if (selected.startsWith('planet:')) {
        const planets = { ...l.planets };
        delete planets[selected.slice(7) as ModeId];
        return { ...l, planets };
      }
      const zonesNext = { ...l.zones };
      const styles = { ...l.styles };
      delete styles[selected as StyleKey];
      if (selected === 'teams') delete styles.teamRows;
      let profile = l.profile;
      if (selected === 'profile') profile = undefined;
      else delete zonesNext[selected as ZoneKey];
      return { ...l, zones: zonesNext, styles, profile };
    });
  };
  const resetAll = () => {
    clearLayout(theme.id);
    setLayout(EMPTY_LAYOUT);
    setSelected(null);
  };

  // Suivi d'un glisser : appelle onMove avec le déplacement depuis le départ, en % de la scène et en cqw
  const track = (e: React.PointerEvent, onMove: (dxPct: number, dyPct: number, dxCqw: number, dyCqw: number) => void) => {
    const st = stageRef.current?.getBoundingClientRect();
    if (!st) return;
    e.preventDefault();
    e.stopPropagation();
    const x0 = e.clientX;
    const y0 = e.clientY;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0;
      const dy = ev.clientY - y0;
      onMove((dx / st.width) * 100, (dy / st.height) * 100, dx / (st.width / 100), dy / (st.width / 100));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const LINK: Partial<Record<ZoneKey, ZoneKey>> = { teams: 'teamCount', join: 'code' };

  const beginMove = (e: React.PointerEvent, k: ZoneKey) => {
    setSelected(k);
    const start = zones[k];
    const lk = linked ? LINK[k] : undefined;
    const startLinked = lk ? zones[lk] : undefined;
    track(e, (dx, dy) => {
      setZone(k, { ...start, left: r1(clamp(start.left + dx, -10, 100 - 2)), top: r1(clamp(start.top + dy, -10, 100 - 2)) });
      if (lk && startLinked) setZone(lk, { ...startLinked, left: r1(clamp(startLinked.left + dx, -10, 98)), top: r1(clamp(startLinked.top + dy, -10, 98)) });
    });
  };
  const beginResize = (e: React.PointerEvent, k: ZoneKey) => {
    setSelected(k);
    const start = zones[k];
    track(e, (dx, dy) => setZone(k, { ...start, width: r1(clamp(start.width + dx, 3, 100)), height: r1(clamp(start.height + dy, 2, 100)) }));
  };
  const beginProfileMove = (e: React.PointerEvent) => {
    setSelected('profile');
    const start = zones.profile;
    track(e, (dx, dy) => setProfile({ left: r1(clamp(start.left + dx, 0, 100)), top: r1(clamp(start.top + dy, -5, 98)) }));
  };
  const beginPlanetMove = (e: React.PointerEvent, id: ModeId) => {
    setSelected(`planet:${id}`);
    const start = { ...DEFAULT_TWEAK, ...layout.planets[id] };
    track(e, (_a, _b, dxc, dyc) => setPlanet(id, { dx: r1(start.dx + dxc), dy: r1(start.dy + dyc) }));
  };

  // Enveloppe d'une icône de mode : décalage + taille (+ poignée de glisser en mode disposition)
  const planetProps = (id: ModeId) => {
    const t = { ...DEFAULT_TWEAK, ...layout.planets[id] };
    const sel = editing && selected === `planet:${id}`;
    const style: React.CSSProperties = {
      transform: `translate(${t.dx}cqw, ${t.dy}cqw)`,
      position: 'relative',
      ...(editing ? { cursor: 'move', touchAction: 'none', zIndex: 210, outline: sel ? '2px solid #38d9ff' : '1.5px dashed rgba(56,217,255,.85)', outlineOffset: 3, borderRadius: 6 } : {}),
    };
    return {
      className: editing ? 'ck-edit-planet' : undefined,
      style,
      onPointerDown: editing ? (e: React.PointerEvent) => beginPlanetMove(e, id) : undefined,
    };
  };

  const planetTweak = (id: ModeId) => ({ ...DEFAULT_TWEAK, ...layout.planets[id] }) as Required<PlanetTweak>;
  const fx = (k: StyleKey) => styleFx(layout.styles[k]);
  const snippet = () => exportSnippet(theme, zones, layout);

  return {
    zones, layout, fx, planetProps, planetTweak, snippet,
    editing, setEditing, selected, setSelected, linked, setLinked,
    setZone, setProfile, setPlanet, setStyle, resetSelected, resetAll,
    beginMove, beginResize, beginProfileMove,
    ZONE_KEYS,
  };
}

export type LayoutApi = ReturnType<typeof useLayout>;
