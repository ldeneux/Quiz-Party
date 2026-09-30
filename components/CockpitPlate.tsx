'use client';

import React, { useState } from 'react';

// Bouton « cadre holographique » du cockpit : image + infobulle néon (libellé + raccourci clavier).
// On utilise aria-disabled (et non disabled) pour que l'infobulle reste visible même quand le bouton est grisé.
type Props = {
  id: 'progression' | 'stats' | 'parametrage' | 'fusee';
  label: string;
  hint?: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  pulse?: boolean;
  width?: string;
};

export default function CockpitPlate({ id, label, hint, onClick, href, disabled = false, pulse = false, width = '8.6cqw' }: Props) {
  const [show, setShow] = useState(false);
  const common = {
    id: `ck-${id}`,
    className: `ck-plate${pulse && !disabled ? ' ck-pulse' : ''}`,
    style: { width, cursor: disabled ? 'not-allowed' : 'pointer' } as React.CSSProperties,
    'aria-label': label,
    'aria-disabled': disabled,
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    onFocus: () => setShow(true),
    onBlur: () => setShow(false),
  };
  const img = (
    <img
      src={`/ui/plate-${id}.webp`}
      alt=""
      draggable={false}
      style={{ width: '100%', display: 'block', filter: disabled ? 'grayscale(1) brightness(0.5)' : undefined, opacity: disabled ? 0.8 : 1 }}
    />
  );
  const tip = show && (
    <span
      role="tooltip"
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 0.7cqw)',
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
  );
  if (href && !disabled) {
    return (
      <a href={href} {...common}>
        {img}
        {tip}
      </a>
    );
  }
  return (
    <button type="button" onClick={disabled ? undefined : onClick} {...common}>
      {img}
      {tip}
    </button>
  );
}
