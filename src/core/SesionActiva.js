import { CONFIG } from '../../config/app.config.js';
const K = CONFIG.prefijo + 'sesion';
export const SesionActiva = {
  guardar(d) { sessionStorage.setItem(K, JSON.stringify(d)); },
  obtener() { try { return JSON.parse(sessionStorage.getItem(K)); } catch { return null; } },
  limpiar() { sessionStorage.removeItem(K); }
};
