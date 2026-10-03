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
  // Espace (Orion, Les Chevaucheurs d’Étoiles et Les Nébuleuses n'ont pas de fond dédié : écran standard)
  'Les Explorateurs Cosmiques': bg('explorateurs'),
  'Les Novas': bg('nova'),
  'Galaxie': bg('galaxie'),
  'Les Lunaires': bg('lune'),
  'Les Saturniens': bg('saturne'),
  'Les Martiens': bg('martiens'),
  'Les Astronautes': bg('astronautes'),
  'Les Météores': bg('meteores'),
  'Zénith': bg('zenith'),
  // Fonds marins (l'emblème n'est pas en haut : peu de place à réserver)
  'Les Chevaliers du Corail': bg('coral-knights', '5vh'),
  'Les Serpents des Abysses': bg('abyss-serpents', '5vh'),
  'Les Gardiens des Perles': bg('pearl-keepers', '5vh'),
  'Les Gardiens des Marées': bg('tide-guardians', '5vh'),
  'Les Krakens': bg('kraken-squad', '5vh'),
  'La Tribu des Lanternes': bg('sea-lantern-tribe', '5vh'),
  'Les Chevaucheurs de Requins': bg('sharkriders', '5vh'),
  'Les Rangers des Bulles': bg('bubble-rangers', '5vh'),
  'La Force du Trident': bg('trident-force', '5vh'),
  'L’Équipage des Étoiles de Mer': bg('starfish-crew', '5vh'),
  'Le Clan des Coquillages': bg('deepshell-clan', '5vh'),
  'Les Esprits Manta': bg('manta-spirits', '5vh'),
};

export function getTeamBackground(teamName: string): TeamBg | null {
  return TEAM_BACKGROUNDS[teamName] ?? null;
}
