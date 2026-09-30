'use client';

import React, { useEffect, useState } from 'react';

// QR code (SVG, généré côté navigateur) pour rejoindre la partie depuis un téléphone.
// Fond blanc et modules foncés : c'est ce qui se scanne le mieux, même sur un vidéoprojecteur.
export default function CockpitQR({ url }: { url: string }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    import('qrcode')
      .then((QR) => QR.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0a1240', light: '#ffffff' } }))
      .then((s: string) => {
        if (alive) setSvg(s);
      })
      .catch(() => {
        if (alive) setSvg(null);
      });
    return () => {
      alive = false;
    };
  }, [url]);

  if (!svg) return null;
  return (
    <>
      <style>{`.ck-qr svg{width:100%;height:100%;display:block}`}</style>
      <div
        className="ck-qr"
        role="img"
        aria-label="QR code pour rejoindre la partie"
        style={{ width: '100%', aspectRatio: '1 / 1', lineHeight: 0, borderRadius: '0.8cqw', overflow: 'hidden', background: '#fff', boxShadow: '0 0 1.2cqw rgba(90,170,255,0.75)' }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </>
  );
}
