import React from 'react';

// Icône d'un mode de jeu (public/modes/<mode>.webp), à la place de l'ancien emoji. Suit la taille du texte par défaut.
export default function ModeIcon({ mode, size = '1.3em', style }: { mode: string; size?: string | number; style?: React.CSSProperties }) {
  return (
    <img
      src={`/modes/${mode}.webp`}
      alt=""
      draggable={false}
      style={{ width: size, height: size, objectFit: 'contain', display: 'inline-block', verticalAlign: '-0.25em', flexShrink: 0, ...style }}
    />
  );
}
