// Fonds d'écran par équipe (écrans joueurs), rangés PAR THÈME : deux thèmes peuvent avoir une équipe du même nom
// (ex. « Les Pharaons » en Égypte et en Arts) sans confusion.
// Les fichiers sont dans /public/bg/<thème>/ (comme les avatars dans /public/avatars/<thème>/) :
// - portrait : téléphone (et tablette en portrait)
// - landscape : PC / tablette en paysage
// Un seul des deux suffit : l'autre format est alors obtenu en recadrant l'image fournie.
// - contentTop : hauteur (en vh) réservée en haut en mode portrait, pour que le texte
//   ne recouvre pas l'emblème de l'équipe
// Pour ajouter une équipe : déposer les images dans /public/bg/<thème>/ puis ajouter une ligne ici
// (clé 1 = identifiant du thème, clé 2 = nom exact de l'équipe dans lib/teamPresets.ts).
export type TeamBg = { portrait?: string; landscape?: string; contentTop?: string };

// Les deux formats : <thème>/<slug>-portrait.webp et <thème>/<slug>-paysage.webp
const bg = (theme: string, slug: string, contentTop = '9vh'): TeamBg => ({
  portrait: `/bg/${theme}/${slug}-portrait.webp`,
  landscape: `/bg/${theme}/${slug}-paysage.webp`,
  contentTop,
});

export const TEAM_BACKGROUNDS: Record<string, Record<string, TeamBg>> = {
  // Espace (Orion, Les Chevaucheurs d’Étoiles et Les Nébuleuses n'ont pas de fond dédié : écran standard)
  espace: {
    'Les Explorateurs Cosmiques': bg('espace', 'explorateurs'),
    'Les Novas': bg('espace', 'nova'),
    'Galaxie': bg('espace', 'galaxie'),
    'Les Lunaires': bg('espace', 'lune'),
    'Les Saturniens': bg('espace', 'saturne'),
    'Les Martiens': bg('espace', 'martiens'),
    'Les Astronautes': bg('espace', 'astronautes'),
    'Les Météores': bg('espace', 'meteores'),
    'Zénith': bg('espace', 'zenith'),
  },
  // Fonds marins (l'emblème n'est pas en haut : peu de place à réserver)
  marins: {
    'Les Chevaliers du Corail': bg('marins', 'coral-knights', '5vh'),
    'Les Serpents des Abysses': bg('marins', 'abyss-serpents', '5vh'),
    'Les Gardiens des Perles': bg('marins', 'pearl-keepers', '5vh'),
    'Les Gardiens des Marées': bg('marins', 'tide-guardians', '5vh'),
    'Les Krakens': bg('marins', 'kraken-squad', '5vh'),
    'La Tribu des Lanternes': bg('marins', 'sea-lantern-tribe', '5vh'),
    'Les Chevaucheurs de Requins': bg('marins', 'sharkriders', '5vh'),
    'Les Rangers des Bulles': bg('marins', 'bubble-rangers', '5vh'),
    'La Force du Trident': bg('marins', 'trident-force', '5vh'),
    'L’Équipage des Étoiles de Mer': bg('marins', 'starfish-crew', '5vh'),
    'Le Clan des Coquillages': bg('marins', 'deepshell-clan', '5vh'),
    'Les Esprits Manta': bg('marins', 'manta-spirits', '5vh'),
  },
  // Arts (cadre Renaissance + paysage italien : version paysage seule, la version portrait en est recadrée)
  art: {
    'Les Jocondiers': { landscape: '/bg/art/jocondiers-paysage.webp', contentTop: '5vh' },
  },
};

export function getTeamBackground(themeId: string | null | undefined, teamName: string): TeamBg | null {
  if (!themeId) return null;
  return TEAM_BACKGROUNDS[themeId]?.[teamName] ?? null;
}
