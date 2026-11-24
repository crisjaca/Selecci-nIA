import { CONFIG } from '../../config/app.config.js';
// Registro de lo que va pasando. Sale por la consola del navegador (F12) y queda guardado (últimos 200) para
// verlo en la vista «Diagnóstico». Úsalo así:  Log.info('Modulo', 'qué pasó', { datos });
// Nivel configurable en config/app.config.js → nivelLog. NO escribas contraseñas ni datos personales aquí.
const NIVELES = { debug: 0, info: 1, warn: 2, error: 3 }, K = CONFIG.prefijo + 'log', MAX = 200;
const guardar = (e) => { try { const a = JSON.parse(localStorage.getItem(K) || '[]'); a.push(e); localStorage.setItem(K, JSON.stringify(a.slice(-MAX))); } catch { /* sin almacenamiento: se ignora */ } };
const escribir = (nivel, modulo, msg, datos) => {
  if (NIVELES[nivel] < NIVELES[CONFIG.nivelLog || 'info']) return;
  (console[nivel === 'debug' ? 'log' : nivel] || console.log)(`[SIA ${modulo}] ${msg}`, datos ?? '');
  guardar({ t: Date.now(), nivel, modulo, msg, datos: datos === undefined ? null : datos });
};
export const Log = {
  debug: (m, x, d) => escribir('debug', m, x, d), info: (m, x, d) => escribir('info', m, x, d),
  warn: (m, x, d) => escribir('warn', m, x, d), error: (m, x, d) => escribir('error', m, x, d),
  recientes() { try { return JSON.parse(localStorage.getItem(K) || '[]').reverse(); } catch { return []; } },
  limpiar() { localStorage.removeItem(K); }
};
