// Branche lib/themes.extra.ts dans lib/themes.ts sans toucher à tes réglages existants.
// Usage :  node tools/apply-themes-patch.mjs lib/themes.ts
import fs from 'node:fs';

const file = process.argv[2] || 'lib/themes.ts';
let s = fs.readFileSync(file, 'utf8');
if (s.includes('themes.extra')) { console.log('Déjà appliqué : rien à faire.'); process.exit(0); }

const out = [];
const fail = (m) => { console.log(out.join('\n') + `\n✗ ${m}\n\nAucune modification écrite. Envoie-moi ton lib/themes.ts pour que j'adapte le script.`); process.exit(1); };

// 1) import en tête (après le premier import)
const firstImport = /^import [^\n]*\n/m.exec(s);
if (!firstImport) fail('aucun import trouvé en tête de fichier');
s = s.replace(firstImport[0], firstImport[0] + "import { EXTRA_THEMES, THEME_OVERRIDES, THEME_ORDER } from './themes.extra';\n");
out.push('✓ import');

// 2) ThemeId devient une simple chaîne (la liste complète est dans THEMES)
const idRe = /export type ThemeId =[^;]+;/;
if (!idRe.test(s)) fail('type ThemeId introuvable');
s = s.replace(idRe, "export type ThemeId = string; // 'espace', 'jungle', 'marins'… : voir THEMES");
out.push('✓ ThemeId');

// 3) icônes de modes facultatives (null = icône neutre)
const plRe = /planets: Record<ModeId, \{ src: string; width: number[^}]*\}>;/;
if (!plRe.test(s)) fail('type des planètes introuvable');
s = s.replace(plRe, (m) => m.replace('src: string;', 'src: string | null;'));
out.push('✓ icônes de modes facultatives');

// 4) la liste des thèmes est construite après fusion
const listRe = /export const THEME_LIST: Theme\[\] = \[[^\]]*\];\s*/;
if (!listRe.test(s)) fail('THEME_LIST introuvable');
s = s.replace(listRe, '');
s = s.trimEnd() + `

// ── Habillages complémentaires et remplacements (lib/themes.extra.ts) ──
const registry = THEMES as Record<string, Theme>;
for (const [id, patch] of Object.entries(THEME_OVERRIDES)) {
  const base = registry[id];
  if (base) registry[id] = { ...base, ...patch, zones: { ...base.zones, ...(patch.zones ?? {}) } } as Theme;
}
Object.assign(registry, EXTRA_THEMES);
export const THEME_LIST: Theme[] = [...THEME_ORDER, ...Object.keys(registry).filter((k) => !THEME_ORDER.includes(k))]
  .map((k) => registry[k])
  .filter(Boolean);
`;
out.push('✓ fusion des thèmes');

console.log(out.join('\n'));
fs.writeFileSync(file, s);
console.log('\nlib/themes.ts mis à jour.');
