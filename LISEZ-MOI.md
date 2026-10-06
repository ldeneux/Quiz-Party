# Quiz-Party — projet complet (habillages, équipes en français, éditeur de disposition)

## Installer
1. Décompresse **par-dessus** ton dossier de projet (ne supprime pas l'ancien) : les fichiers que je ne connais pas restent en place.
2. `package.json` est ta version (avec `jsqr`, sans fichier lock). Rien d'autre à installer.
3. Commit + push comme d'habitude.

## À vérifier après décompression (fichiers que tu as pu modifier de ton côté)
- `components/QrScanner.tsx` : absent de mes archives, ne l'écrase pas (il n'est pas dans ce zip, donc il reste).
- `lib/themes.ts` : si tu y as personnalisé des thèmes (ex. le fond de **Sciences**, des zones), reporte-les : ce fichier est celui de mon projet.
  Le fond de Sciences est ici « page blanche » ; ton fichier `public/themes/sciences/stage.webp` reste en place, il suffit de repointer `stage.src`.
- `app/page.tsx`, `app/play/[gameId]/page.tsx`, `components/GameArea.tsx` : si tu les as modifiés hors de nos échanges, compare avant d'écraser.

## Nouveautés de cette version
- Thème **Voyages dans le temps** complet (décor, icônes de modes, boutons de menu, 12 équipes).
- 19 habillages ; un thème sans images s'affiche sur page blanche (jamais celui d'Espace).
- Équipes : noms en français (12 par thème) ; un thème sans jeu d'équipes n'en propose aucune.
- Éditeur de disposition : les boutons de la barre de menu se déplacent et se redimensionnent comme les icônes des modes.

## Base de données (facultatif)
`supabase/rename-teams-fr.sql` renomme en français les équipes déjà créées dans des parties existantes.
Les nouvelles parties utilisent directement les noms de `lib/teamPresets.ts`. Les équipes ne sont pas stockées comme « modèles » en base : elles sont créées à chaque partie.

## Nouvel écran Paramétrage (packs, profils, catégories, niveaux)
1. **Exécute `supabase/migration-014-parametrage.sql`** dans l'éditeur SQL de Supabase (une seule fois) : niveaux configurables
   (icône, « niveau scolaire », masqué) + vue de comptage qui rend l'écran léger. Sans elle l'écran fonctionne en mode dégradé (comptage plus lent, options de niveaux grisées).
2. Menu à 4 options : Générer les packs (Gemini) · Gérer les profils · Gérer les catégories · Gérer les niveaux, avec un tableau catégories × niveaux commun.
3. **Coût Gemini** : une fenêtre affiche le coût estimé AVANT toute génération ; le coût réel est affiché à la fin.
   Tarifs réglables sans toucher au code (optionnel, `.env.local`) : `NEXT_PUBLIC_GEMINI_PRICE_IN`, `NEXT_PUBLIC_GEMINI_PRICE_OUT` ($ par million de tokens), `NEXT_PUBLIC_USD_EUR`.
4. Optimisations de coût : lots de 15 questions par appel, sortie JSON structurée (plus d'appel perdu), anti-doublons avant insertion, aucun appel de « rattrapage ».
5. Corrections : « Impossible de parser la réponse Gemini en JSON » (récupération des questions complètes + sortie structurée) et
   « value too long for type character(1) » (la lettre de la bonne réponse est validée a/b/c/d avant l'insertion).

## Thèmes Sucrerie et Mythologie, vidéo de lancement
- **Sucrerie** (décor, 12 icônes de jeu et de menu, 12 équipes) et **Mythologie** (décor, 13 icônes, 12 équipes) sont complets. Les noms d'équipes sont en français.
- Les fonds **Sports** et **Fantasy** sont remplacés par les nouveaux (les icônes de Sports restent à fournir : boutons neutres).
- **Vidéo de lancement par thème** (`lib/themeIntros.ts`) : au démarrage d'une partie, la vidéo s'affiche dans le hublot, figée sur sa première image ;
  décompte 3-2-1 ; la vidéo se joue ; elle reste 3 secondes sur sa dernière image ; la première question démarre. Un bouton « Passer › » permet de sauter la vidéo.
  Un thème sans vidéo n'affiche que le décompte puis « C'EST PARTI ! ». La fusée du décompte a été retirée.
  Pour la vidéo d'un autre thème : `public/themes/<thème>/intro.mp4` + `intro-poster.webp` (sa première image), puis une ligne dans `lib/themeIntros.ts`.
- La vidéo Sucrerie a été compressée (10 Mo → 4 Mo) et n'a pas de piste audio ; je n'y ai trouvé aucun filigrane visible (coins et zones fixes vérifiés).
