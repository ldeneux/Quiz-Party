'use client';

import React, { useEffect } from 'react';
import { CHIP_LABELS, ELEMENT_LABELS, MODE_LABELS, StyleKey, ZONE_KEYS } from '@/lib/layout';
import type { LayoutApi } from '@/lib/useLayout';
import type { ModeId, Theme } from '@/lib/themes';

const CYAN = '#38d9ff';

// ─────────── Cadres de réglage, posés par-dessus la scène (à rendre DANS la scène) ───────────
export function LayoutOverlays({ L, theme }: { L: LayoutApi; theme: Theme }) {
  if (!L.editing) return null;
  const chip = (label: string, selected: boolean): React.CSSProperties => ({
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
        const hub = k === 'hub'; // le hublot laisse passer les clics : les icônes de modes s'y déplacent
        return (
          <div
            key={k}
            onPointerDown={hub ? undefined : (e) => L.beginMove(e, k)}
            style={{
              position: 'absolute', left: `${r.left}%`, top: `${r.top}%`, width: `${r.width}%`, height: `${r.height}%`,
              boxSizing: 'border-box', zIndex: 200, cursor: hub ? 'default' : 'move', touchAction: 'none',
              pointerEvents: hub ? 'none' : 'auto',
              outline: sel ? `2px solid ${CYAN}` : `1.5px dashed ${CYAN}cc`,
              background: sel ? 'rgba(56,217,255,.14)' : 'rgba(56,217,255,.05)',
            }}
          >
            <div onPointerDown={(e) => L.beginMove(e, k)} style={chip(CHIP_LABELS[k], sel)}>⠿ {CHIP_LABELS[k]}</div>
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
          width: `${pfW}cqw`, height: `${pfH * theme.stage.ratio}%`, boxSizing: 'border-box', zIndex: 200, cursor: 'move', touchAction: 'none',
          outline: L.selected === 'profile' ? `2px solid ${CYAN}` : `1.5px dashed ${CYAN}cc`,
          background: L.selected === 'profile' ? 'rgba(56,217,255,.14)' : 'rgba(56,217,255,.05)',
        }}
      >
        <div style={chip(CHIP_LABELS.profile, L.selected === 'profile')}>⠿ {CHIP_LABELS.profile}</div>
      </div>
    </>
  );
}

// ─────────── Barre d'outils et inspecteur (à rendre HORS de la scène) ───────────
const panel: React.CSSProperties = {
  position: 'fixed', zIndex: 1000, background: 'rgba(8,16,34,.94)', color: '#e8f4ff', border: `1px solid ${CYAN}88`,
  borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,.5)', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13,
};
const btn: React.CSSProperties = { background: '#16345a', color: '#e8f4ff', border: `1px solid ${CYAN}66`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 };

export function LayoutPanels({ L, theme }: { L: LayoutApi; theme: Theme }) {
  useEffect(() => {
    if (!L.editing) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && L.setEditing(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [L.editing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!L.editing) {
    return (
      <button onClick={() => L.setEditing(true)} title="Modifier la disposition de l'écran" style={{ ...btn, ...panel, padding: '6px 10px', bottom: 10, right: 10, opacity: 0.28, cursor: 'pointer' }}
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
  const st = styleKey ? L.layout.styles[styleKey] ?? {} : {};
  const rect = styleKey && styleKey !== 'profile' ? L.zones[styleKey] : null;
  const tweak = planetId ? { dx: 0, dy: 0, scale: 1, ...L.layout.planets[planetId] } : null;
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 };

  return (
    <>
      <div style={{ ...panel, top: 10, left: '50%', transform: 'translateX(-50%)', padding: '8px 12px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '96vw' }}>
        <strong style={{ color: CYAN }}>🎛 Mode disposition</strong>
        <span style={{ opacity: 0.8 }}>Glisse un élément · coin = taille · clic = couleurs</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={L.linked} onChange={(e) => L.setLinked(e.target.checked)} /> écran + afficheur liés
        </label>
        <button style={btn} onClick={copy}>Copier la config</button>
        <button style={btn} onClick={reset}>Réinitialiser le thème</button>
        <button style={{ ...btn, background: CYAN, color: '#06202b' }} onClick={() => L.setEditing(false)}>Terminer</button>
      </div>

      <div style={{ ...panel, top: 70, right: 10, width: 270, padding: 14, maxHeight: 'calc(100vh - 90px)', overflowY: 'auto' }}>
        {!sel && <div style={{ opacity: 0.85, lineHeight: 1.4 }}>Clique un élément (écran, afficheur, barre, bandeau ou icône de mode) pour régler ses couleurs ou sa taille.</div>}

        {styleKey && (
          <>
            <div style={{ fontWeight: 800, color: CYAN }}>{ELEMENT_LABELS[styleKey]}</div>
            {rect && <div style={{ opacity: 0.7, marginTop: 4, fontSize: 11 }}>x {rect.left}% · y {rect.top}% · l {rect.width}% · h {rect.height}%</div>}
            <div style={row}>
              <span style={{ width: 92 }}>Police</span>
              <input type="color" value={st.color ?? '#ffffff'} onChange={(e) => L.setStyle(styleKey, { color: e.target.value })} />
              <button style={btn} onClick={() => L.setStyle(styleKey, { color: undefined })}>défaut</button>
            </div>
            <div style={row}>
              <span style={{ width: 92 }}>Fond</span>
              <input type="color" value={st.bg ?? '#000000'} onChange={(e) => L.setStyle(styleKey, { bg: e.target.value })} />
              <button style={btn} onClick={() => L.setStyle(styleKey, { bg: undefined, bgOpacity: undefined })}>défaut</button>
            </div>
            <div style={row}>
              <span style={{ width: 92 }}>Opacité fond</span>
              <input type="range" min={0} max={100} value={Math.round((st.bgOpacity ?? 0.85) * 100)} style={{ flex: 1 }}
                onChange={(e) => L.setStyle(styleKey, { bg: st.bg ?? '#000000', bgOpacity: Number(e.target.value) / 100 })} />
            </div>
            {styleKey === 'hub' && <div style={{ opacity: 0.65, fontSize: 11, marginTop: 8 }}>La police du hublot s'applique aussi pendant une partie.</div>}
            <div style={row}><button style={btn} onClick={L.resetSelected}>Réinitialiser cet élément</button></div>
          </>
        )}

        {planetId && tweak && (
          <>
            <div style={{ fontWeight: 800, color: CYAN }}>Icône « {MODE_LABELS[planetId]} »</div>
            <div style={{ opacity: 0.7, marginTop: 4, fontSize: 11 }}>Glisse-la dans le hublot pour la déplacer.</div>
            <div style={row}>
              <span style={{ width: 70 }}>Taille</span>
              <input type="range" min={40} max={220} value={Math.round(tweak.scale * 100)} style={{ flex: 1 }} onChange={(e) => L.setPlanet(planetId, { scale: Number(e.target.value) / 100 })} />
              <span style={{ width: 40, textAlign: 'right' }}>{Math.round(tweak.scale * 100)}%</span>
            </div>
            <div style={row}><button style={btn} onClick={L.resetSelected}>Réinitialiser cette icône</button></div>
          </>
        )}
      </div>
    </>
  );
}
