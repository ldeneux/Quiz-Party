'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CHIP_LABELS, ELEMENT_LABELS, MODE_LABELS, StyleKey, ZONE_KEYS } from '@/lib/layout';
import type { LayoutApi } from '@/lib/useLayout';
import type { ModeId, Theme } from '@/lib/themes';

const CYAN = '#38d9ff';

// ─────────── Cadres de réglage, posés par-dessus la scène (à rendre DANS la scène) ───────────
export function LayoutOverlays({ L, theme }: { L: LayoutApi; theme: Theme }) {
  if (!L.editing) return null;
  const chip = (selected: boolean): React.CSSProperties => ({
    position: 'absolute', top: 2, left: 2, padding: '2px 7px', borderRadius: 6, fontSize: 11, fontWeight: 800,
    background: selected ? CYAN : 'rgba(10,20,40,.88)', color: selected ? '#06202b' : '#bfefff', border: `1px solid ${CYAN}`,
    cursor: 'grab', pointerEvents: 'auto', whiteSpace: 'nowrap', zIndex: 2, touchAction: 'none',
  } as React.CSSProperties);

  // Taille approximative du bandeau du profil (même calcul que CockpitPlate : hauteur 5,5 cqw × échelle)
  const pf = theme.plates.profil;
  const pfH = 5.5 * (pf.scale ?? 1);
  const pfW = pfH * pf.ratio;

  return (
    <>
      {ZONE_KEYS.map((k) => {
        const r = L.zones[k];
        const sel = L.selected === k;
        // Les icônes de modes laissent passer les clics : chacune se déplace individuellement dans la zone
        const pass = k === 'modes';
        return (
          <div
            key={k}
            onPointerDown={pass ? undefined : (e) => L.beginMove(e, k)}
            style={{
              position: 'absolute', left: `${r.left}%`, top: `${r.top}%`, width: `${r.width}%`, height: `${r.height}%`,
              boxSizing: 'border-box', zIndex: pass ? 205 : 200, cursor: pass ? 'default' : 'move', touchAction: 'none',
              pointerEvents: pass ? 'none' : 'auto',
              outline: sel ? `2px solid ${CYAN}` : `1.5px dashed ${CYAN}cc`,
              background: sel ? 'rgba(56,217,255,.14)' : 'rgba(56,217,255,.05)',
            }}
          >
            <div onPointerDown={(e) => L.beginMove(e, k)} onClick={() => L.setSelected(k)} style={chip(sel)}>⠿ {CHIP_LABELS[k]}</div>
            <div
              onPointerDown={(e) => L.beginResize(e, k)}
              title="Redimensionner"
              style={{ position: 'absolute', right: -1, bottom: -1, width: 16, height: 16, background: CYAN, cursor: 'nwse-resize', pointerEvents: 'auto', borderRadius: '4px 0 0 0', touchAction: 'none', zIndex: 2 }}
            />
          </div>
        );
      })}

      {/* Bandeau du profil : déplacement seul */}
      <div
        onPointerDown={(e) => L.beginProfileMove(e)}
        style={{
          position: 'absolute', left: `${L.zones.profile.left}%`, top: `${L.zones.profile.top}%`, transform: 'translateX(-50%)',
          width: `${pfW}cqw`, height: `${pfH * theme.stage.ratio}%`, boxSizing: 'border-box', zIndex: 206, cursor: 'move', touchAction: 'none',
          outline: L.selected === 'profile' ? `2px solid ${CYAN}` : `1.5px dashed ${CYAN}cc`,
          background: L.selected === 'profile' ? 'rgba(56,217,255,.14)' : 'rgba(56,217,255,.05)',
        }}
      >
        <div style={chip(L.selected === 'profile')}>⠿ {CHIP_LABELS.profile}</div>
      </div>
    </>
  );
}

// ─────────── Panneaux flottants (à rendre HORS de la scène) ───────────
const panelBase: React.CSSProperties = {
  position: 'fixed', zIndex: 1000, background: 'rgba(8,16,34,.94)', color: '#e8f4ff', border: `1px solid ${CYAN}88`,
  borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,.5)', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13,
};
const btn: React.CSSProperties = { background: '#16345a', color: '#e8f4ff', border: `1px solid ${CYAN}66`, borderRadius: 8, padding: '5px 9px', cursor: 'pointer', fontSize: 12, fontWeight: 700 };
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginTop: 9 };
const lab: React.CSSProperties = { width: 78, flexShrink: 0 };

// Panneau déplaçable (par sa barre de titre) et réductible ; sa position est mémorisée.
function Floating({ id, title, initial, width, children }: { id: string; title: string; initial: React.CSSProperties; width: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const storeKey = `quiz-party-editor-panel-${id}`;
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storeKey);
      if (raw) {
        const p = JSON.parse(raw);
        setPos({ left: Math.min(Math.max(0, p.left), window.innerWidth - 120), top: Math.min(Math.max(0, p.top), window.innerHeight - 50) });
        if (p.collapsed) setCollapsed(true);
      }
    } catch { /* ignoré */ }
  }, [storeKey]);

  const persist = (p: { left: number; top: number } | null, c: boolean) => {
    try { window.localStorage.setItem(storeKey, JSON.stringify({ ...(p ?? {}), collapsed: c })); } catch { /* ignoré */ }
  };

  const startDrag = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    e.preventDefault();
    const r = el.getBoundingClientRect();
    const ox = e.clientX - r.left;
    const oy = e.clientY - r.top;
    let last = { left: r.left, top: r.top };
    setPos(last);
    const move = (ev: PointerEvent) => {
      last = { left: Math.min(Math.max(0, ev.clientX - ox), window.innerWidth - 120), top: Math.min(Math.max(0, ev.clientY - oy), window.innerHeight - 40) };
      setPos(last);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      persist(last, collapsed);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const place: React.CSSProperties = pos ? { left: pos.left, top: pos.top, right: 'auto', bottom: 'auto', transform: 'none' } : initial;
  return (
    <div ref={ref} style={{ ...panelBase, width, maxHeight: 'calc(100vh - 20px)', overflowY: 'auto', ...place }}>
      <div onPointerDown={startDrag} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px', cursor: 'grab', touchAction: 'none', borderBottom: collapsed ? 'none' : `1px solid ${CYAN}33` }}>
        <strong style={{ color: CYAN }}>⠿ {title}</strong>
        <button
          style={{ ...btn, padding: '2px 8px' }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => { setCollapsed((c) => { persist(pos, !c); return !c; }); }}
          title={collapsed ? 'Déplier' : 'Réduire'}
        >
          {collapsed ? '▸' : '▾'}
        </button>
      </div>
      {!collapsed && <div style={{ padding: '4px 12px 12px' }}>{children}</div>}
    </div>
  );
}

// Réglages de police, fond et bordure d'un élément
function StyleControls({ L, k, title }: { L: LayoutApi; k: StyleKey; title?: string }) {
  const st = L.layout.styles[k] ?? {};
  return (
    <div>
      {title && <div style={{ fontWeight: 800, color: CYAN, marginTop: 14 }}>{title}</div>}
      <div style={row}>
        <span style={lab}>Police</span>
        <input type="color" value={st.color ?? '#ffffff'} onChange={(e) => L.setStyle(k, { color: e.target.value })} />
        <button style={btn} onClick={() => L.setStyle(k, { color: undefined })}>défaut</button>
      </div>
      <div style={row}>
        <span style={lab}>Fond</span>
        <input type="color" value={st.bg ?? '#000000'} onChange={(e) => L.setStyle(k, { bg: e.target.value, bgNone: undefined })} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!st.bgNone} onChange={(e) => L.setStyle(k, { bgNone: e.target.checked })} /> transparent
        </label>
        <button style={btn} onClick={() => L.setStyle(k, { bg: undefined, bgOpacity: undefined, bgNone: undefined })}>défaut</button>
      </div>
      <div style={{ ...row, opacity: st.bgNone ? 0.4 : 1 }}>
        <span style={lab}>Opacité</span>
        <input type="range" min={0} max={100} disabled={!!st.bgNone} value={Math.round((st.bgOpacity ?? 0.85) * 100)} style={{ flex: 1 }}
          onChange={(e) => L.setStyle(k, { bg: st.bg ?? '#000000', bgOpacity: Number(e.target.value) / 100 })} />
      </div>
      <div style={row}>
        <span style={lab}>Bordure</span>
        <input type="color" value={st.borderColor ?? '#ffffff'} onChange={(e) => L.setStyle(k, { borderColor: e.target.value, borderNone: undefined })} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!st.borderNone} onChange={(e) => L.setStyle(k, { borderNone: e.target.checked })} /> aucune
        </label>
        <button style={btn} onClick={() => L.setStyle(k, { borderColor: undefined, borderWidth: undefined, borderNone: undefined })}>défaut</button>
      </div>
      <div style={{ ...row, opacity: st.borderNone ? 0.4 : 1 }}>
        <span style={lab}>Épaisseur</span>
        <input type="range" min={0} max={8} step={0.5} disabled={!!st.borderNone} value={st.borderWidth ?? 1} style={{ flex: 1 }}
          onChange={(e) => L.setStyle(k, { borderWidth: Number(e.target.value), borderColor: st.borderColor ?? '#ffffff' })} />
        <span style={{ width: 28, textAlign: 'right' }}>{st.borderWidth ?? 1}</span>
      </div>
    </div>
  );
}

export function LayoutPanels({ L, theme }: { L: LayoutApi; theme: Theme }) {
  useEffect(() => {
    if (!L.editing) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && L.setEditing(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [L.editing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!L.editing) {
    return (
      <button onClick={() => L.setEditing(true)} title="Modifier la disposition de l'écran" style={{ ...btn, ...panelBase, padding: '6px 10px', bottom: 10, right: 10, opacity: 0.28 }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')} onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.28')}>
        🎛 Disposition
      </button>
    );
  }

  const copy = async () => {
    const text = L.snippet();
    try {
      await navigator.clipboard.writeText(text);
      alert('Configuration copiée. Colle-la dans lib/themes.ts (ou envoie-la-moi) pour la rendre définitive.');
    } catch {
      window.prompt('Copie cette configuration :', text);
    }
  };
  const reset = () => {
    if (window.confirm(`Remettre toute la disposition du thème « ${theme.label} » à zéro ?`)) L.resetAll();
  };

  const sel = L.selected;
  const isPlanet = !!sel && sel.startsWith('planet:');
  const planetId = isPlanet ? (sel!.slice(7) as ModeId) : null;
  const styleKey = sel && !isPlanet ? (sel as StyleKey) : null;
  const rect = styleKey && styleKey !== 'profile' && styleKey !== 'teamRows' ? L.zones[styleKey] : null;
  const tweak = planetId ? { dx: 0, dy: 0, scale: 1, ...L.layout.planets[planetId] } : null;

  return (
    <>
      <Floating id="toolbar" title="Mode disposition" width={300} initial={{ top: 10, left: 10 }}>
        <div style={{ opacity: 0.8, lineHeight: 1.4, marginTop: 6 }}>Glisse un élément · coin = taille · clic = réglages. Ce panneau se déplace et se réduit.</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginTop: 8 }}>
          <input type="checkbox" checked={L.linked} onChange={(e) => L.setLinked(e.target.checked)} /> écran + afficheur liés
        </label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          <button style={btn} onClick={copy}>Copier la config</button>
          <button style={btn} onClick={reset}>Réinitialiser</button>
          <button style={{ ...btn, background: CYAN, color: '#06202b' }} onClick={() => L.setEditing(false)}>Terminer</button>
        </div>
      </Floating>

      <Floating id="inspector" title="Réglages" width={290} initial={{ top: 10, right: 10 }}>
        {!sel && <div style={{ opacity: 0.85, lineHeight: 1.4, marginTop: 8 }}>Clique un élément (écran, afficheur, barre, bandeau, icônes) pour régler police, fond et bordure.</div>}

        {styleKey && (
          <>
            <div style={{ fontWeight: 800, color: CYAN, marginTop: 8 }}>{ELEMENT_LABELS[styleKey]}</div>
            {rect && <div style={{ opacity: 0.7, marginTop: 4, fontSize: 11 }}>x {rect.left}% · y {rect.top}% · l {rect.width}% · h {rect.height}%</div>}
            <StyleControls L={L} k={styleKey} />
            {styleKey === 'teams' && <StyleControls L={L} k="teamRows" title="Lignes d’équipes (Bamboo Clan…)" />}
            {styleKey === 'hub' && <div style={{ opacity: 0.65, fontSize: 11, marginTop: 8 }}>La police du hublot s'applique aussi pendant une partie.</div>}
            {styleKey === 'modes' && <div style={{ opacity: 0.65, fontSize: 11, marginTop: 8 }}>Clique une icône pour la déplacer ou changer sa taille ; la zone règle l'espacement.</div>}
            <div style={row}><button style={btn} onClick={L.resetSelected}>Réinitialiser cet élément</button></div>
          </>
        )}

        {planetId && tweak && (
          <>
            <div style={{ fontWeight: 800, color: CYAN, marginTop: 8 }}>Icône « {MODE_LABELS[planetId]} »</div>
            <div style={{ opacity: 0.7, marginTop: 4, fontSize: 11 }}>Glisse-la pour la déplacer.</div>
            <div style={row}>
              <span style={lab}>Taille</span>
              <input type="range" min={40} max={220} value={Math.round(tweak.scale * 100)} style={{ flex: 1 }} onChange={(e) => L.setPlanet(planetId, { scale: Number(e.target.value) / 100 })} />
              <span style={{ width: 38, textAlign: 'right' }}>{Math.round(tweak.scale * 100)}%</span>
            </div>
            <div style={row}><button style={btn} onClick={L.resetSelected}>Réinitialiser cette icône</button></div>
          </>
        )}
      </Floating>
    </>
  );
}
