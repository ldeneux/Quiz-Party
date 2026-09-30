import type { CSSProperties } from 'react';

// Style « touches de pupitre » du cockpit (tailles en cqw : 1cqw = 1 % de la largeur de la scène).
export const ckKey: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.55cqw',
  padding: '0.55cqw 1.2cqw',
  borderRadius: '0.7cqw',
  background: 'linear-gradient(180deg, rgba(50,85,190,0.55) 0%, rgba(12,24,70,0.92) 100%)',
  border: '1px solid rgba(120,175,255,0.75)',
  boxShadow:
    '0 0 0.9cqw rgba(60,120,255,0.45), inset 0 0.12cqw 0.25cqw rgba(255,255,255,0.28), inset 0 -0.2cqw 0.4cqw rgba(0,0,30,0.6)',
  color: '#dfe9ff',
  fontFamily: 'inherit',
  fontWeight: 800,
  fontSize: '0.95cqw',
  letterSpacing: '0.08cqw',
  textTransform: 'uppercase',
  textShadow: '0 0 0.6cqw rgba(120,180,255,0.8)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  textDecoration: 'none',
  lineHeight: 1.2,
};

export const ckKeyPrimary: CSSProperties = {
  ...ckKey,
  background: 'linear-gradient(180deg, rgba(80,200,255,0.95) 0%, rgba(95,85,255,0.95) 100%)',
  border: '1px solid rgba(200,235,255,0.9)',
  boxShadow: '0 0 1.2cqw rgba(90,170,255,0.75), inset 0 0.12cqw 0.25cqw rgba(255,255,255,0.5)',
  color: '#fff',
  textShadow: '0 0 0.5cqw rgba(0,30,90,0.7)',
};

export const ckKeyDanger: CSSProperties = {
  ...ckKey,
  background: 'linear-gradient(180deg, rgba(150,50,60,0.5) 0%, rgba(50,10,25,0.92) 100%)',
  border: '1px solid rgba(255,130,110,0.8)',
  boxShadow:
    '0 0 0.9cqw rgba(255,90,70,0.4), inset 0 0.12cqw 0.25cqw rgba(255,255,255,0.22), inset 0 -0.2cqw 0.4cqw rgba(30,0,10,0.6)',
  color: '#ffd8d0',
  textShadow: '0 0 0.6cqw rgba(255,120,100,0.8)',
};

// Petite LED lumineuse placée devant le texte d'une touche
export const ckLed = (color: string): CSSProperties => ({
  display: 'inline-block',
  width: '0.55cqw',
  height: '0.55cqw',
  borderRadius: '50%',
  background: color,
  boxShadow: `0 0 0.6cqw ${color}`,
  flexShrink: 0,
});
