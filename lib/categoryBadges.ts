// Badges de catégories (public/categories/<slug>.webp) : l'icône porte déjà le nom de la catégorie.
// Le nom enregistré en base est normalisé (minuscules, sans accents ni ponctuation) pour retrouver son badge.
// Une catégorie sans badge garde l'affichage « emoji + nom ».

const KNOWN = new Set<string>([
  'actualite-et-medias',
  'anime-et-animation',
  'architecture',
  'arts-visuels',
  'astronomie',
  'automobile',
  'basket',
  'bd-et-manga',
  'calcul-mental',
  'celebrites',
  'cinema-classique',
  'cinema-et-series',
  'conjugaison',
  'culture-web-et-reseaux-sociaux',
  'disney',
  'drapeaux-et-pays',
  'droit-et-institutions',
  'ecologie-et-nature',
  'economie',
  'espace-et-systeme-solaire',
  'gastronomie-et-vins',
  'geographie-de-la-france',
  'geographie-du-monde',
  'geometrie',
  'geopolitique',
  'histoire-de-france',
  'histoire-du-xxe-siecle',
  'histoire-toutes-epoques',
  'humour-et-sketchs-cultes',
  'inventions-et-inventeurs',
  'jeux-video',
  'jeux-video-retro',
  'langues-etrangeres',
  'lecture-et-contes',
  'litterature',
  'logos-et-marques',
  'medecine-et-sante-culture-generale',
  'mode-et-tendances',
  'monuments-du-monde',
  'musique-actuelle',
  'musique-classique',
  'musique-tous-genres',
  'mythologie-grecque',
  'mythologies-du-monde',
  'oenologie',
  'orthographe',
  'peinture-et-sculpture',
  'philosophie',
  'photographie',
  'question-action-ou-verite',
  'sciences-avancees',
  'sciences-de-la-vie',
  'sciences-physique-chimie',
  'series-tv-cultes',
  'sport-competitions-records',
  'sport-et-regles-du-jeu',
  'sport-professionnel',
  'technologie-et-informatique',
  'theatre',
  'vocabulaire',
  'voyages-et-capitales',
]);

export const normalizeCategoryName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function categoryBadgeSrc(name?: string | null): string | null {
  if (!name) return null;
  const slug = normalizeCategoryName(name);
  return KNOWN.has(slug) ? `/categories/${slug}.webp` : null;
}
