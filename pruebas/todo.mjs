// Ejecuta todas las pruebas y resume: node pruebas/todo.mjs   (requiere Node 20 o superior; no necesita instalar nada)
import { execFileSync } from 'node:child_process'; import { readdirSync } from 'node:fs'; import { fileURLToPath } from 'node:url';
const dir = fileURLToPath(new URL('./', import.meta.url)); let ok = 0, mal = 0;
for (const f of readdirSync(dir).filter(x => x.endsWith('.test.mjs')).sort()) {
  let out = ''; try { out = execFileSync('node', [dir + f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  const o = (out.match(/^OK/gm) || []).length, m = (out.match(/^FALLA/gm) || []).length + (/Error|Cannot/.test(out) && !m0(out) ? 1 : 0);
  ok += o; mal += m; console.log(`${m ? '✗' : '✓'} ${f.padEnd(42)} ${o} OK${m ? ', ' + m + ' FALLA' : ''}`); if (m) console.log(out.split('\n').filter(l => /FALLA|Error/.test(l)).join('\n'));
}
function m0() { return false; }
console.log(`\nTotal: ${ok} OK, ${mal} FALLA`); process.exit(mal ? 1 : 0);
