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
const sports = emptyTheme('sports', 'Sports', '🏅', 'Terrains, ballons et stades. (Page blanche : décor à venir.)');
const voyage = emptyTheme('voyage', 'Voyage', '🧭', 'Mers, boussoles et caravelles. (Page blanche : décor à venir.)');
const peche = emptyTheme('peche', 'Pêche', '🎣', 'Lacs, cannes à pêche et gros poissons. (Page blanche : décor à venir.)');
const aventure = emptyTheme('aventure', 'Aventure', '🗺️', 'Cartes au trésor et expéditions. (Page blanche : décor à venir.)');
const medieval = emptyTheme('medieval', 'Médiéval', '🏰', 'Chevaliers, châteaux et blasons. (Page blanche : décor à venir.)');
const mythologie = emptyTheme('mythologie', 'Mythologie', '⚡', 'Dieux, héros et temples. (Page blanche : décor à venir.)');
const astronomie = emptyTheme('astronomie', 'Astronomie', '🔭', 'Planètes, télescopes et galaxies. (Page blanche : décor à venir.)');
const civilisations = emptyTheme('civilisations', 'Civilisations', '🏛️', 'Monuments et empires du monde. (Page blanche : décor à venir.)');
const iles = emptyTheme('iles', 'Îles', '🏝️', 'Plages, palmiers et perroquets. (Page blanche : décor à venir.)');

// Voyages dans le temps : le décor existe (mammouths et tigres à dents de sabre), les icônes pas encore (neutres)
const temps: Theme = {
  ...emptyTheme('temps', 'Voyages dans le temps', '⏳', 'Un poste de pilotage face à l’ère glaciaire. (Icônes à venir.)'),
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
};

export const EXTRA_THEMES: Record<string, Theme> = { sports, temps, voyage, peche, aventure, medieval, mythologie, astronomie, civilisations, iles };

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
    stage: { src: '/themes/fantasy/stage.webp', ratio: 1536 / 1024, bg: '#1a1038' },
    zones: {
      teams: { left: 2.5, top: 17, width: 16, height: 48 },
      teamCount: { left: 2.5, top: 66.5, width: 16, height: 4.4 },
      join: { left: 81.5, top: 17, width: 16, height: 48 },
      code: { left: 81.5, top: 66.5, width: 16, height: 4.4 },
      hub: { left: 26, top: 44, width: 48, height: 36 },
      modes: { left: 26, top: 8, width: 48, height: 32 },
      bar: { left: 19, top: 85, width: 62, height: 13 },
      profile: { left: 50, top: 2.5 },
    },
  },
};

export const THEME_ORDER: string[] = [
  'espace', 'art', 'marins', 'jungle', 'egypte', 'sports',
  'terre', 'temps', 'voyage', 'peche', 'aventure', 'medieval',
  'mythologie', 'fantasy', 'astronomie', 'sciences', 'inventions', 'civilisations', 'iles',
];
