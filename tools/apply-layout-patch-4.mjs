// Quatrième étape (à lancer APRÈS apply-layout-patch-3.mjs) :
// une icône de mode sans image dans l'habillage (src null) affiche l'icône neutre de public/modes.
// Usage :  node tools/apply-layout-patch-4.mjs app/page.tsx
import fs from 'node:fs';

const file = process.argv[2] || 'app/page.tsx';
let s = fs.readFileSync(file, 'utf8');
if (!s.includes('planetTweak(')) { console.log("Lance d'abord tools/apply-layout-patch-3.mjs"); process.exit(1); }
if (s.includes('theme.planets[m.id as keyof typeof theme.planets].src ?')) { console.log('Déjà appliqué : rien à faire.'); process.exit(0); }

const re = /<img src=\{theme\.planets\[m\.id as keyof typeof theme\.planets\]\.src\} alt="" draggable=\{false\} style=\{\{ width: `\$\{theme\.planets\[m\.id as keyof typeof theme\.planets\]\.width \* tw\.scale\}cqw`, display: 'block' \}\} \/>/;
if (!re.test(s)) { console.log("✗ image des modes introuvable.\nAucune modification écrite. Envoie-moi ton app/page.tsx pour que j'adapte le script."); process.exit(1); }
s = s.replace(re, () =>
  "{theme.planets[m.id as keyof typeof theme.planets].src ? (\n" +
  "                        <img src={theme.planets[m.id as keyof typeof theme.planets].src as string} alt=\"\" draggable={false} style={{ width: `${theme.planets[m.id as keyof typeof theme.planets].width * tw.scale}cqw`, display: 'block' }} />\n" +
  "                      ) : (\n" +
  "                        <ModeIcon mode={m.id} size={`${theme.planets[m.id as keyof typeof theme.planets].width * tw.scale}cqw`} style={{ display: 'block' }} />\n" +
  "                      )}");
fs.writeFileSync(file, s);
console.log('✓ icône de mode neutre\n\napp/page.tsx mis à jour.');
