// Deuxième étape (à lancer APRÈS apply-layout-patch.mjs) :
//  - sort les icônes de modes du hublot (zone « modes » indépendante)
//  - permet de régler fond / bordure / police des lignes d'équipes
// Usage :  node tools/apply-layout-patch-2.mjs app/page.tsx
import fs from 'node:fs';

const file = process.argv[2] || 'app/page.tsx';
let s = fs.readFileSync(file, 'utf8');
if (!s.includes('useLayout(')) { console.log("Lance d'abord tools/apply-layout-patch.mjs"); process.exit(1); }
if (s.includes('zones.modes')) { console.log('Déjà appliqué : rien à faire.'); process.exit(0); }

const out = [];
const fail = (m) => { console.log(out.join('\n') + `\n✗ ${m}\n\nAucune modification écrite. Envoie-moi ton app/page.tsx pour que j'adapte le script.`); process.exit(1); };
const once = (name, find, rep) => {
  const n = s.split(find).length - 1;
  if (n !== 1) fail(`${name} : ${n} occurrence(s) trouvée(s)`);
  s = s.replace(find, () => rep);
  out.push(`✓ ${name}`);
};

// 1) Icônes de modes : on extrait le bloc du hublot pour le replacer dans sa propre zone
const startMark = "<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end' }}>";
const endMark = "<p style={{ textAlign: 'center', fontSize: '1.15cqw'";
const i0 = s.indexOf(startMark);
const i1 = i0 < 0 ? -1 : s.indexOf(endMark, i0);
if (i0 < 0 || i1 < 0 || s.indexOf(startMark, i0 + 1) !== -1) fail('bloc des icônes de modes introuvable');
const planets = s.slice(i0, i1).trimEnd();
s = s.slice(0, i0) + s.slice(i1);
out.push('✓ icônes retirées du hublot');

once('texte du hublot',
  "<div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>",
  "<div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '6%', boxSizing: 'border-box' }}>");

once('zone modes',
  '{/* Choix du profil',
  `{/* Icônes des modes de jeu : zone indépendante du hublot (déplaçable / redimensionnable à part) */}
        {!gameStarted && (
          <div className={L.fx('modes').className} style={{ position: 'absolute', ...rectStyle(zones.modes), boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center', ...L.fx('modes').style }}>
            ${planets}
          </div>
        )}

        {/* Choix du profil`);

// 2) Lignes d'équipes
once('lignes d\'équipes',
  "fontWeight: 700, fontSize: '1cqw', background: 'rgba(10,18,50,0.75)', cursor: 'pointer' }}",
  "fontWeight: 700, fontSize: '1cqw', background: 'rgba(10,18,50,0.75)', cursor: 'pointer', ...L.fx('teamRows').style }}");
once('classe des lignes',
  "                key={t.id}\n                onClick={() => {\n                  setTeamTip(null);",
  "                key={t.id}\n                className={L.fx('teamRows').className}\n                onClick={() => {\n                  setTeamTip(null);");

console.log(out.join('\n'));
fs.writeFileSync(file, s);
console.log('\napp/page.tsx mis à jour.');
