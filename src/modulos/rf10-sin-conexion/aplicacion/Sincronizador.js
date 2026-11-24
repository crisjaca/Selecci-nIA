import { CONFIG } from '../../../../config/app.config.js';
import { TABLAS_SYNC } from '../../../../config/sync.config.js';
import { Api } from '../../../core/Api.js';
import { Cola } from '../../../core/Cola.js';
import { Tabla } from '../../../core/Almacen.js';
import { SesionActiva } from '../../../core/SesionActiva.js';
import { Log } from '../../../core/Logger.js';

// RF_10 · Modo sin conexión. Funcionamiento:
//   1) El usuario trabaja contra la copia local (rápido, funciona sin internet) y cada cambio queda en la Cola.
//   2) sincronizar() EMPUJA la cola al servidor (por lotes) y luego TRAE lo que cambió desde la última vez.
//   3) Si el servidor rechaza un cambio (permiso, conflicto, límite), se descarta y se restaura la versión del servidor.
// Se dispara solo: al iniciar sesión, cada syncIntervaloMs, al volver internet y 3 s después de cada cambio.
const K = CONFIG.prefijo + 'sync', FIN_SESION = ['SESION_INVALIDA', 'LIMITE_DISPOSITIVOS', 'SIN_SUSCRIPCION'];
const estado = () => { try { return { desde: 0, ultima: null, ultimoError: null, usuario: null, rechazadas: [], ...JSON.parse(localStorage.getItem(K) || '{}') }; } catch { return { desde: 0, ultima: null, ultimoError: null, usuario: null, rechazadas: [] }; } };
const guardarEstado = (e) => localStorage.setItem(K, JSON.stringify(e));
const emitir = (nombre, detalle) => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(nombre, { detail: detalle })); };

export const Sync = {
  enCurso: false, _ini: false,
  estado,
  pendientes() { const s = SesionActiva.obtener(); return s ? Cola.pendientes(s.usuario.id).length : 0; },
  // Si entra un usuario distinto, se borra la copia local del anterior (privacidad). Su cola se conserva para cuando vuelva.
  prepararUsuario(idUsuario) {
    const e = estado(); if (e.usuario === idUsuario) return;
    Log.info('Sync', 'Entró otro usuario: se limpia la copia local');
    TABLAS_SYNC.forEach(t => localStorage.removeItem(CONFIG.prefijo + t));
    guardarEstado({ ...e, usuario: idUsuario, desde: 0, ultima: null, rechazadas: [] });
  },
  async sincronizar() {
    if (CONFIG.modo !== 'remoto' || this.enCurso) return { omitido: true };
    const s = SesionActiva.obtener(); if (!s) return { omitido: true };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return { sinRed: true };
    this.enCurso = true; emitir('sia:sync', 'inicio');
    try {
      await this._empujar(s.usuario.id); await this._traer(s.usuario.id);
      const a = SesionActiva.obtener(); if (a) { a.validadoEn = Date.now(); SesionActiva.guardar(a); }   // renueva la «licencia» sin conexión
      guardarEstado({ ...estado(), ultima: Date.now(), ultimoError: null });
      Log.info('Sync', 'Sincronizado', { pendientes: this.pendientes() }); return { ok: true };
    } catch (e) {
      if (e.codigo === 'SIN_RED') { Log.debug('Sync', 'Sin conexión: se reintenta luego'); return { sinRed: true }; }
      Log.error('Sync', 'Falló la sincronización: ' + e.message, { codigo: e.codigo }); guardarEstado({ ...estado(), ultimoError: e.message });
      if (FIN_SESION.includes(e.codigo)) emitir('sia:sesion-invalida', e.message);
      return { error: e.message, codigo: e.codigo };
    } finally { this.enCurso = false; emitir('sia:sync', 'fin'); }
  },
  async _empujar(uid) {
    for (let ops = Cola.pendientes(uid); ops.length; ops = Cola.pendientes(uid)) {
      const lote = ops.slice(0, 50), r = await Api.llamar('empujar', { ops: lote.map(({ idOp, tabla, accion, id, datos, baseVersion }) => ({ idOp, tabla, accion, id, datos, baseVersion })) });
      if (!r.resultados.length) break; Cola.quitar(r.resultados.map(x => x.idOp));
      const mal = r.resultados.filter(x => !x.ok); if (!mal.length) continue;
      const info = mal.map(x => { const o = lote.find(y => y.idOp === x.idOp); return { tabla: o.tabla, id: o.id, accion: o.accion, codigo: x.codigo, mensaje: x.mensaje, ts: Date.now() }; });
      const e = estado(); guardarEstado({ ...e, rechazadas: [...info, ...e.rechazadas].slice(0, 50) });
      Log.warn('Sync', `${mal.length} cambio(s) rechazado(s) por el servidor`, info);
      await this._restaurar([...new Set(info.map(i => i.tabla))], uid);     // el servidor manda: se vuelve a su versión
    }
  },
  async _traer(uid) { const e = estado(), r = await Api.llamar('cambios', { desde: e.desde }); this._aplicar(r.tablas, e.desde === 0, uid); guardarEstado({ ...estado(), desde: r.ahora }); },
  async _restaurar(tablas, uid) { const r = await Api.llamar('cambios', { desde: 0, tablas }); this._aplicar(r.tablas, true, uid); },
  _aplicar(tablas, completo, uid) {
    const pend = Cola.pendientes(uid);
    Object.entries(tablas).forEach(([t, d]) => { if (TABLAS_SYNC.includes(t)) new Tabla(t).aplicarServidor(d.filas, d.borrados, new Set(pend.filter(o => o.tabla === t).map(o => o.id)), completo); });
    if (completo) pend.filter(o => o.accion === 'insertar').forEach(o => { const tb = new Tabla(o.tabla); if (!tb.obtener(o.id)) tb._guardar([...tb._leer(), o.datos]); });   // recupera inserciones aún no enviadas
  },
  descartarRechazadas() { guardarEstado({ ...estado(), rechazadas: [] }); },
  iniciar() {
    if (this._ini || CONFIG.modo !== 'remoto' || typeof window === 'undefined') return; this._ini = true;
    const lanzar = () => this.sincronizar(); let t;
    setInterval(lanzar, CONFIG.syncIntervaloMs); window.addEventListener('online', lanzar);
    window.addEventListener('sia:cola', () => { clearTimeout(t); t = setTimeout(lanzar, 3000); });
    lanzar();
  }
};
