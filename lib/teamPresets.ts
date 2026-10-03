// Équipes proposées aux joueurs, par habillage (12 par thème).
// L'avatar est une image : /public/avatars/<thème>/NN.webp (même ordre que les noms ci-dessous).
// Un thème sans jeu d'équipes n'en propose aucune : il ne reprend pas celles d'un autre thème.

export type TeamPreset = {
  name: string;
  avatar: string; // chemin d'image (ou, pour d'anciennes équipes, un emoji)
  color: string;
};

const make = (theme: string, names: string[], colors: string[]): TeamPreset[] =>
  names.map((name, i) => ({ name, avatar: `/avatars/${theme}/${String(i + 1).padStart(2, '0')}.webp`, color: colors[i] }));

export const TEAM_PRESETS: Record<string, TeamPreset[]> = {
  egypte: make('egypte', [
    'Anubis Squad', 'Les Pharaons', 'Scarab Legion', 'Horus Wings', 'Sphinx Guardians', 'Osiris Order', 'Bastet Clan', 'Pyramide Alpha', 'Nil Explorers', 'Ra Sunforce', 'Cobra Dynasty', 'Temple Seekers',
  ], [
    '#f2bd5c', '#f2d05c', '#5cf287', '#f2e35c', '#f2af5c', '#5cf286', '#f2c35c', '#f2d15c', '#5cddf2', '#f2a95c', '#f2db5c', '#f2bf5c',
  ]),
  espace: make('espace', [
    'Team Nova', 'Les Martiens', 'Les Astronautes', 'Team Saturne', 'Les Explorateurs Cosmiques', 'Zenith', 'Les Météores', 'Team Lune', 'Galaxie', 'Orion', 'CosmoRiders', 'Nebula Squad',
  ], [
    '#f2b65c', '#5cf26c', '#5c76f2', '#5caaf2', '#5c9ef2', '#5c90f2', '#5c9bf2', '#5c75f2', '#905cf2', '#5c66f2', '#5c8ef2', '#755cf2',
  ]),
  jungle: make('jungle', [
    'Jaguar Fury', 'Tribe Liana', 'Emerald Serpent', 'Totem Guardians', 'Parrot Squad', 'Bamboo Clan', 'Vine Runners', 'Sun Monkey Tribe', 'Rainforest Spirits', 'Crocodile Order', 'Thunder Frog', 'Bloom Hunters',
  ], [
    '#f2cb5c', '#edf25c', '#5cf279', '#f2bd5c', '#c7f25c', '#e9f25c', '#baf25c', '#f2bd5c', '#5cf2a9', '#adf25c', '#5cbbf2', '#5cf277',
  ]),
  sciences: make('sciences', [
    'Quantum Sparks', 'Lab Masters', 'Tesla Squad', 'Molecule Force', 'BioGenesis', 'Circuit Breakers', 'Plasma Runners', 'NanoBots', 'Fusion Core', 'Gravity Shift', 'ChemStorm', 'Photon Tribe',
  ], [
    '#8d5cf2', '#5df25c', '#5c8ff2', '#5cd7f2', '#5cb6f2', '#5c9af2', '#5c9ff2', '#5cf2de', '#f2d15c', '#6f5cf2', '#5cf2ef', '#5c70f2',
  ]),
  inventions: make('inventions', [
    'GearMasters', 'SteamForge', 'BoltRunners', 'TeslaCrafters', 'CopperBrains', 'WrenchSquad', 'SparkEngineers', 'CogNation', 'Blueprint Tribe', 'IronInventors', 'SteamBots', 'ChronoMakers',
  ], [
    '#f2995c', '#f2995c', '#5ce2f2', '#5cc1f2', '#f2945c', '#f2985c', '#5cd7f2', '#f2a35c', '#5cacf2', '#f2a25c', '#f2b05c', '#f2a85c',
  ]),
  marins: make('marins', [
    'Coral Knights', 'Abyss Serpents', 'Pearl Keepers', 'Tide Guardians', 'Kraken Squad', 'Sea Lantern Tribe', 'SharkRiders', 'Bubble Rangers', 'Trident Force', 'Starfish Crew', 'DeepShell Clan', 'Manta Spirits',
  ], [
    '#5cdcf2', '#5c98f2', '#5ca0f2', '#5ce6f2', '#8e5cf2', '#f2ed5c', '#5cb2f2', '#5cb2f2', '#5cf2dc', '#f2bf5c', '#5cbbf2', '#5c8ff2',
  ]),
  fantasy: make('fantasy', [
    'DragonFlare', 'ElvenLeaf', 'CrystalMages', 'ShadowWolves', 'PhoenixRise', 'RuneGuardians', 'UnicornLight', 'GoblinCrew', 'MoonSorcerers', 'ForestSpirits', 'ThunderGryphons', 'MysticForge',
  ], [
    '#f2905c', '#cbf25c', '#5c9ef2', '#b25cf2', '#f2b15c', '#5ca4f2', '#5c9ff2', '#f2cd5c', '#5c76f2', '#e2f25c', '#5c91f2', '#5c5cf2',
  ]),
  terre: make('terre', [
    'LavaRunners', 'CrystalSeekers', 'MagmaGuardians', 'Stalactite Clan', 'DeepCave Explorers', 'FossilForce', 'EarthCore Tribe', 'TunnelSerpents', 'GlowMushrooms', 'RockBreakers', 'Geode Spirits', 'SubterraSquad',
  ], [
    '#f2855c', '#5caef2', '#f27d5c', '#5cf2f1', '#f2b55c', '#f2a05c', '#f2a15c', '#f2a35c', '#725cf2', '#f2a85c', '#9a5cf2', '#5cd0f2',
  ]),
};

export function getRandomPresets(theme: string, count: number): TeamPreset[] {
  const pool = TEAM_PRESETS[theme] ?? [];
  return pool.slice(0, count);
}
