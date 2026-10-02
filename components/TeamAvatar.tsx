import React from 'react';

// Avatar d'équipe : une image (/avatars/...) ou, pour d'anciennes équipes, un emoji.
// La taille suit celle du texte autour (1.3em par défaut) ; on peut passer une taille en px/em/cqw.
export default function TeamAvatar({
  avatar,
  size = '1.3em',
  style,
}: {
  avatar: string | null | undefined;
  size?: string | number;
  style?: React.CSSProperties;
}) {
  if (!avatar) return null;
  const isImage = avatar.startsWith('/') || avatar.startsWith('http');
  if (!isImage) return <span style={style}>{avatar}</span>;
  return (
    <img
      src={avatar}
      alt=""
      draggable={false}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: '-0.3em',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
