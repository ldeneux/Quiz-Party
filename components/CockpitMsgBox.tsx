'use client';

import React from 'react';
import CockpitPlate from '@/components/CockpitPlate';
import { ckKey } from '@/lib/cockpitUi';
import { useTheme } from '@/lib/useTheme';

// « MSGBOX » du cockpit : grande fenêtre sur la Terre, texte lisible sur un panneau sombre,
// boutons Valider / Annuler (cadres holographiques). À placer dans la scène (cqw = largeur de la scène).
type Props = {
  title: string;
  children?: React.ReactNode;
  validateLabel?: string;
  cancelLabel?: string;
  onValidate?: () => void;
  onCancel: () => void;
  extra?: { label: string; onClick: () => void }[]; // actions supplémentaires (touches de texte)
};

export default function CockpitMsgBox({ title, children, validateLabel = 'Valider', cancelLabel = 'Annuler', onValidate, onCancel, extra }: Props) {
  const { theme } = useTheme();
  const frame = theme.frames.msg;
  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(2,5,25,0.68)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
        style={{ position: 'relative', width: `${frame.width}cqw`, aspectRatio: `${frame.ratio}`, backgroundImage: `url(${frame.src})`, backgroundSize: '100% 100%', color: '#e8eeff' }}
      >
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
            gap: '1cqw',
            padding: '1.2cqw 2.5cqw',
            textAlign: 'center',
            background: 'rgba(3,8,35,0.76)',
            borderRadius: '1.2cqw',
            border: '1px solid rgba(120,175,255,0.35)',
          }}
        >
          <div style={{ fontSize: '2cqw', fontWeight: 800, color: '#fff', textShadow: '0 0 1cqw rgba(90,160,255,0.9)' }}>{title}</div>
          {children && <div style={{ fontSize: '1.2cqw', lineHeight: 1.4, color: '#c8d6ff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.7cqw' }}>{children}</div>}
          {extra && extra.length > 0 && (
            <div style={{ display: 'flex', gap: '0.9cqw', flexWrap: 'wrap', justifyContent: 'center' }}>
              {extra.map((x) => (
                <button key={x.label} className="ck-key" onClick={x.onClick} style={ckKey}>
                  {x.label}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '1.6cqw', marginTop: '0.4cqw' }}>
            {onValidate && <CockpitPlate id="valider" label={validateLabel} onClick={onValidate} height={4.4} />}
            <CockpitPlate id="annuler" label={cancelLabel} onClick={onCancel} height={4.4} />
          </div>
        </div>
      </div>
    </div>
  );
}
