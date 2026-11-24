import { CONFIG } from '../../config/app.config.js';
import { SesionActiva } from './SesionActiva.js';
// Cola de cambios pendientes de enviar al servidor (modo remoto). Cada cambio que el usuario hace en una tabla
// sincronizable se anota aquí y el Sincronizador lo envía cuando hay conexión. Sobrevive a cerrar el navegador.
// Cambios sobre el mismo registro se fusionan para no enviar de más y para no generar falsos conflictos.
const K = CONFIG.prefijo + 'cola';
export const Cola = {
  todas() { try { return JSON.parse(localStorage.getItem(K) || '[]'); } catch { return []; } },
  _guardar(a) { localStorage.setItem(K, JSON.stringify(a)); if (typeof window !== 'undefined') window.dispatchEvent(new Event('sia:cola')); },
  // op: { tabla, accion: 'insertar'|'actualizar'|'eliminar', id, datos, baseVersion }
  encolar(op) {
    const a = this.todas(), prev = a.find(x => x.tabla === op.tabla && x.id === op.id);
    if (prev) {
      if (prev.accion === 'insertar') { if (op.accion === 'actualizar') Object.assign(prev.datos, op.datos); else if (op.accion === 'eliminar') a.splice(a.indexOf(prev), 1); }
      else if (prev.accion === 'actualizar') { if (op.accion === 'actualizar') Object.assign(prev.datos, op.datos); else if (op.accion === 'eliminar') { prev.accion = 'eliminar'; prev.datos = {}; } }
    } else a.push({ idOp: crypto.randomUUID(), usuario: (SesionActiva.obtener() || {}).usuario?.id || null, ts: Date.now(), ...op });
    this._guardar(a);
  },
  pendientes(idUsuario) { return this.todas().filter(x => !idUsuario || x.usuario === idUsuario); },
  quitar(ids) { const s = new Set(ids); this._guardar(this.todas().filter(x => !s.has(x.idOp))); }
};
