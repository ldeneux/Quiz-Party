// Habillages (thèmes) de l'écran d'accueil de l'animateur.
// Un thème = une image de fond + les zones où se placent les écrans (en % de l'image)
// + les images des modes (« planètes ») et des boutons (« plates »).
// Le thème « espace » reprend exactement l'habillage historique : rien ne change tant qu'on ne choisit pas autre chose.

export type ThemeId = 'espace' | 'jungle' | 'marins';
export type ModeId = 'classique' | 'defi' | 'survie' | 'participatif' | 'camembert';

export type PlateId =
  | 'fusee' // démarrer la partie
  | 'suivante' // question suivante
  | 'stats'
  | 'parametrage'
  | 'progression'
  | 'nouvelle'
  | 'quitter'
  | 'plein'
  | 'valider'
  | 'annuler'
  | 'profil';

// Zone rectangulaire, en % de la scène
export type Rect = { left: number; top: number; width: number; height: number };

export type PlateDef = {
  src: string | null; // null = pas d'image (le décor porte déjà le cadre), seul le contenu est affiché
  ratio: number; // largeur / hauteur de l'image
  scale?: number; // multiplicateur de la hauteur demandée (défaut 1)
};

export type FrameDef = { src: string; ratio: number; width: number /* en cqw */ };

export type Theme = {
  id: ThemeId;
  label: string;
  emoji: string;
  description: string;
  preview: string;
  stage: { src: string; ratio: number; bg: string };
  zones: {
    teams: Rect; // écran gauche : liste des équipes
    teamCount: Rect; // petit afficheur : nombre d'équipes
    join: Rect; // écran droit : QR / explication
    code: Rect; // petit afficheur : code de la partie
    hub: Rect; // hublot central : modes ou jeu
    bar: Rect; // pupitre des boutons
    profile: { left: number; top: number }; // bandeau du profil : centre horizontal et haut, en %
  };
  joinPadTop: number; // cqw : espace au-dessus du QR
  qrWidth: number; // cqw
  bar: { background: string; border: string; boxShadow: string };
  planets: Record<ModeId, { src: string; width: number /* cqw */ }>;
  plates: Record<PlateId, PlateDef>;
  frames: { progress: FrameDef; msg: FrameDef };
};

export const rectStyle = (r: Rect) => ({ left: `${r.left}%`, top: `${r.top}%`, width: `${r.width}%`, height: `${r.height}%` });

// ───────────────────────── Espace (habillage d'origine) ─────────────────────────
const espacePlate = (id: string, ratio: number): PlateDef => ({ src: `/ui/plate-${id}.webp`, ratio });

const espace: Theme = {
  id: 'espace',
  label: 'Espace',
  emoji: '🚀',
  description: 'Le cockpit spatial d’origine.',
  preview: '/themes/espace/preview.webp',
  stage: { src: '/cockpit.webp', ratio: 1536 / 944, bg: '#03040c' },
  zones: {
    teams: { left: 1.6, top: 14.3, width: 13.4, height: 26.5 },
    teamCount: { left: 2, top: 42.3, width: 13, height: 3.6 },
    join: { left: 84.6, top: 14.3, width: 14, height: 26.5 },
    code: { left: 85.3, top: 42.3, width: 13, height: 3.6 },
    hub: { left: 20, top: 11.7, width: 60, height: 33.9 },
    bar: { left: 7, top: 88.6, width: 86, height: 9.6 },
    profile: { left: 50, top: 2.2 },
  },
  joinPadTop: 3.4,
  qrWidth: 8,
  bar: {
    background: 'linear-gradient(180deg, rgba(8,16,55,0.55), rgba(4,8,30,0.75))',
    border: '1px solid rgba(90,140,255,0.35)',
    boxShadow: '0 0 1.5cqw rgba(40,90,220,0.3), inset 0 0.1cqw 0.3cqw rgba(140,180,255,0.2)',
  },
  planets: {
    classique: { src: '/planets/classique.png', width: 11.2 },
    defi: { src: '/planets/defi.png', width: 8.2 },
    survie: { src: '/planets/survie.png', width: 8.6 },
    participatif: { src: '/planets/participatif.png', width: 10.9 },
    camembert: { src: '/planets/camembert.png', width: 8.2 },
  },
  plates: {
    fusee: espacePlate('fusee', 1.28),
    suivante: espacePlate('suivante', 1.28),
    stats: espacePlate('stats', 1.284),
    parametrage: espacePlate('parametrage', 1.292),
    progression: espacePlate('progression', 1.292),
    nouvelle: espacePlate('nouvelle', 1.304),
    quitter: espacePlate('quitter', 1.28),
    plein: espacePlate('plein', 1.321),
    valider: espacePlate('valider', 1.317),
    annuler: espacePlate('annuler', 1.308),
    profil: { src: '/ui/banner-profil.webp', ratio: 7.33 },
  },
  frames: {
    progress: { src: '/ui/frame-espace.webp', ratio: 1400 / 788, width: 76 },
    msg: { src: '/ui/frame-terre.webp', ratio: 1400 / 788, width: 54 },
  },
};

// ───────────────────────── Jungle ─────────────────────────
const J = '/themes/jungle';
const jIcon = (name: string, ratio: number, scale = 1.45): PlateDef => ({ src: `${J}/icons/${name}.webp`, ratio, scale });

const jungle: Theme = {
  id: 'jungle',
  label: 'Jungle',
  emoji: '🌴',
  description: 'Un cockpit envahi par la jungle : lianes, perroquets et temples perdus.',
  preview: `${J}/preview.webp`,
  stage: { src: `${J}/stage.webp`, ratio: 1536 / 1024, bg: '#050d08' },
  zones: {
    teams: { left: 3.4, top: 23.8, width: 14.2, height: 33 },
    teamCount: { left: 3.3, top: 60.6, width: 14.4, height: 3.6 },
    join: { left: 82.6, top: 23.8, width: 14.2, height: 33 },
    code: { left: 82.5, top: 60.6, width: 14.4, height: 3.6 },
    hub: { left: 23.9, top: 30.6, width: 52.2, height: 29.8 },
    bar: { left: 18, top: 78.5, width: 64, height: 15 },
    profile: { left: 49.6, top: 5.5 },
  },
  joinPadTop: 2.2,
  qrWidth: 8.6,
  bar: {
    background: 'linear-gradient(180deg, rgba(8,20,12,0.5), rgba(4,10,6,0.72))',
    border: '1px solid rgba(255,190,90,0.4)',
    boxShadow: '0 0 1.5cqw rgba(255,160,40,0.25), inset 0 0.1cqw 0.3cqw rgba(255,220,150,0.2)',
  },
  planets: {
    classique: { src: `${J}/icons/pyramide.webp`, width: 7.6 },
    defi: { src: `${J}/icons/trophee.webp`, width: 7.5 },
    survie: { src: `${J}/icons/feu.webp`, width: 7.7 },
    participatif: { src: `${J}/icons/masques.webp`, width: 8.9 },
    camembert: { src: `${J}/icons/tresor.webp`, width: 7.8 },
  },
  plates: {
    fusee: jIcon('arc', 0.878),
    suivante: jIcon('boussole', 0.841),
    stats: jIcon('carte', 0.913),
    parametrage: jIcon('engrenage', 0.762),
    progression: jIcon('pont', 1.043),
    nouvelle: jIcon('serpent', 0.753),
    quitter: jIcon('piege', 0.971),
    // Provisoire : pas encore d'icône dédiée pour ces trois-là
    plein: jIcon('pyramide', 0.743),
    valider: jIcon('trophee', 0.739),
    annuler: jIcon('piege', 0.971),
    // Le décor porte déjà le cadre du haut : on n'affiche que le nom du profil
    profil: { src: null, ratio: 6.23, scale: 1.08 },
  },
  frames: {
    progress: { src: `${J}/frame.webp`, ratio: 899 / 394, width: 82 },
    msg: { src: `${J}/frame.webp`, ratio: 899 / 394, width: 62 },
  },
};

// ───────────────────────── Fonds marins ─────────────────────────
const M = '/themes/marins';
const mIcon = (name: string, ratio: number, scale = 1.45): PlateDef => ({ src: `${M}/icons/${name}.webp`, ratio, scale });

const marins: Theme = {
  id: 'marins',
  label: 'Fonds marins',
  emoji: '🐠',
  description: 'Un cockpit d’avion englouti : épave, poissons, pieuvre et ruines sous-marines.',
  preview: `${M}/preview.webp`,
  stage: { src: `${M}/stage.webp`, ratio: 1536 / 1024, bg: '#020a14' },
  zones: {
    teams: { left: 3.7, top: 34.2, width: 14.4, height: 26.9 },
    teamCount: { left: 3.6, top: 63.8, width: 14.6, height: 3.4 },
    join: { left: 82, top: 34.2, width: 14.2, height: 27.5 },
    code: { left: 81.9, top: 63.8, width: 14.4, height: 3.4 },
    hub: { left: 24.7, top: 37.5, width: 50.6, height: 25.7 },
    bar: { left: 22, top: 80, width: 56, height: 15 },
    profile: { left: 49.5, top: 7.9 },
  },
  joinPadTop: 2.2,
  qrWidth: 8.6,
  bar: {
    background: 'linear-gradient(180deg, rgba(2,14,28,0.5), rgba(1,8,18,0.75))',
    border: '1px solid rgba(90,200,255,0.4)',
    boxShadow: '0 0 1.5cqw rgba(40,160,255,0.28), inset 0 0.1cqw 0.3cqw rgba(160,225,255,0.2)',
  },
  planets: {
    classique: { src: `${M}/icons/porte.webp`, width: 6.9 },
    defi: { src: `${M}/icons/trophee.webp`, width: 6.7 },
    survie: { src: `${M}/icons/tente.webp`, width: 7.5 },
    participatif: { src: `${M}/icons/dauphins.webp`, width: 7.7 },
    camembert: { src: `${M}/icons/tresor.webp`, width: 8.1 },
  },
  plates: {
    fusee: mIcon('sousmarin', 0.852),
    suivante: mIcon('boussole', 0.752),
    stats: mIcon('carte', 0.709),
    parametrage: mIcon('engrenage', 0.798),
    progression: mIcon('ponton', 0.814),
    nouvelle: mIcon('murene', 0.731),
    quitter: mIcon('mine', 0.783),
    valider: mIcon('coquillage', 0.754),
    annuler: mIcon('harpons', 0.537),
    // Provisoire : pas encore d'icône dédiée au plein écran
    plein: mIcon('porte', 0.732),
    // Le décor porte déjà le cadre du haut : on n'affiche que le nom du profil
    profil: { src: null, ratio: 6.24, scale: 1.05 },
  },
  frames: {
    progress: { src: `${M}/frame.webp`, ratio: 860 / 330, width: 80 },
    msg: { src: `${M}/frame.webp`, ratio: 860 / 330, width: 66 },
  },
};

export const THEMES: Record<ThemeId, Theme> = { espace, jungle, marins };
export const THEME_LIST: Theme[] = [espace, jungle, marins];
export const DEFAULT_THEME_ID: ThemeId = 'espace';
export const THEME_STORAGE_KEY = 'quiz-party-theme';
