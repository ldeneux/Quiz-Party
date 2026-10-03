'use client';

import React, { useState } from 'react';
import { PlateId } from '@/lib/themes';
import { useTheme } from '@/lib/useTheme';

export type { PlateId } from '@/lib/themes';

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
  boxOverride?: React.CSSProperties; // couleurs personnalisées (disposition) appliquées au bouton lui-même
  children?: React.ReactNode; // contenu superposé au centre de l'image (ex. nom du profil)
};

export default function CockpitPlate({ id, label, hint, onClick, href, disabled = false, pulse = false, height = 5.2, tipSide = 'above', noTip = false, boxOverride, children }: Props) {
  const [show, setShow] = useState(false);
  const { theme } = useTheme();
  const def = theme.plates[id];
  const common = {
    // « suivante » reprend l'identifiant de « fusee » : même emplacement, même raccourci (Espace)
    id: id === 'suivante' ? 'ck-fusee' : `ck-${id}`,
    className: `ck-plate${pulse && !disabled ? ' ck-pulse' : ''}`,
    style: { width: `${(height * (def.scale ?? 1) * def.ratio).toFixed(2)}cqw`, cursor: disabled ? 'not-allowed' : 'pointer', ...def.boxStyle, ...boxOverride } as React.CSSProperties,
    'aria-label': label,
    'aria-disabled': disabled,
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    onFocus: () => setShow(true),
    onBlur: () => setShow(false),
  };
  const img = def.src ? (
    <img
      src={def.src}
      alt=""
      draggable={false}
      style={{ width: '100%', display: 'block', filter: disabled ? 'grayscale(1) brightness(0.5)' : undefined, opacity: disabled ? 0.8 : 1 }}
    />
  ) : (
    // Thème sans image pour ce bouton : on réserve juste la place (le décor fait le cadre)
    <span style={{ display: 'block', width: '100%', paddingTop: `${(100 / def.ratio).toFixed(2)}%`, opacity: disabled ? 0.5 : 1 }} />
  );
  const overlay = children ? (
    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12%', pointerEvents: 'none' }}>{children}</span>
  ) : !def.src && id !== 'profil' && label ? (
    // Habillage sans image pour ce bouton : on affiche son libellé
    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8%', pointerEvents: 'none', lineHeight: 1.15 }}>{label}</span>
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
