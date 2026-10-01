'use client';

import React from 'react';
import CockpitPlate, { PlateId } from '@/components/CockpitPlate';
import { ckKey } from '@/lib/cockpitUi';

// Fenêtre « cadre » du cockpit (vue sur la Terre ou sur l'espace) avec, en bas à droite,
// l'icône qui ferme la fenêtre. À placer dans la scène (cqw = largeur de la scène).
export function CockpitFrameWindow({
  frame,
  width = '60cqw',
  closeId,
  closeLabel,
  onClose,
  children,
}: {
  frame: 'terre' | 'espace';
  width?: string;
  closeId: PlateId;
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(2,5,25,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        style={{ position: 'relative', width, aspectRatio: '1400 / 788', backgroundImage: `url(/ui/frame-${frame}.webp)`, backgroundSize: '100% 100%', color: '#e8eeff' }}
      >
        {children}
        <div style={{ position: 'absolute', right: '2.2%', bottom: '3.4%', zIndex: 2 }}>
          <CockpitPlate id={closeId} label={closeLabel} onClick={onClose} height={4.2} />
        </div>
      </div>
    </div>
  );
}

// « MSGBOX » : titre, texte, puis des actions toutes sous forme de boutons identiques ; l'icône ✕ (en bas à droite) annule.
type Props = {
  title: string;
  children?: React.ReactNode;
  actions: { label: string; onClick: () => void }[];
  cancelLabel?: string;
  onCancel: () => void;
};

export default function CockpitMsgBox({ title, children, actions, cancelLabel = 'Annuler', onCancel }: Props) {
  return (
    <CockpitFrameWindow frame="terre" width="54cqw" closeId="annuler" closeLabel={cancelLabel} onClose={onCancel}>
      <div
        style={{
          position: 'absolute',
          left: '6.5%',
          right: '6.5%',
          top: '10%',
          bottom: '10%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.1cqw',
          padding: '1.2cqw 2.5cqw',
          textAlign: 'center',
          background: 'rgba(3,8,35,0.84)',
          borderRadius: '1.2cqw',
          border: '1px solid rgba(120,175,255,0.35)',
        }}
      >
        <div style={{ fontSize: '2cqw', fontWeight: 800, color: '#fff', textShadow: '0 0 1cqw rgba(90,160,255,0.9)' }}>{title}</div>
        {children && <div style={{ fontSize: '1.2cqw', lineHeight: 1.4, color: '#c8d6ff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6cqw' }}>{children}</div>}
        <div style={{ display: 'flex', gap: '1.2cqw', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.6cqw' }}>
          {actions.map((x) => (
            <button key={x.label} className="ck-key" onClick={x.onClick} style={{ ...ckKey, fontSize: '1.05cqw', padding: '0.7cqw 1.6cqw' }}>
              {x.label}
            </button>
          ))}
        </div>
      </div>
    </CockpitFrameWindow>
  );
}
