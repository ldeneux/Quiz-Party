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
