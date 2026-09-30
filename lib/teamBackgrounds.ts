// Fonds d'écran par équipe (écrans joueurs). Les fichiers sont dans /public/bg.
// - portrait : téléphone (et tablette en portrait)
// - landscape : PC / tablette en paysage (optionnel : sans lui, le fond portrait est recadré)
// Pour ajouter une équipe : déposer les images dans /public/bg puis ajouter une ligne ici
// (la clé est le nom exact de l'équipe dans lib/teamPresets.ts).
export type TeamBg = { portrait: string; landscape?: string };

export const TEAM_BACKGROUNDS: Record<string, TeamBg> = {
  'Les Explorateurs': { portrait: '/bg/explorateurs-portrait.webp' },
};

export function getTeamBackground(teamName: string): TeamBg | null {
  return TEAM_BACKGROUNDS[teamName] ?? null;
}
