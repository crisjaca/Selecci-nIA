import { CONFIG } from '../../config/app.config.js';
import { TABLAS_SYNC, SOLO_LECTURA } from '../../config/sync.config.js';
import { Cola } from './Cola.js';
import { SesionActiva } from './SesionActiva.js';
// Una tabla guardada en localStorage. Es la COPIA LOCAL de los datos:
//   - modo 'local' : es la única base de datos.
//   - modo 'remoto': cada cambio, además de guardarse aquí, se anota en la Cola para enviarlo a Google Sheets.
// Los servicios no saben nada de esto: siguen usando listar/obtener/insertar/actualizar/eliminar como siempre.
export class Tabla {
  constructor(nombre) { this.nombre = nombre; this.clave = CONFIG.prefijo + nombre; }
  _leer() { try { return JSON.parse(localStorage.getItem(this.clave) || '[]'); } catch { return []; } }
  _guardar(a) { localStorage.setItem(this.clave, JSON.stringify(a)); }
  _sync() { return CONFIG.modo === 'remoto' && TABLAS_SYNC.includes(this.nombre) && !SOLO_LECTURA.includes(this.nombre) && !!SesionActiva.obtener(); }
  listar(filtro) { const a = this._leer(); return filtro ? a.filter(filtro) : a; }
  obtener(id) { return this._leer().find(x => x.id === id) || null; }
  insertar(o) {
    const a = this._leer(); o.id = o.id || crypto.randomUUID(); o.version = 1; o.creado = o.creado || Date.now();
    a.push(o); this._guardar(a);
    if (this._sync()) Cola.encolar({ tabla: this.nombre, accion: 'insertar', id: o.id, datos: { ...o } });
    return o;
  }
  actualizar(id, cambios) {
    const a = this._leer(), i = a.findIndex(x => x.id === id); if (i < 0) return null;
    const base = a[i].version || 1;                       // versión que el servidor debe tener para aceptar el cambio
    a[i] = { ...a[i], ...cambios, version: base + 1 }; this._guardar(a);
    if (this._sync()) Cola.encolar({ tabla: this.nombre, accion: 'actualizar', id, datos: cambios, baseVersion: base });
    return a[i];
  }
  eliminar(id) {
    const a = this._leer(), existe = a.some(x => x.id === id); this._guardar(a.filter(x => x.id !== id));
    if (existe && this._sync()) Cola.encolar({ tabla: this.nombre, accion: 'eliminar', id });
  }
  // Aplica lo que llega del servidor SIN volver a enviarlo. Los registros con cambios locales aún sin enviar (pendientes) no se pisan.
  // completo=true: lo que no venga del servidor (y no esté pendiente) se borra de la copia local.
  aplicarServidor(filas, borrados, pendientes, completo) {
    let a = this._leer(); const pos = new Map(a.map((x, i) => [x.id, i]));
    filas.forEach(f => { if (pendientes.has(f.id)) return; if (pos.has(f.id)) a[pos.get(f.id)] = f; else a.push(f); });
    const bor = new Set(borrados), srv = new Set(filas.map(f => f.id));
    this._guardar(a.filter(x => pendientes.has(x.id) || !(bor.has(x.id) || (completo && !srv.has(x.id)))));
  }
}
