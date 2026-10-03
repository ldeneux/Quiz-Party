import React from 'react';
import { categoryBadgeSrc } from '@/lib/categoryBadges';

// Badge d'une catégorie (image avec le nom intégré). Sans badge connu : « emoji + nom » comme avant.
// `height` accepte toute unité CSS (ex. '56px', '5cqw', '4em'). `withName` ajoute le nom en texte à côté du badge.
export default function CategoryBadge({
  name,
  emoji,
  height = '4em',
  withName = false,
  style,
  fallbackStyle,
}: {
  name?: string | null;
  emoji?: string | null;
  height?: string | number;
  withName?: boolean;
  style?: React.CSSProperties;
  fallbackStyle?: React.CSSProperties;
}) {
  const src = categoryBadgeSrc(name);
  if (!src) return <span style={{ ...fallbackStyle, ...style }}>{emoji} {name}</span>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5em', verticalAlign: 'middle', ...style }}>
      <img src={src} alt={name ?? ''} draggable={false} style={{ height, width: 'auto', aspectRatio: '1 / 1', objectFit: 'contain', flexShrink: 0 }} />
      {withName && <span>{name}</span>}
    </span>
  );
}
