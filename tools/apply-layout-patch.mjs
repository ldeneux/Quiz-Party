// Branche l'éditeur de disposition dans app/page.tsx.
// Usage :  node tools/apply-layout-patch.mjs app/page.tsx
// Chaque remplacement est vérifié (une seule occurrence attendue) ; rien n'est écrit si un remplacement échoue.
import fs from 'node:fs';

const file = process.argv[2] || 'app/page.tsx';
let s = fs.readFileSync(file, 'utf8');
if (s.includes('useLayout(')) {
  console.log('Déjà appliqué : rien à faire.');
  process.exit(0);
}

const fx = (k) => `...L.fx('${k}').style`;
const steps = [
  ['imports',
    "import { PlateId, rectStyle } from '@/lib/themes';",
    "import { PlateId, rectStyle } from '@/lib/themes';\nimport { useLayout } from '@/lib/useLayout';\nimport { LayoutOverlays, LayoutPanels } from '@/components/LayoutEditor';"],
  ['hook',
    'const stageRef = useRef<HTMLDivElement>(null);',
    'const stageRef = useRef<HTMLDivElement>(null);\n  const L = useLayout(theme, stageRef); // disposition personnalisable (zones, icônes, couleurs)\n  const zones = L.zones;'],
  ['css',
    '.ck-scroll{scrollbar-width:thin;',
    '.ck-recolor, .ck-recolor *{color:var(--ck-color) !important}\n          .ck-edit-planet button{pointer-events:none !important}\n          .ck-scroll{scrollbar-width:thin;'],
  ['teams',
    `<div className="ck-scroll" style={{ position: 'absolute', ...rectStyle(theme.zones.teams), overflowY: 'auto', boxSizing: 'border-box', padding: '0.4cqw', ...theme.sidePanelStyle }}>`,
    `<div className={\`ck-scroll \${L.fx('teams').className}\`} style={{ position: 'absolute', ...rectStyle(zones.teams), overflowY: 'auto', boxSizing: 'border-box', padding: '0.4cqw', ...theme.sidePanelStyle, ${fx('teams')} }}>`],
  ['teamCount',
    `<div style={{ position: 'absolute', ...rectStyle(theme.zones.teamCount), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5cqw', background: 'rgba(3,8,30,0.9)', border: '1px solid rgba(90,170,255,0.55)', borderRadius: '0.4cqw', boxShadow: '0 0 0.8cqw rgba(60,130,255,0.4)', fontSize: '0.85cqw', fontWeight: 800, letterSpacing: '0.12cqw', color: '#9fc4ff' }}>`,
    `<div className={L.fx('teamCount').className} style={{ position: 'absolute', ...rectStyle(zones.teamCount), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5cqw', background: 'rgba(3,8,30,0.9)', border: '1px solid rgba(90,170,255,0.55)', borderRadius: '0.4cqw', boxShadow: '0 0 0.8cqw rgba(60,130,255,0.4)', fontSize: '0.85cqw', fontWeight: 800, letterSpacing: '0.12cqw', color: '#9fc4ff', ${fx('teamCount')} }}>`],
  ['join',
    `<div style={{ position: 'absolute', ...rectStyle(theme.zones.join), overflow: 'hidden', boxSizing: 'border-box', padding: '0.4cqw', ...theme.sidePanelStyle }}>`,
    `<div className={L.fx('join').className} style={{ position: 'absolute', ...rectStyle(zones.join), overflow: 'hidden', boxSizing: 'border-box', padding: '0.4cqw', ...theme.sidePanelStyle, ${fx('join')} }}>`],
  ['code',
    `<div style={{ position: 'absolute', ...rectStyle(theme.zones.code), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6cqw', background: 'rgba(3,8,30,0.9)', border: '1px solid rgba(90,170,255,0.55)', borderRadius: '0.4cqw', boxShadow: '0 0 0.8cqw rgba(60,130,255,0.4)' }}>`,
    `<div className={L.fx('code').className} style={{ position: 'absolute', ...rectStyle(zones.code), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6cqw', background: 'rgba(3,8,30,0.9)', border: '1px solid rgba(90,170,255,0.55)', borderRadius: '0.4cqw', boxShadow: '0 0 0.8cqw rgba(60,130,255,0.4)', ${fx('code')} }}>`],
  ['hub',
    `<div style={{ position: 'absolute', ...rectStyle(theme.zones.hub), boxSizing: 'border-box', ...theme.hubStyle }}>`,
    `<div className={L.fx('hub').className} style={{ position: 'absolute', ...rectStyle(zones.hub), boxSizing: 'border-box', ...theme.hubStyle, ${fx('hub')} }}>`],
  ['planet-open',
    `<button\n                      key={m.id}\n                      onClick={() => selectMode(m.id)}`,
    `<div key={m.id} {...L.planetProps(m.id as keyof typeof theme.planets)}>\n                    <button\n                      onClick={() => selectMode(m.id)}`],
  ['planet-close',
    `{m.emoji} {m.label}\n                      </span>\n                    </button>`,
    `{m.emoji} {m.label}\n                      </span>\n                    </button>\n                    </div>`],
  ['profile',
    "<div style={{ position: 'absolute', left: `${theme.zones.profile.left}%`, top: `${theme.zones.profile.top}%`, transform: 'translateX(-50%)', zIndex: 15 }}>",
    "<div className={L.fx('profile').className} style={{ position: 'absolute', left: `${zones.profile.left}%`, top: `${zones.profile.top}%`, transform: 'translateX(-50%)', zIndex: 15, ...L.fx('profile').style }}>"],
  ['profile-bg',
    'id="profil"\n            height={5.5}',
    "id=\"profil\"\n            boxOverride={L.fx('profile').style}\n            height={5.5}"],
  ['bar',
    `<div style={{ position: 'absolute', ...rectStyle(theme.zones.bar), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1cqw', boxSizing: 'border-box', padding: '0.4cqw 1.2cqw', background: theme.bar.background, border: theme.bar.border, borderRadius: '1.2cqw', boxShadow: theme.bar.boxShadow }}>`,
    `<div className={L.fx('bar').className} style={{ position: 'absolute', ...rectStyle(zones.bar), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1cqw', boxSizing: 'border-box', padding: '0.4cqw 1.2cqw', background: theme.bar.background, border: theme.bar.border, borderRadius: '1.2cqw', boxShadow: theme.bar.boxShadow, ${fx('bar')} }}>`],
  ['overlays',
    '      </div>\n\n      {/* Fenêtre statistiques */}',
    "        <LayoutOverlays L={L} theme={theme} />\n      </div>\n      <LayoutPanels L={L} theme={theme} />\n\n      {/* Fenêtre statistiques */}"],
];

const out = [];
let ok = true;
for (const [name, find, rep] of steps) {
  const n = s.split(find).length - 1;
  if (n !== 1) { out.push(`✗ ${name} : ${n} occurrence(s) trouvée(s)`); ok = false; continue; }
  s = s.replace(find, () => rep);
  out.push(`✓ ${name}`);
}
console.log(out.join('\n'));
if (!ok) { console.log('\nAucune modification écrite. Envoie-moi ton app/page.tsx pour que j\'adapte le script.'); process.exit(1); }
fs.writeFileSync(file, s);
console.log('\napp/page.tsx mis à jour.');
