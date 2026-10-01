'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';

// Bandeau d'informations « façon télé » sur 2 lignes.
// Si les éléments tiennent sur leur ligne : affichage fixe. Sinon : la ligne défile de droite à gauche en boucle.
function Row({ children, speed }: { children: React.ReactNode; speed: number }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [dur, setDur] = useState(20);

  useLayoutEffect(() => {
    const measure = () => {
      const b = boxRef.current;
      const c = contentRef.current;
      if (!b || !c) return;
      const w = c.scrollWidth;
      setOverflow(w > b.clientWidth + 1);
      setDur(Math.max(8, w / speed));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (boxRef.current) ro.observe(boxRef.current);
    if (contentRef.current) ro.observe(contentRef.current);
    return () => ro.disconnect();
  });

  return (
    <div ref={boxRef} style={{ overflow: 'hidden', whiteSpace: 'nowrap', minHeight: 0 }}>
      <div
        className={overflow ? 'ck-ticker-track' : undefined}
        style={{ display: 'inline-flex', gap: '0.5cqw', alignItems: 'center', animation: overflow ? `ck-ticker ${dur}s linear infinite` : undefined }}
      >
        <div ref={contentRef} style={{ display: 'inline-flex', gap: '0.5cqw', alignItems: 'center', paddingRight: '0.5cqw' }}>
          {children}
        </div>
        {overflow && <div style={{ display: 'inline-flex', gap: '0.5cqw', alignItems: 'center', paddingRight: '0.5cqw' }}>{children}</div>}
      </div>
    </div>
  );
}

export default function CockpitTicker({ items }: { items: React.ReactNode[] }) {
  // On répartit les éléments sur 2 lignes (un sur deux) pour garder les deux lignes équilibrées
  const row1 = items.filter((_, i) => i % 2 === 0);
  const row2 = items.filter((_, i) => i % 2 === 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4cqw' }}>
      <style>{`
        @keyframes ck-ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @media (prefers-reduced-motion: reduce){.ck-ticker-track{animation:none !important}}
      `}</style>
      <Row speed={70}>{row1}</Row>
      {row2.length > 0 && <Row speed={60}>{row2}</Row>}
    </div>
  );
}
