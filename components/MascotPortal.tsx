'use client';

import { useEffect, useRef, useState } from 'react';
import { THEME_INTROS, HOLD_AFTER_VIDEO_MS, NO_VIDEO_MS } from '@/lib/themeIntros';

// Mascotte (toujours visible, en haut à gauche de la scène) + portail holographique de lancement de partie.
// Tout est dimensionné en cqw (unités de la scène) : l'ensemble suit la taille de l'écran.

// Position / taille de la mascotte (en cqw) — à ajuster ici si besoin
const MASCOT = { left: 1.0, top: 1.0, width: 11 };
const MASCOT_RATIO = 1058 / 852; // largeur / hauteur de /mascot/mascotte.webp
// Écran du torse, en % de l'image de la mascotte
const SCREEN = { left: 30.5, top: 41.3, width: 43.5, height: 29.3 };
// Portail : 40 % de la largeur de la scène, centré, au format vidéo 16/9
const PORTAL_W = 40;
const PORTAL_H = (PORTAL_W * 9) / 16;

const T_CHARGE = 700; // l'écran de la mascotte s'illumine
const T_OPEN = 900; // le portail s'ouvre
const T_CLOSE = 800; // le portail se réduit vers la mascotte

type Phase = 'idle' | 'charge' | 'open' | 'play' | 'hold' | 'close';

type Props = {
  active: boolean; // passe à true au clic sur « Démarrer la partie »
  themeId: string;
  stageRatio: number; // largeur / hauteur de la scène
  onLaunch: () => void; // appelé quand le portail commence à se refermer : on peut afficher la 1re question
  onDone: () => void; // appelé quand tout est terminé
};

export default function MascotPortal({ active, themeId, stageRatio, onLaunch, onDone }: Props) {
  const intro = THEME_INTROS[themeId] ?? null;
  const [phase, setPhase] = useState<Phase>('idle');
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cb = useRef({ onLaunch, onDone });
  cb.current = { onLaunch, onDone };

  // Déclenchement
  useEffect(() => {
    if (active && phase === 'idle') {
      setVideoFailed(false);
      setPhase('charge');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Enchaînement des phases
  useEffect(() => {
    if (phase === 'charge') {
      const t = setTimeout(() => setPhase('open'), T_CHARGE);
      return () => clearTimeout(t);
    }
    if (phase === 'open') {
      const t = setTimeout(() => setPhase('play'), T_OPEN);
      return () => clearTimeout(t);
    }
    if (phase === 'play') {
      if (intro && !videoFailed) {
        const v = videoRef.current;
        if (!v) {
          setVideoFailed(true);
          return;
        }
        v.currentTime = 0;
        v.play().catch(() => {
          v.muted = true; // certains navigateurs n'autorisent la lecture automatique que sans son
          v.play().catch(() => setVideoFailed(true));
        });
        return; // la fin de la vidéo (onEnded) passe à « hold »
      }
      const t = setTimeout(() => setPhase('close'), NO_VIDEO_MS); // pas de vidéo : « ? » lumineux
      return () => clearTimeout(t);
    }
    if (phase === 'hold') {
      const t = setTimeout(() => setPhase('close'), HOLD_AFTER_VIDEO_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'close') {
      cb.current.onLaunch();
      const t = setTimeout(() => {
        setPhase('idle');
        cb.current.onDone();
      }, T_CLOSE);
      return () => clearTimeout(t);
    }
  }, [phase, intro, videoFailed]);

  // Centre de l'écran de la mascotte (cqw) → point de départ / d'arrivée du portail
  const mascotH = MASCOT.width / MASCOT_RATIO;
  const fromX = MASCOT.left + MASCOT.width * ((SCREEN.left + SCREEN.width / 2) / 100);
  const fromY = MASCOT.top + mascotH * ((SCREEN.top + SCREEN.height / 2) / 100);
  const dx = fromX - 50;
  const dy = fromY - 100 / stageRatio / 2;

  const lit = phase !== 'idle';
  const portalVisible = phase === 'open' || phase === 'play' || phase === 'hold' || phase === 'close';
  const showVideo = !!intro && !videoFailed;
  const skippable = phase === 'play' || phase === 'hold';

  return (
    <>
      <style>{`
        @keyframes mp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-0.35cqw)}}
        @keyframes mp-screen-on{0%{opacity:0}40%{opacity:1}55%{opacity:.55}100%{opacity:1}}
        @keyframes mp-screen-pulse{0%,100%{opacity:.85}50%{opacity:1}}
        @keyframes mp-open{0%{transform:translate(var(--mp-dx),var(--mp-dy)) scale(.04,.01);opacity:0;filter:brightness(2.2)}
          45%{transform:translate(calc(var(--mp-dx)*.2),calc(var(--mp-dy)*.2)) scale(.9,.04);opacity:1;filter:brightness(1.8)}
          70%{transform:translate(0,0) scale(1,.08);opacity:1;filter:brightness(1.6)}
          100%{transform:translate(0,0) scale(1,1);opacity:1;filter:brightness(1)}}
        @keyframes mp-close{0%{transform:translate(0,0) scale(1,1);opacity:1;filter:brightness(1)}
          30%{transform:translate(0,0) scale(1,.08);opacity:1;filter:brightness(1.6)}
          100%{transform:translate(var(--mp-dx),var(--mp-dy)) scale(.04,.01);opacity:0;filter:brightness(2.2)}}
        @keyframes mp-spin{to{transform:translate(-50%,-50%) rotate(360deg)}}
        @keyframes mp-scan{from{background-position:0 0}to{background-position:0 1.2cqw}}
        @keyframes mp-flicker{0%,100%{opacity:1}7%{opacity:.86}9%{opacity:1}52%{opacity:.93}54%{opacity:1}}
        @keyframes mp-ring{0%{transform:scale(.96);opacity:.7}100%{transform:scale(1.18);opacity:0}}
        @keyframes mp-halo{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.08);opacity:1}}
        @keyframes mp-fade{from{opacity:0}to{opacity:1}}
        @media (prefers-reduced-motion: reduce){.mp-anim{animation:none !important}}
      `}</style>

      {/* Mascotte : toujours là, quel que soit l'habillage */}
      <div style={{ position: 'absolute', left: `${MASCOT.left}cqw`, top: `${MASCOT.top}cqw`, width: `${MASCOT.width}cqw`, zIndex: 30, pointerEvents: 'none' }}>
        <div className="mp-anim" style={{ position: 'relative', animation: lit ? undefined : 'mp-float 4.5s ease-in-out infinite' }}>
          <img
            src="/mascot/mascotte.webp"
            alt=""
            draggable={false}
            style={{ width: '100%', display: 'block', transition: 'filter .5s', filter: lit ? 'drop-shadow(0 0 1.2cqw rgba(110,190,255,.95))' : 'drop-shadow(0 0.3cqw 0.6cqw rgba(0,0,0,.45))' }}
          />
          {/* Écran du torse qui s'illumine */}
          <div
            className="mp-anim"
            style={{
              position: 'absolute',
              left: `${SCREEN.left}%`,
              top: `${SCREEN.top}%`,
              width: `${SCREEN.width}%`,
              height: `${SCREEN.height}%`,
              borderRadius: '28% / 38%',
              background: 'radial-gradient(ellipse at center, rgba(235,248,255,.98) 0%, rgba(140,205,255,.85) 45%, rgba(90,120,255,.55) 80%, rgba(90,120,255,0) 100%)',
              mixBlendMode: 'screen',
              boxShadow: '0 0 1.6cqw 0.4cqw rgba(120,190,255,.85)',
              opacity: lit ? 1 : 0,
              animation: lit ? (phase === 'charge' ? `mp-screen-on ${T_CHARGE}ms ease-out` : 'mp-screen-pulse 1.4s ease-in-out infinite') : undefined,
              transition: 'opacity .6s',
            }}
          />
        </div>
      </div>

      {/* Portail holographique */}
      {phase !== 'idle' && phase !== 'charge' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: phase === 'close' ? 'transparent' : 'rgba(2,6,22,.5)', transition: `background ${T_CLOSE}ms`, animation: 'mp-fade .5s ease-out' }}>
          <div
            style={
              {
                position: 'absolute',
                left: `${50 - PORTAL_W / 2}cqw`,
                top: '50%',
                width: `${PORTAL_W}cqw`,
                height: `${PORTAL_H}cqw`,
                marginTop: `${-PORTAL_H / 2}cqw`,
                '--mp-dx': `${dx}cqw`,
                '--mp-dy': `${dy}cqw`,
              } as React.CSSProperties
            }
          >
            {/* Ondes qui partent du portail */}
            {portalVisible && phase !== 'close' && [0, 0.9].map((d) => (
              <div key={d} className="mp-anim" style={{ position: 'absolute', inset: '-0.8cqw', borderRadius: '2cqw', border: '0.12cqw solid rgba(130,210,255,.8)', animation: `mp-ring 2.2s ${d}s ease-out infinite`, pointerEvents: 'none' }} />
            ))}

            <div
              className="mp-anim"
              style={{
                position: 'absolute',
                inset: 0,
                animation: phase === 'open' ? `mp-open ${T_OPEN}ms cubic-bezier(.2,.8,.2,1) both` : phase === 'close' ? `mp-close ${T_CLOSE}ms cubic-bezier(.6,0,.8,.4) both` : 'mp-flicker 5s linear infinite',
              }}
            >
              {/* Cadre lumineux : un faisceau conique tourne derrière un liseré */}
              <div style={{ position: 'absolute', inset: 0, borderRadius: '1.6cqw', overflow: 'hidden', boxShadow: '0 0 3cqw 0.6cqw rgba(80,170,255,.75), 0 0 9cqw 1.5cqw rgba(140,90,255,.45)' }}>
                <div
                  className="mp-anim"
                  style={{ position: 'absolute', left: '50%', top: '50%', width: '170%', aspectRatio: '1', background: 'conic-gradient(from 0deg, rgba(0,0,0,0), #5ee0ff 12%, rgba(0,0,0,0) 30%, #b48cff 55%, rgba(0,0,0,0) 75%, #5ee0ff 100%)', animation: 'mp-spin 3.2s linear infinite', transform: 'translate(-50%,-50%)' }}
                />
                <div style={{ position: 'absolute', inset: '0.3cqw', borderRadius: '1.3cqw', overflow: 'hidden', background: '#02061a' }}>
                  {/* Contenu : vidéo du thème ou « ? » */}
                  {showVideo ? (
                    <video
                      ref={videoRef}
                      src={intro!.src}
                      poster={intro!.poster}
                      preload="auto"
                      playsInline
                      onEnded={() => setPhase('hold')}
                      onError={() => setVideoFailed(true)}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, rgba(40,90,200,.45), rgba(2,6,26,1) 70%)' }}>
                      <div className="mp-anim" style={{ position: 'absolute', width: '14cqw', height: '14cqw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(150,220,255,.55), rgba(110,120,255,.2) 55%, transparent 72%)', animation: 'mp-halo 1.8s ease-in-out infinite' }} />
                      <div className="mp-anim" style={{ position: 'relative', fontSize: '13cqw', fontWeight: 900, lineHeight: 1, color: '#e9f8ff', textShadow: '0 0 1cqw #7fd8ff, 0 0 2.5cqw #5ab4ff, 0 0 6cqw #7a6bff', animation: 'mp-halo 1.8s ease-in-out infinite' }}>?</div>
                    </div>
                  )}
                  {/* Trame holographique : lignes de balayage + teinte */}
                  <div className="mp-anim" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(to bottom, rgba(120,200,255,.10) 0, rgba(120,200,255,.10) 0.1cqw, transparent 0.1cqw, transparent 0.6cqw)', backgroundSize: '100% 1.2cqw', mixBlendMode: 'screen', animation: 'mp-scan 1.6s linear infinite' }} />
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, transparent 60%, rgba(40,100,255,.22) 100%)', boxShadow: 'inset 0 0 2cqw rgba(110,190,255,.55)' }} />
                </div>
              </div>

              {skippable && (
                <button
                  type="button"
                  onClick={() => setPhase('close')}
                  style={{ position: 'absolute', right: '1cqw', bottom: '1cqw', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(160,220,255,0.7)', borderRadius: '0.8cqw', padding: '0.35cqw 0.9cqw', fontSize: '0.9cqw', fontWeight: 700, cursor: 'pointer', zIndex: 2 }}
                >
                  Passer ›
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
