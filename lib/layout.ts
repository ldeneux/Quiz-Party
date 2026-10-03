import type { CSSProperties } from 'react';
import type { ModeId, Rect, Theme, ThemeId } from './themes';

// Disposition personnalisée de l'écran d'accueil, enregistrée par thème sur cet appareil (localStorage).
// Elle se superpose aux réglages du thème : ce qui n'est pas modifié reste tel que défini dans lib/themes.ts.

export type ZoneKey = 'teams' | 'teamCount' | 'join' | 'code' | 'hub' | 'modes' | 'bar';
export type StyleKey = ZoneKey | 'profile' | 'teamRows';
export type ElStyle = {
  color?: string; // couleur de police
  bg?: string; // couleur de fond
  bgOpacity?: number; // opacité du fond (0 à 1)
  bgNone?: boolean; // fond transparent
  borderColor?: string;
  borderWidth?: number; // en px
  borderNone?: boolean; // aucune bordure (ni lueur)
};
export type PlanetTweak = {
  dx: number; // décalage en cqw
  dy: number;
  scale: number; // taille de l'icône (multiplicateur)
  labelScale?: number; // taille du texte (multiplicateur), indépendante de l'icône
  showLabel?: boolean; // afficher le texte sous l'icône (par défaut oui)
};

export type PlateTweak = { dx: number; dy: number; scale: number }; // boutons de la barre de menu : décalage en cqw + taille

export type Layout = {
  zones: Partial<Record<ZoneKey, Rect>>;
  profile?: { left: number; top: number };
  planets: Partial<Record<ModeId, PlanetTweak>>;
  plates: Partial<Record<string, PlateTweak>>;
  styles: Partial<Record<StyleKey, ElStyle>>;
};

export const EMPTY_LAYOUT: Layout = { zones: {}, planets: {}, plates: {}, styles: {} };

export const PLATE_LABELS: Record<string, string> = {
  parametrage: 'Paramétrage',
  stats: 'Statistiques',
  progression: 'Progression',
  fusee: 'Démarrer / Question suivante',
  nouvelle: 'Nouvelle partie',
  quitter: 'Quitter',
  plein: 'Plein écran',
};
export const ZONE_KEYS: ZoneKey[] = ['teams', 'teamCount', 'join', 'code', 'hub', 'modes', 'bar'];

// Position par défaut des icônes de modes : en haut du hublot du thème (comme avant qu'elles soient indépendantes)
export const defaultModesRect = (hub: Rect): Rect => ({
  left: hub.left,
  top: Number((hub.top + hub.height * 0.08).toFixed(1)),
  width: hub.width,
  height: Number((hub.height * 0.55).toFixed(1)),
});

export const ELEMENT_LABELS: Record<StyleKey, string> = {
  teams: 'Écran gauche (équipes)',
  teamCount: 'Afficheur « nombre d’équipes »',
  join: 'Écran droit (QR / explication)',
  code: 'Afficheur « code »',
  hub: 'Hublot central (texte / jeu)',
  modes: 'Icônes des modes de jeu',
  bar: 'Barre de menu',
  profile: 'Bandeau du profil',
  teamRows: 'Lignes d’équipes',
};
export const CHIP_LABELS: Record<StyleKey, string> = {
  teams: 'Équipes',
  teamCount: 'Nb équipes',
  join: 'QR',
  code: 'Code',
  hub: 'Hublot',
  modes: 'Icônes',
  bar: 'Menu',
  profile: 'Profil',
  teamRows: 'Lignes',
};
export const MODE_LABELS: Record<ModeId, string> = {
  classique: 'Classique',
  defi: 'Défi',
  survie: 'Survie',
  participatif: 'Participatif',
  camembert: 'Trivial Poursuit',
};

export const EDIT_FLAG = 'quiz-party-edit-layout'; // posé par Paramétrage pour ouvrir la console en mode disposition
const storageKey = (id: ThemeId) => `quiz-party-layout-${id}`;

export function loadLayout(id: ThemeId): Layout {
  try {
    const raw = window.localStorage.getItem(storageKey(id));
    if (!raw) return EMPTY_LAYOUT;
    const p = JSON.parse(raw);
    return { zones: p.zones ?? {}, profile: p.profile, planets: p.planets ?? {}, plates: p.plates ?? {}, styles: p.styles ?? {} };
  } catch {
    return EMPTY_LAYOUT;
  }
}
export function saveLayout(id: ThemeId, layout: Layout) {
  try {
    window.localStorage.setItem(storageKey(id), JSON.stringify(layout));
  } catch {
    // stockage indisponible : la disposition vaudra pour cette session seulement
  }
}
export function clearLayout(id: ThemeId) {
  try {
    window.localStorage.removeItem(storageKey(id));
  } catch {
    // ignoré
  }
}

export function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// Réglages choisis -> classe + styles en ligne (la règle .ck-recolor est définie dans app/page.tsx)
export function styleFx(st?: ElStyle): { className: string; style: CSSProperties } {
  const style: Record<string, string> = {};
  if (st?.bgNone) {
    style.background = 'transparent';
    style.backdropFilter = 'none';
  } else if (st?.bg) style.background = hexToRgba(st.bg, st.bgOpacity ?? 0.85);
  if (st?.borderNone) {
    style.border = 'none';
    style.boxShadow = 'none';
  } else if (st?.borderColor || st?.borderWidth !== undefined) {
    style.border = `${st?.borderWidth ?? 1}px solid ${st?.borderColor ?? '#ffffff'}`;
  }
  if (st?.color) style['--ck-color'] = st.color;
  return { className: st?.color ? 'ck-recolor' : '', style: style as CSSProperties };
}

const n1 = (v: number) => Number(v.toFixed(1));

// Texte à coller dans lib/themes.ts pour rendre cette disposition définitive (valeur par défaut du thème)
export function exportSnippet(theme: Theme, zones: Theme['zones'] & { modes: Rect }, layout: Layout): string {
  const rect = (r: Rect) => `{ left: ${n1(r.left)}, top: ${n1(r.top)}, width: ${n1(r.width)}, height: ${n1(r.height)} }`;
  const lines = [
    `// Thème : ${theme.label}`,
    '  zones: {',
    ...ZONE_KEYS.map((k) => `    ${k}: ${rect(zones[k])},`),
    `    profile: { left: ${n1(zones.profile.left)}, top: ${n1(zones.profile.top)} },`,
    '  },',
  ];
  if (Object.keys(layout.planets).length) lines.push('', `// Icônes des modes (décalage en cqw, taille en multiplicateur)`, `planets: ${JSON.stringify(layout.planets)}`);
  if (Object.keys(layout.plates).length) lines.push('', `// Boutons de la barre (décalage en cqw, taille en multiplicateur)`, `plates: ${JSON.stringify(layout.plates)}`);
  if (Object.keys(layout.styles).length) lines.push('', `// Couleurs`, `styles: ${JSON.stringify(layout.styles)}`);
  return lines.join('\n');
}
