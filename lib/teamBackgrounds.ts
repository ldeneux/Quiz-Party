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
  // Espace (les équipes sans fond dédié — Orion, CosmoRiders, Nebula Squad — gardent l'écran standard)
  'Les Explorateurs Cosmiques': bg('explorateurs'),
  'Team Nova': bg('nova'),
  Galaxie: bg('galaxie'),
  'Team Lune': bg('lune'),
  'Team Saturne': bg('saturne'),
  'Les Martiens': bg('martiens'),
  'Les Astronautes': bg('astronautes'),
  'Les Météores': bg('meteores'),
  Zenith: bg('zenith'),
  // Fonds marins (l'emblème n'est pas en haut : peu de place à réserver)
  'Coral Knights': bg('coral-knights', '5vh'),
  'Abyss Serpents': bg('abyss-serpents', '5vh'),
  'Pearl Keepers': bg('pearl-keepers', '5vh'),
  'Tide Guardians': bg('tide-guardians', '5vh'),
  'Kraken Squad': bg('kraken-squad', '5vh'),
  'Sea Lantern Tribe': bg('sea-lantern-tribe', '5vh'),
  SharkRiders: bg('sharkriders', '5vh'),
  'Bubble Rangers': bg('bubble-rangers', '5vh'),
  'Trident Force': bg('trident-force', '5vh'),
  'Starfish Crew': bg('starfish-crew', '5vh'),
  'DeepShell Clan': bg('deepshell-clan', '5vh'),
  'Manta Spirits': bg('manta-spirits', '5vh'),
};

export function getTeamBackground(teamName: string): TeamBg | null {
  return TEAM_BACKGROUNDS[teamName] ?? null;
}
