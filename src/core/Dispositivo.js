import { CONFIG } from '../../config/app.config.js';
export const Dispositivo = {
  id() {
    const a = CONFIG.dispositivoPorPestana ? sessionStorage : localStorage, k = CONFIG.prefijo + 'dispositivo';
    let v = a.getItem(k); if (!v) { v = crypto.randomUUID(); a.setItem(k, v); } return v;
  },
  navegador() { const u = navigator.userAgent; return /Edg/.test(u) ? 'Edge' : /Chrome/.test(u) ? 'Chrome' : /Firefox/.test(u) ? 'Firefox' : /Safari/.test(u) ? 'Safari' : 'Otro'; }
};
