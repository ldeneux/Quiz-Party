// Troisième étape (à lancer APRÈS apply-layout-patch-2.mjs) :
//  - icônes de modes : taille de l'icône et du texte indépendantes, texte masquable, plus d'infobulle du navigateur
//  - le texte prend le style des étiquettes de la barre de menu
//  - emoji des modes remplacés par les icônes (public/modes)
// Usage :  node tools/apply-layout-patch-3.mjs app/page.tsx
import fs from 'node:fs';

const file = process.argv[2] || 'app/page.tsx';
let s = fs.readFileSync(file, 'utf8');
if (!s.includes('zones.modes')) { console.log("Lance d'abord tools/apply-layout-patch-2.mjs"); process.exit(1); }
if (s.includes('planetTweak(')) { console.log('Déjà appliqué : rien à faire.'); process.exit(0); }

const out = [];
const fail = (m) => { console.log(out.join('\n') + `\n✗ ${m}\n\nAucune modification écrite. Envoie-moi ton app/page.tsx pour que j'adapte le script.`); process.exit(1); };
const once = (name, find, rep) => {
  const n = s.split(find).length - 1;
  if (n !== 1) fail(`${name} : ${n} occurrence(s) trouvée(s)`);
  s = s.replace(find, () => rep);
  out.push(`✓ ${name}`);
};

once('import ModeIcon',
  "import { LayoutOverlays, LayoutPanels } from '@/components/LayoutEditor';",
  "import { LayoutOverlays, LayoutPanels } from '@/components/LayoutEditor';\nimport ModeIcon from '@/components/ModeIcon';");

once('réglages de l\'icône',
  "const sel = activeMode === m.id;\n                  return (\n                    <div key={m.id} {...L.planetProps(m.id as keyof typeof theme.planets)}>",
  "const sel = activeMode === m.id;\n                  const tw = L.planetTweak(m.id as keyof typeof theme.planets);\n                  return (\n                    <div key={m.id} {...L.planetProps(m.id as keyof typeof theme.planets)}>");

once('plus d\'infobulle', "                      title={m.label}\n", "");

const imgOld = /<img src=\{theme\.planets\[m\.id as keyof typeof theme\.planets\]\.src\} alt="" draggable=\{false\} style=\{\{ width: `\$\{theme\.planets\[m\.id as keyof typeof theme\.planets\]\.width\}cqw`, display: 'block' \}\} \/>\n\s*<span style=\{\{ fontWeight: 800, fontSize: '1\.3cqw', color: sel \? '#fff' : '#a9b6e6', textShadow: '0 0 0\.8cqw #000' \}\}>\n\s*\{m\.emoji\} \{m\.label\}\n\s*<\/span>/;
if (!imgOld.test(s)) fail('image + libellé des modes introuvables');
s = s.replace(imgOld, () => `<img src={theme.planets[m.id as keyof typeof theme.planets].src} alt="" draggable={false} style={{ width: \`\${theme.planets[m.id as keyof typeof theme.planets].width * tw.scale}cqw\`, display: 'block' }} />
                      {tw.showLabel && (
                        <span
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.45cqw', whiteSpace: 'nowrap',
                            padding: '0.4cqw 0.9cqw', borderRadius: '0.6cqw', fontWeight: 800, fontSize: \`\${1.05 * tw.labelScale}cqw\`,
                            background: 'rgba(4,9,36,0.92)', color: sel ? '#fff' : '#dfe9ff',
                            border: sel ? '1px solid #fff' : '1px solid rgba(120,175,255,0.75)',
                            boxShadow: sel ? \`0 0 1.2cqw \${m.color}\` : '0 0 1.2cqw rgba(60,120,255,0.45)',
                          }}
                        >
                          <ModeIcon mode={m.id} /> {m.label}
                        </span>
                      )}`);
out.push('✓ icône + libellé');

console.log(out.join('\n'));
fs.writeFileSync(file, s);
console.log('\napp/page.tsx mis à jour.');
