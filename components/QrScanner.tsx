'use client';

import React, { useEffect, useRef, useState } from 'react';

// Lit un QR code avec la caméra du téléphone. Accepte le lien /join?code=XXXX ou directement un code à 4 caractères.
function extractCode(data: string): string | null {
  try {
    const c = new URL(data).searchParams.get('code');
    if (c && /^[A-Za-z0-9]{4}$/.test(c)) return c.toUpperCase();
  } catch {
    /* pas une URL */
  }
  const t = data.trim();
  return /^[A-Za-z0-9]{4}$/.test(t) ? t.toUpperCase() : null;
}

export default function QrScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        const v = videoRef.current;
        if (!v || stopped) return;
        v.srcObject = stream;
        await v.play();
        const jsQR = (await import('jsqr')).default;
        const loop = () => {
          if (stopped) return;
          if (v.readyState >= 2 && v.videoWidth > 0 && ctx) {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            ctx.drawImage(v, 0, 0);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const res = jsQR(img.data, img.width, img.height);
            const code = res?.data ? extractCode(res.data) : null;
            if (code) {
              stopped = true;
              onCode(code);
              return;
            }
          }
          timer = setTimeout(loop, 150);
        };
        loop();
      } catch {
        setErr("Impossible d'ouvrir la caméra (autorisation refusée ?). Tu peux scanner avec l'appareil photo du téléphone ou saisir le code.");
      }
    })();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ marginBottom: 16 }}>
      {err ? (
        <p style={{ color: '#ff7a68', fontSize: 14 }}>{err}</p>
      ) : (
        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', aspectRatio: '1 / 1' }}>
          <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: '18%', border: '3px solid rgba(255,255,255,0.85)', borderRadius: 18, boxShadow: '0 0 0 100vmax rgba(0,0,0,0.35)', pointerEvents: 'none' }} />
        </div>
      )}
      <button onClick={onClose} style={{ marginTop: 10, border: '1px solid #eaedf6', background: 'none', borderRadius: 999, padding: '10px 20px', fontWeight: 700, fontSize: 14, color: '#7a819c', cursor: 'pointer' }}>
        Fermer la caméra
      </button>
    </div>
  );
}
