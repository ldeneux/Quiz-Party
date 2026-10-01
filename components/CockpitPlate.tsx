'use client';

import React, { useState } from 'react';

export type PlateId =
  | 'fusee' // démarrer la partie
  | 'suivante' // question suivante
  | 'stats'
  | 'parametrage'
  | 'progression'
  | 'nouvelle'
  | 'quitter'
  | 'plein'
  | 'valider'
  | 'annuler'
  | 'profil';

// Rapport largeur / hauteur de chaque image (sert aussi à réserver la place des boutons dans le pupitre)
export const PLATE_RATIO: Record<PlateId, number> = {
  fusee: 1.28,
  suivante: 1.28,
  stats: 1.284,
  parametrage: 1.292,
  progression: 1.292,
  nouvelle: 1.304,
  quitter: 1.28,
  plein: 1.321,
  valider: 1.317,
  annuler: 1.308,
  profil: 7.33,
};

const SRC = (id: PlateId) => (id === 'profil' ? '/ui/banner-profil.webp' : `/ui/plate-${id}.webp`);

// Bouton « cadre holographique » du cockpit : image + infobulle néon (libellé + raccourci clavier).
// aria-disabled (et non disabled) : l'infobulle reste visible même quand le bouton est grisé.
type Props = {
  id: PlateId;
  label: string;
  hint?: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  pulse?: boolean;
  height?: number; // en cqw
  tipSide?: 'above' | 'below';
  noTip?: boolean;
  children?: React.ReactNode; // contenu superposé au centre de l'image (ex. nom du profil)
};

export default function CockpitPlate({ id, label, hint, onClick, href, disabled = false, pulse = false, height = 5.2, tipSide = 'above', noTip = false, children }: Props) {
  const [show, setShow] = useState(false);
  const common = {
    // « suivante » reprend l'identifiant de « fusee » : même emplacement, même raccourci (Espace)
    id: id === 'suivante' ? 'ck-fusee' : `ck-${id}`,
    className: `ck-plate${pulse && !disabled ? ' ck-pulse' : ''}`,
    style: { width: `${(height * PLATE_RATIO[id]).toFixed(2)}cqw`, cursor: disabled ? 'not-allowed' : 'pointer' } as React.CSSProperties,
    'aria-label': label,
    'aria-disabled': disabled,
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    onFocus: () => setShow(true),
    onBlur: () => setShow(false),
  };
  const img = (
    <img
      src={SRC(id)}
      alt=""
      draggable={false}
      style={{ width: '100%', display: 'block', filter: disabled ? 'grayscale(1) brightness(0.5)' : undefined, opacity: disabled ? 0.8 : 1 }}
    />
  );
  const overlay = children ? (
    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12%', pointerEvents: 'none' }}>{children}</span>
  ) : null;
  const tip =
    show && !noTip ? (
      <span
        role="tooltip"
        style={{
          position: 'absolute',
          ...(tipSide === 'above' ? { bottom: 'calc(100% + 0.7cqw)' } : { top: 'calc(100% + 0.7cqw)' }),
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          padding: '0.45cqw 0.9cqw',
          borderRadius: '0.6cqw',
          background: 'rgba(4,9,36,0.96)',
          border: '1px solid rgba(120,175,255,0.75)',
          boxShadow: '0 0 1.2cqw rgba(60,120,255,0.55)',
          color: '#dfe9ff',
          fontSize: '0.95cqw',
          fontWeight: 800,
          textAlign: 'center',
          lineHeight: 1.3,
        }}
      >
        {label}
        {hint && <span style={{ display: 'block', fontWeight: 600, fontSize: '0.8cqw', color: '#8fb4ff' }}>{hint}</span>}
      </span>
    ) : null;
  if (href && !disabled) {
    return (
      <a href={href} {...common}>
        {img}
        {overlay}
        {tip}
      </a>
    );
  }
  return (
    <button type="button" onClick={disabled ? undefined : onClick} {...common}>
      {img}
      {overlay}
      {tip}
    </button>
  );
}
