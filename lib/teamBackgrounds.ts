// Fonds d'écran par équipe (écrans joueurs). Les fichiers sont dans /public/bg.
// - portrait : téléphone (et tablette en portrait)
// - landscape : PC / tablette en paysage (sans lui, le fond portrait est recadré)
// - contentTop : hauteur (en vh) réservée en haut en mode portrait, pour que le texte
//   ne recouvre pas l'emblème de l'équipe
// Pour ajouter une équipe : déposer les images dans /public/bg puis ajouter une ligne ici
// (la clé est le nom exact de l'équipe dans lib/teamPresets.ts).
export type TeamBg = { portrait: string; landscape?: string; contentTop?: string };

const bg = (slug: string, contentTop = '9vh'): TeamBg => ({
  portrait: `/bg/${slug}-portrait.webp`,
  landscape: `/bg/${slug}-paysage.webp`,
  contentTop,
});

export const TEAM_BACKGROUNDS: Record<string, TeamBg> = {
  'Les Explorateurs': bg('explorateurs'),
  'Team Nova': bg('nova'),
  Galaxie: bg('galaxie'),
  'Team Lune': bg('lune'),
  'Team Saturne': bg('saturne'),
  'Les Comètes': bg('cometes'),
  'Les Martiens': bg('martiens'),
  'Les Astronautes': bg('astronautes'),
  'Les Météores': bg('meteores'),
  Zenith: bg('zenith'),
  'Les Étoiles Filantes': bg('etoiles-filantes'),
  Orbit: bg('astronautes'), // en attendant un fond dédié : même image que les Astronautes
};

export function getTeamBackground(teamName: string): TeamBg | null {
  return TEAM_BACKGROUNDS[teamName] ?? null;
}
