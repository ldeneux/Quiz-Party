// Présets de noms/avatars/couleurs d'équipe proposés à l'enrôlement.
// Regroupés par thème visuel — on peut en ajouter facilement (jungle, pirates...).

export type TeamPreset = {
  name: string;
  avatar: string;
  color: string;
};

export const TEAM_PRESETS: Record<string, TeamPreset[]> = {
  espace: [
    { name: 'Les Comètes', avatar: '☄️', color: '#ff7a68' },
    { name: 'Team Nova', avatar: '🌟', color: '#ffb648' },
    { name: 'Les Astronautes', avatar: '🧑\u200d🚀', color: '#6c7bf7' },
    { name: 'Zenith', avatar: '🔭', color: '#4fb0e8' },
    { name: 'Les Explorateurs', avatar: '🧭', color: '#35c2a3' },
    { name: 'Galaxie', avatar: '🌌', color: '#a26ce0' },
    { name: 'Les Météores', avatar: '🌠', color: '#ff9a5a' },
    { name: 'Team Saturne', avatar: '🪐', color: '#4fb0e8' },
    { name: 'Les Étoiles Filantes', avatar: '⭐', color: '#ffb648' },
    { name: 'Orbit', avatar: '🛰️', color: '#6c7bf7' },
    { name: 'Les Martiens', avatar: '👽', color: '#35c2a3' },
    { name: 'Team Lune', avatar: '🌙', color: '#a26ce0' },
    { name: 'Les Éclairs', avatar: '⚡', color: '#ffb648' },
    { name: 'Supernova', avatar: '💥', color: '#ff7a68' },
    { name: 'Les Voyageurs', avatar: '🚀', color: '#6c7bf7' },
    { name: 'Team Cosmos', avatar: '🌀', color: '#a26ce0' },
    { name: 'Les Pionniers', avatar: '🛸', color: '#4fb0e8' },
    { name: 'Andromède', avatar: '✨', color: '#35c2a3' },
    { name: 'Les Satellites', avatar: '📡', color: '#ff9a5a' },
    { name: 'Team Infini', avatar: '♾️', color: '#6c7bf7' },
  ],
  jungle: [
    { name: 'Les Lions', avatar: '🦁', color: '#ffb648' },
    { name: 'Team Toucan', avatar: '🦜', color: '#35c2a3' },
    { name: 'Les Panthères', avatar: '🐆', color: '#a26ce0' },
    { name: 'Jungle Squad', avatar: '🌴', color: '#4fb0e8' },
    { name: 'Les Singes', avatar: '🐒', color: '#ff9a5a' },
    { name: 'Team Crocodile', avatar: '🐊', color: '#35c2a3' },
    { name: 'Les Éléphants', avatar: '🐘', color: '#6c7bf7' },
    { name: 'Team Perroquet', avatar: '🦚', color: '#ff7a68' },
  ],
  // On peut ajouter ici : pirates, dinosaures, super-héros, etc.
};

export function getRandomPresets(theme: string, count: number): TeamPreset[] {
  const pool = TEAM_PRESETS[theme] ?? TEAM_PRESETS.espace;
  return pool.slice(0, count);
}
