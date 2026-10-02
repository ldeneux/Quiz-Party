import type { CSSProperties } from 'react';

// Habillages (thèmes) de l'écran d'accueil de l'animateur.
// Un thème = une image de fond + les zones où se placent les écrans (en % de l'image)
// + les images des modes (« planètes ») et des boutons (« plates »).
// Le thème « espace » reprend exactement l'habillage historique : rien ne change tant qu'on ne choisit pas autre chose.

export type ThemeId = 'espace' | 'jungle' | 'marins' | 'egypte';
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
  boxStyle?: CSSProperties; // habillage CSS du bouton lui-même (utile quand il n'y a pas d'image)
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
  hubStyle?: CSSProperties; // fond du hublot central quand le décor n'en fournit pas
  sidePanelStyle?: CSSProperties; // fond des panneaux gauche/droite quand le décor est trop clair pour le texte
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
const mIcon = (name: string, ratio = 1, scale = 1.3): PlateDef => ({ src: `${M}/icons/${name}.webp`, ratio, scale });
const marinGlass = {
  background: 'linear-gradient(180deg, rgba(4,26,54,0.72), rgba(3,16,38,0.8))',
  border: '2px solid rgba(90,210,255,0.6)',
  boxShadow: '0 0 2cqw rgba(40,170,255,0.35), inset 0 0 1.4cqw rgba(120,220,255,0.18)',
};

const marins: Theme = {
  id: 'marins',
  label: 'Fonds marins',
  emoji: '🐠',
  description: 'Une cité engloutie, des rayons de lumière et des récifs colorés.',
  preview: `${M}/preview.webp`,
  stage: { src: `${M}/stage.webp`, ratio: 1672 / 941, bg: '#04223f' },
  zones: {
    teams: { left: 3.1, top: 30, width: 14.2, height: 29 },
    teamCount: { left: 3.1, top: 60.3, width: 14.2, height: 3.6 },
    join: { left: 82.8, top: 30, width: 14.2, height: 29.5 },
    code: { left: 82.8, top: 61, width: 14.2, height: 3.6 },
    hub: { left: 22, top: 17, width: 56, height: 36 },
    bar: { left: 19, top: 82.5, width: 62, height: 14.5 },
    profile: { left: 50, top: 3.5 },
  },
  // Pas de grand écran central dans le décor : simple halo sombre, sans bord, pour garder le texte lisible
  hubStyle: {
    background: 'radial-gradient(ellipse at center, rgba(2,22,48,0.5) 0%, rgba(2,22,48,0.3) 55%, rgba(2,22,48,0) 100%)',
    textShadow: '0 1px 4px rgba(0,20,50,0.95), 0 0 10px rgba(0,20,50,0.8)',
  },
  joinPadTop: 2.2,
  qrWidth: 8.6,
  bar: { ...marinGlass, background: 'linear-gradient(180deg, rgba(4,26,54,0.62), rgba(3,16,38,0.78))' },
  planets: {
    classique: { src: `${M}/icons/ancre.webp`, width: 8.0 },
    defi: { src: `${M}/icons/requin.webp`, width: 9.5 },
    survie: { src: `${M}/icons/bouteille.webp`, width: 8.5 },
    participatif: { src: `${M}/icons/poissons.webp`, width: 9.6 },
    camembert: { src: `${M}/icons/nautile.webp`, width: 9.2 },
  },
  plates: {
    fusee: mIcon('plongeur', 0.982),
    suivante: mIcon('harpon', 0.987),
    stats: mIcon('nemo', 0.982),
    parametrage: mIcon('oursin', 0.996),
    progression: mIcon('coffre', 0.987),
    nouvelle: mIcon('coquillage', 0.987),
    quitter: mIcon('pieuvre', 0.996),
    valider: mIcon('valider'),
    annuler: mIcon('annuler'),
    plein: mIcon('plein'),
    // Pas de cadre dans le décor : le bandeau du profil est un panneau vitré
    profil: { src: null, ratio: 6.2, boxStyle: { ...marinGlass, borderRadius: '1.6cqw' } },
  },
  frames: {
    progress: { src: `${M}/frame.webp`, ratio: 1400 / 614, width: 80 },
    msg: { src: `${M}/frame.webp`, ratio: 1400 / 614, width: 62 },
  },
};

// ───────────────────────── Égypte ─────────────────────────
const G = '/themes/egypte';
const gIcon = (name: string, ratio: number, scale = 1.3): PlateDef => ({ src: `${G}/icons/${name}.webp`, ratio, scale });
const egypteGlass = {
  background: 'linear-gradient(180deg, rgba(34,20,8,0.72), rgba(24,13,5,0.8))',
  border: '2px solid rgba(235,180,70,0.7)',
  boxShadow: '0 0 2cqw rgba(255,180,60,0.3), inset 0 0 1.4cqw rgba(255,210,120,0.18)',
};

const egypte: Theme = {
  id: 'egypte',
  label: 'Égypte',
  emoji: '🏺',
  description: 'Un temple au bord du Nil : colonnes, hiéroglyphes et lumière dorée.',
  preview: `${G}/preview.webp`,
  stage: { src: `${G}/stage.webp`, ratio: 1672 / 941, bg: '#2a1706' },
  zones: {
    teams: { left: 5.9, top: 31, width: 13.6, height: 32 },
    teamCount: { left: 5.9, top: 65.5, width: 13.6, height: 3.6 },
    join: { left: 80.7, top: 31, width: 14, height: 32.5 },
    code: { left: 81, top: 65.5, width: 13.6, height: 3.6 },
    hub: { left: 22, top: 17, width: 56, height: 36 },
    bar: { left: 19, top: 82.5, width: 62, height: 14.5 },
    profile: { left: 50, top: 3.5 },
  },
  // Décor très lumineux : halo brun un peu plus marqué, toujours sans bord
  hubStyle: {
    background: 'radial-gradient(ellipse at center, rgba(34,18,4,0.64) 0%, rgba(34,18,4,0.44) 55%, rgba(34,18,4,0) 100%)',
    textShadow: '0 1px 4px rgba(20,8,0,0.95), 0 0 10px rgba(20,8,0,0.8)',
  },
  // Les stèles sont en pierre claire : on fonce le fond pour le texte clair
  sidePanelStyle: { background: 'rgba(30,16,6,0.74)', border: '1px solid rgba(235,180,70,0.55)', borderRadius: '0.8cqw' },
  joinPadTop: 2.2,
  qrWidth: 8.6,
  bar: { ...egypteGlass, background: 'linear-gradient(180deg, rgba(34,20,8,0.6), rgba(24,13,5,0.78))' },
  planets: {
    classique: { src: `${G}/icons/ankh.webp`, width: 8.6 },
    defi: { src: `${G}/icons/lionne.webp`, width: 8.7 },
    survie: { src: `${G}/icons/oeil.webp`, width: 9.8 },
    participatif: { src: `${G}/icons/papyrus_mains.webp`, width: 9.8 },
    camembert: { src: `${G}/icons/roue.webp`, width: 9.7 },
  },
  plates: {
    fusee: gIcon('faucon', 1.031),
    suivante: gIcon('porte_ouverte', 0.95),
    stats: gIcon('papyrus_faucon', 1.027),
    parametrage: gIcon('scarabee', 0.939),
    progression: gIcon('pyramide', 0.962),
    nouvelle: gIcon('coffre', 1.007),
    quitter: gIcon('porte', 0.886),
    valider: gIcon('valider', 1),
    annuler: gIcon('annuler', 1),
    plein: gIcon('plein', 1),
    profil: { src: null, ratio: 6.2, boxStyle: { ...egypteGlass, borderRadius: '1.6cqw' } },
  },
  frames: {
    progress: { src: `${G}/frame.webp`, ratio: 1400 / 614, width: 80 },
    msg: { src: `${G}/frame.webp`, ratio: 1400 / 614, width: 62 },
  },
};

export const THEMES: Record<ThemeId, Theme> = { espace, jungle, marins, egypte };
export const THEME_LIST: Theme[] = [espace, jungle, marins, egypte];
export const DEFAULT_THEME_ID: ThemeId = 'espace';
export const THEME_STORAGE_KEY = 'quiz-party-theme';
