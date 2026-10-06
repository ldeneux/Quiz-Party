import type { CSSProperties } from 'react';
import type { ModeId, PlateDef, PlateId, Rect, Theme } from './themes';

// Habillages complémentaires et remplacements, branchés dans lib/themes.ts (voir tools/apply-themes-patch.mjs).
//  - THEME_OVERRIDES : remplace le décor (et les zones) de thèmes déjà définis (Espace, Fantasy)
//  - EXTRA_THEMES    : thèmes ajoutés. Un thème sans images propres s'affiche sur une page blanche,
//                      avec des boutons et des icônes neutres : il ne reprend JAMAIS l'habillage d'un autre thème.
//  - THEME_ORDER     : ordre d'affichage dans Paramétrage (celui de la planche de badges)

const MODES: ModeId[] = ['classique', 'defi', 'survie', 'participatif', 'camembert'];
const PLATES: PlateId[] = ['fusee', 'suivante', 'stats', 'parametrage', 'progression', 'nouvelle', 'quitter', 'plein', 'valider', 'annuler'];

// ── Style neutre (thèmes sans images) ──
const neutral = {
  background: 'linear-gradient(180deg, rgba(26,32,54,0.94), rgba(18,22,40,0.96))',
  border: '2px solid rgba(150,170,220,0.65)',
  boxShadow: '0 0 1.6cqw rgba(110,140,220,0.25), inset 0 0 1.2cqw rgba(150,170,220,0.12)',
};
const plateBox: CSSProperties = { ...neutral, borderRadius: '1cqw', color: '#e8eeff', fontSize: '0.75cqw', fontWeight: 800, textAlign: 'center' };

function emptyTheme(id: string, label: string, emoji: string, description: string): Theme {
  const plates = {} as Record<PlateId | 'profil', PlateDef>;
  PLATES.forEach((p) => (plates[p] = { src: null, ratio: 1, scale: 1.3, boxStyle: plateBox }));
  plates.profil = { src: null, ratio: 6.2, boxStyle: { ...neutral, borderRadius: '1.6cqw' } };
  const planets = {} as Record<ModeId, { src: string | null; width: number }>;
  MODES.forEach((m) => (planets[m] = { src: null, width: 8 })); // null => icône de mode neutre (public/modes)
  // Le typage est volontairement souple : ce fichier compile que lib/themes.ts soit déjà adapté (planets / ThemeId) ou non
  return {
    id,
    label,
    emoji,
    description,
    preview: `/themes/${id}/preview.webp`,
    stage: { src: '/themes/blanc/stage.webp', ratio: 1672 / 941, bg: '#ffffff' },
    zones: {
      teams: { left: 3, top: 20, width: 15, height: 38 },
      teamCount: { left: 3, top: 60, width: 15, height: 4 },
      join: { left: 82, top: 20, width: 15, height: 38 },
      code: { left: 82, top: 60, width: 15, height: 4 },
      hub: { left: 22, top: 14, width: 56, height: 44 },
      bar: { left: 19, top: 80, width: 62, height: 15 },
      profile: { left: 50, top: 3.2 },
    },
    hubStyle: { ...neutral, borderRadius: '1.8cqw' },
    sidePanelStyle: { background: 'rgba(26,32,54,0.94)', border: '1px solid rgba(150,170,220,0.55)', borderRadius: '0.8cqw' },
    joinPadTop: 2.2,
    qrWidth: 8.6,
    bar: { ...neutral, background: 'linear-gradient(180deg, rgba(26,32,54,0.8), rgba(18,22,40,0.9))' },
    planets,
    plates,
    frames: {
      progress: { src: '/themes/blanc/frame.webp', ratio: 1400 / 614, width: 80 },
      msg: { src: '/themes/blanc/frame.webp', ratio: 1400 / 614, width: 62 },
    },
  } as unknown as Theme;
}

// ── Thèmes ajoutés ──
const voyage = emptyTheme('voyage', 'Voyage', '🧭', 'Mers, boussoles et caravelles. (Page blanche : décor à venir.)');
const peche = emptyTheme('peche', 'Pêche', '🎣', 'Lacs, cannes à pêche et gros poissons. (Page blanche : décor à venir.)');
const aventure = emptyTheme('aventure', 'Aventure', '🗺️', 'Cartes au trésor et expéditions. (Page blanche : décor à venir.)');
const medieval = emptyTheme('medieval', 'Médiéval', '🏰', 'Chevaliers, châteaux et blasons. (Page blanche : décor à venir.)');
const astronomie = emptyTheme('astronomie', 'Astronomie', '🔭', 'Planètes, télescopes et galaxies. (Page blanche : décor à venir.)');
const civilisations = emptyTheme('civilisations', 'Civilisations', '🏛️', 'Monuments et empires du monde. (Page blanche : décor à venir.)');
const iles = emptyTheme('iles', 'Îles', '🏝️', 'Plages, palmiers et perroquets. (Page blanche : décor à venir.)');

// Voyages dans le temps : décor (mammouths et tigres à dents de sabre) + icônes de modes et de menu néon
const tempsGlass = {
  background: 'linear-gradient(180deg, rgba(6,14,34,0.72), rgba(4,10,26,0.82))',
  border: '2px solid rgba(90,200,255,0.65)',
  boxShadow: '0 0 2cqw rgba(60,160,255,0.3), inset 0 0 1.4cqw rgba(120,200,255,0.16)',
};
const temps: Theme = {
  ...emptyTheme('temps', 'Voyages dans le temps', '⏳', 'Un poste de pilotage face à l’ère glaciaire, entre mammouths et civilisations.'),
  stage: { src: '/themes/temps/stage.webp', ratio: 1536 / 1024, bg: '#07101c' },
  zones: {
    teams: { left: 3.4, top: 9, width: 15.6, height: 46 },
    teamCount: { left: 3.4, top: 56.6, width: 15.6, height: 4.4 },
    join: { left: 81, top: 9, width: 15.6, height: 46 },
    code: { left: 81, top: 56.6, width: 15.6, height: 4.4 },
    hub: { left: 22, top: 14, width: 56, height: 50 },
    bar: { left: 19, top: 81, width: 62, height: 15 },
    profile: { left: 50, top: 3 },
  },
  hubStyle: {
    background: 'radial-gradient(ellipse at center, rgba(6,16,32,0.72) 0%, rgba(6,16,32,0.5) 55%, rgba(6,16,32,0) 100%)',
    textShadow: '0 1px 4px rgba(0,10,30,0.95), 0 0 10px rgba(0,10,30,0.8)',
  },
  sidePanelStyle: { background: 'rgba(6,16,32,0.88)', border: '1px solid rgba(110,190,255,0.55)', borderRadius: '0.8cqw' },
  bar: { ...tempsGlass, background: 'linear-gradient(180deg, rgba(6,14,34,0.62), rgba(4,10,26,0.8))' },
  planets: {
    classique: { src: '/themes/temps/icons/classique.webp', width: 9 },
    defi: { src: '/themes/temps/icons/defi.webp', width: 9 },
    survie: { src: '/themes/temps/icons/survie.webp', width: 9 },
    participatif: { src: '/themes/temps/icons/participatif.webp', width: 9 },
    camembert: { src: '/themes/temps/icons/camembert.webp', width: 9 },
  },
  plates: {
    ...Object.fromEntries(PLATES.map((p) => [p, { src: `/themes/temps/icons/${p}.webp`, ratio: 1, scale: 1.3 }])),
    profil: { src: null, ratio: 6.2, boxStyle: { ...tempsGlass, borderRadius: '1.6cqw' } },
  } as unknown as Theme['plates'],
  frames: {
    progress: { src: '/themes/temps/frame.webp', ratio: 1400 / 614, width: 80 },
    msg: { src: '/themes/temps/frame.webp', ratio: 1400 / 614, width: 62 },
  },
};


// ── Sucrerie : royaume de bonbons (décor, icônes, vidéo de lancement) ──
const sucreGlass = {
  background: 'linear-gradient(180deg, rgba(74,32,52,0.8), rgba(54,22,40,0.88))',
  border: '2px solid rgba(255,170,210,0.75)',
  boxShadow: '0 0 2cqw rgba(255,120,180,0.35), inset 0 0 1.4cqw rgba(255,200,230,0.2)',
};
const sucrerie: Theme = {
  ...emptyTheme('sucrerie', 'Sucrerie', '🍬', 'Un royaume de bonbons : sucettes, chocolat et caramel.'),
  stage: { src: '/themes/sucrerie/stage.webp', ratio: 1672 / 941, bg: '#f4b6d2' },
  zones: {
    teams: { left: 4.2, top: 24.5, width: 16.4, height: 27.5 },
    teamCount: { left: 4.2, top: 52.6, width: 16.4, height: 3.6 },
    join: { left: 79.6, top: 26.2, width: 16.8, height: 27 },
    code: { left: 79.6, top: 53.6, width: 16.8, height: 3.6 },
    hub: { left: 24, top: 49, width: 52, height: 29 },
    bar: { left: 6, top: 82.2, width: 88, height: 14.5 },
    profile: { left: 50, top: 3 },
  },
  // Panneaux blancs et champ de sucre très clairs : fonds chocolat pour que le texte reste lisible
  hubStyle: {
    background: 'radial-gradient(ellipse at center, rgba(70,28,48,0.74) 0%, rgba(70,28,48,0.52) 55%, rgba(70,28,48,0) 100%)',
    textShadow: '0 1px 4px rgba(40,10,24,0.95), 0 0 10px rgba(40,10,24,0.8)',
  },
  sidePanelStyle: { background: 'rgba(74,32,52,0.9)', border: '1px solid rgba(255,170,210,0.7)', borderRadius: '1cqw' },
  bar: { background: 'transparent', border: 'none', boxShadow: 'none' }, // la barre de caramel du décor sert de pupitre
  planets: {
    classique: { src: '/themes/sucrerie/icons/classique.webp', width: 8.1 },
    defi: { src: '/themes/sucrerie/icons/defi.webp', width: 8.4 },
    survie: { src: '/themes/sucrerie/icons/survie.webp', width: 7.7 },
    participatif: { src: '/themes/sucrerie/icons/participatif.webp', width: 9.5 },
    camembert: { src: '/themes/sucrerie/icons/camembert.webp', width: 9.4 },
  },
  plates: {
    fusee: { src: '/themes/sucrerie/icons/fusee.webp', ratio: 0.839, scale: 1.3 },
    suivante: { src: '/themes/sucrerie/icons/suivante.webp', ratio: 0.983, scale: 1.3 },
    stats: { src: '/themes/sucrerie/icons/stats.webp', ratio: 0.904, scale: 1.3 },
    parametrage: { src: '/themes/sucrerie/icons/parametrage.webp', ratio: 0.972, scale: 1.3 },
    progression: { src: '/themes/sucrerie/icons/progression.webp', ratio: 1.082, scale: 1.3 },
    nouvelle: { src: '/themes/sucrerie/icons/nouvelle.webp', ratio: 0.836, scale: 1.3 },
    quitter: { src: '/themes/sucrerie/icons/quitter.webp', ratio: 1.065, scale: 1.3 },
    plein: { src: '/themes/sucrerie/icons/plein.webp', ratio: 1.0, scale: 1.3 },
    valider: { src: '/themes/sucrerie/icons/valider.webp', ratio: 1.0, scale: 1.3 },
    annuler: { src: '/themes/sucrerie/icons/annuler.webp', ratio: 1.0, scale: 1.3 },
    profil: { src: null, ratio: 6.2, boxStyle: { ...sucreGlass, borderRadius: '1.6cqw' } },
  } as unknown as Theme['plates'],
  frames: {
    progress: { src: '/themes/sucrerie/frame.webp', ratio: 1400 / 614, width: 80 },
    msg: { src: '/themes/sucrerie/frame.webp', ratio: 1400 / 614, width: 62 },
  },
};

// ── Mythologie : l'Olympe et ses dieux ──
const mythGlass = {
  background: 'linear-gradient(180deg, rgba(14,20,50,0.78), rgba(10,14,38,0.86))',
  border: '2px solid rgba(240,200,100,0.75)',
  boxShadow: '0 0 2cqw rgba(255,200,90,0.3), inset 0 0 1.4cqw rgba(255,220,140,0.16)',
};
const mythologie: Theme = {
  ...emptyTheme('mythologie', 'Mythologie', '⚡', 'L’Olympe, ses dieux et ses légendes venues du monde entier.'),
  stage: { src: '/themes/mythologie/stage.webp', ratio: 1672 / 941, bg: '#1a2450' },
  zones: {
    teams: { left: 5.2, top: 38.5, width: 12.2, height: 33 },
    teamCount: { left: 5.2, top: 72.4, width: 12.2, height: 3.6 },
    join: { left: 84.4, top: 30, width: 13.2, height: 36 },
    code: { left: 84.4, top: 67.4, width: 13.2, height: 3.6 },
    hub: { left: 27.2, top: 32.5, width: 46, height: 37 },
    bar: { left: 22, top: 86.5, width: 56, height: 11.5 },
    profile: { left: 50, top: 9.4 },
  },
  hubStyle: {
    background: 'radial-gradient(ellipse at center, rgba(8,14,40,0.72) 0%, rgba(8,14,40,0.5) 55%, rgba(8,14,40,0) 100%)',
    textShadow: '0 1px 4px rgba(0,6,24,0.95), 0 0 10px rgba(0,6,24,0.8)',
  },
  sidePanelStyle: { background: 'rgba(14,20,50,0.88)', border: '1px solid rgba(240,200,100,0.7)', borderRadius: '0.8cqw' },
  bar: { ...mythGlass, background: 'linear-gradient(180deg, rgba(14,20,50,0.55), rgba(10,14,38,0.78))' },
  planets: {
    classique: { src: '/themes/mythologie/icons/classique.webp', width: 8.4 },
    defi: { src: '/themes/mythologie/icons/defi.webp', width: 7.5 },
    survie: { src: '/themes/mythologie/icons/survie.webp', width: 8.0 },
    participatif: { src: '/themes/mythologie/icons/participatif.webp', width: 8.7 },
    camembert: { src: '/themes/mythologie/icons/camembert.webp', width: 8.4 },
  },
  plates: {
    fusee: { src: '/themes/mythologie/icons/fusee.webp', ratio: 0.92, scale: 1.3 },
    suivante: { src: '/themes/mythologie/icons/suivante.webp', ratio: 1.041, scale: 1.3 },
    stats: { src: '/themes/mythologie/icons/stats.webp', ratio: 0.957, scale: 1.3 },
    parametrage: { src: '/themes/mythologie/icons/parametrage.webp', ratio: 1.02, scale: 1.3 },
    progression: { src: '/themes/mythologie/icons/progression.webp', ratio: 0.91, scale: 1.3 },
    nouvelle: { src: '/themes/mythologie/icons/nouvelle.webp', ratio: 1.053, scale: 1.3 },
    quitter: { src: '/themes/mythologie/icons/quitter.webp', ratio: 0.944, scale: 1.3 },
    plein: { src: '/themes/mythologie/icons/plein.webp', ratio: 0.987, scale: 1.3 },
    valider: { src: '/themes/mythologie/icons/valider.webp', ratio: 1.0, scale: 1.3 },
    annuler: { src: '/themes/mythologie/icons/annuler.webp', ratio: 1.0, scale: 1.3 },
    profil: { src: null, ratio: 5, boxStyle: { ...mythGlass, borderRadius: '1.6cqw' }, scale: 0.8 },
  } as unknown as Theme['plates'],
  frames: {
    progress: { src: '/themes/mythologie/frame.webp', ratio: 1400 / 614, width: 80 },
    msg: { src: '/themes/mythologie/frame.webp', ratio: 1400 / 614, width: 62 },
  },
};

// ── Sports : décor ajouté (îles flottantes), icônes à venir (neutres) ──
const sports: Theme = {
  ...emptyTheme('sports', 'Sports', '🏅', 'Des îles flottantes dédiées au sport. (Icônes à venir.)'),
  stage: { src: '/themes/sports/stage.webp', ratio: 1672 / 940, bg: '#0a2a7a' },
  zones: {
    teams: { left: 1.5, top: 24, width: 15, height: 36 },
    teamCount: { left: 1.5, top: 61.2, width: 15, height: 4 },
    join: { left: 83.5, top: 14, width: 15, height: 36 },
    code: { left: 83.5, top: 51.2, width: 15, height: 4 },
    hub: { left: 31, top: 12, width: 50, height: 42 },
    bar: { left: 19, top: 82, width: 62, height: 15 },
    profile: { left: 50, top: 3 },
  },
  hubStyle: {
    background: 'radial-gradient(ellipse at center, rgba(6,20,70,0.72) 0%, rgba(6,20,70,0.5) 55%, rgba(6,20,70,0) 100%)',
    textShadow: '0 1px 4px rgba(0,8,40,0.95), 0 0 10px rgba(0,8,40,0.8)',
  },
  sidePanelStyle: { background: 'rgba(8,24,80,0.86)', border: '1px solid rgba(110,190,255,0.65)', borderRadius: '0.8cqw' },
};

export const EXTRA_THEMES: Record<string, Theme> = { sucrerie, sports, temps, voyage, peche, aventure, medieval, mythologie, astronomie, civilisations, iles };

// ── Remplacements de décor ──
// Espace : nouveau poste de pilotage (l'astronaute). Les boutons et icônes existants sont conservés.
// Fantasy : nouvelle illustration (portail). Elle n'a pas d'écrans : les panneaux sont posés par-dessus la scène.
type OverrideZones = Partial<Theme['zones']> & { modes?: Rect };
export const THEME_OVERRIDES: Record<string, Omit<Partial<Theme>, 'zones'> & { zones?: OverrideZones }> = {
  espace: {
    stage: { src: '/themes/espace/stage.webp', ratio: 1600 / 983, bg: '#03040c' },
    zones: {
      teams: { left: 1.6, top: 12.9, width: 13.2, height: 26.6 },
      teamCount: { left: 1.6, top: 42, width: 13.2, height: 3.4 },
      join: { left: 85.2, top: 12.9, width: 13.2, height: 26.6 },
      code: { left: 85.2, top: 42, width: 13.2, height: 3.4 },
      hub: { left: 20.8, top: 11, width: 58.4, height: 40 },
      bar: { left: 7, top: 88.4, width: 86, height: 9.6 },
      profile: { left: 50, top: 2.2 },
    },
  },
  fantasy: {
    stage: { src: '/themes/fantasy/stage.webp', ratio: 1672 / 941, bg: '#1a1038' },
    zones: {
      teams: { left: 1.8, top: 16, width: 15.5, height: 46 },
      teamCount: { left: 1.8, top: 63.2, width: 15.5, height: 4.2 },
      join: { left: 82.7, top: 16, width: 15.5, height: 46 },
      code: { left: 82.7, top: 63.2, width: 15.5, height: 4.2 },
      hub: { left: 30, top: 44, width: 40, height: 32 },
      modes: { left: 27, top: 8, width: 46, height: 30 },
      bar: { left: 19, top: 85, width: 62, height: 13 },
      profile: { left: 50, top: 2.5 },
    },
  },
};

export const THEME_ORDER: string[] = [
  'sucrerie', 'espace', 'art', 'marins', 'jungle', 'egypte', 'sports',
  'terre', 'temps', 'voyage', 'peche', 'aventure', 'medieval',
  'mythologie', 'fantasy', 'astronomie', 'sciences', 'inventions', 'civilisations', 'iles',
];
