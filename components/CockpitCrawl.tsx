'use client';

import React, { useId, useLayoutEffect, useRef, useState } from 'react';

// Texte qui défile façon « Star Wars » (incliné, il s'éloigne en haut) dans l'écran droit du cockpit.
// Défilement en boucle, 2 s de pause (écran vide) puis on recommence ; clic = pause / reprise
export default function CockpitCrawl({ text }: { text: string }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ H: 0, h: 0 });
  const [paused, setPaused] = useState(false);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  useLayoutEffect(() => {
    const measure = () => {
      const o = outerRef.current;
      const i = innerRef.current;
      if (o && i) setDims({ H: o.clientHeight, h: i.scrollHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outerRef.current) ro.observe(outerRef.current);
    return () => ro.disconnect();
  }, [text]);

  const { H, h } = dims;
  // Toujours animé (même court) : certains textes dépassent, on évite tout cas particulier
  const crawl = H > 0;
  // ~11 caractères par seconde, 14 s minimum ; puis 2 s de pause écran vide
  const T = Math.max(14, text.length / 11);
  const D = T + 2;
  const pct = ((T / D) * 100).toFixed(2);
  const tilt = 'rotateX(22deg)';
  const css =
    `@keyframes ck-crawl-${uid}{0%{transform:translateY(${Math.round(H * 0.92)}px)}` +
    `${pct}%{transform:translateY(${-Math.round(h + 24)}px)}100%{transform:translateY(${-Math.round(h + 24)}px)}}` +
    `@media (prefers-reduced-motion: reduce){.ck-crawl-inner{animation:none !important}.ck-crawl-tilt{transform:none !important}.ck-crawl{overflow-y:auto !important;-webkit-mask-image:none !important;mask-image:none !important}}`;
  const mask = 'linear-gradient(to top, #000 0%, #000 55%, rgba(0,0,0,0) 100%)';

  return (
    <div
      ref={outerRef}
      className="ck-crawl"
      onClick={() => crawl && setPaused((p) => !p)}
      title={crawl ? 'Clic : pause / reprise' : undefined}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        perspective: `${Math.max(H * 2.2, 240)}px`,
        WebkitMaskImage: crawl ? mask : undefined,
        maskImage: crawl ? mask : undefined,
        cursor: crawl ? 'pointer' : 'default',
      }}
    >
      {crawl && <style>{css}</style>}
      <div
        className="ck-crawl-tilt"
        style={{ height: '100%', transform: crawl ? tilt : 'none', transformOrigin: '50% 100%', display: 'flex', alignItems: crawl ? 'flex-start' : 'center' }}
      >
        <div
          ref={innerRef}
          className="ck-crawl-inner"
          lang="fr"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '0 0.7cqw',
            fontSize: '1.2cqw',
            lineHeight: 1.35,
            fontWeight: 700,
            color: '#ffe27a',
            textShadow: '0 0 0.6cqw rgba(255,190,60,0.55)',
            textAlign: crawl ? 'justify' : 'center',
            hyphens: 'auto',
            willChange: crawl ? 'transform' : undefined,
            animation: crawl ? `ck-crawl-${uid} ${D}s linear infinite` : undefined,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}
