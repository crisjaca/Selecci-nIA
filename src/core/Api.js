import { CONFIG } from '../../config/app.config.js';
import { SesionActiva } from './SesionActiva.js';
import { ErrorApp } from './Errores.js';
import { Log } from './Logger.js';
// Única puerta hacia Apps Script. Códigos de error útiles: SIN_RED (no hay internet), SESION_INVALIDA, LIMITE_DISPOSITIVOS, SIN_SUSCRIPCION.
// IMPORTANTE: el cuerpo se envía SIN cabecera Content-Type (llega como text/plain) para evitar la petición previa (preflight) que Apps Script no responde.
export const Api = {
  async llamar(accion, datos = {}, { publico = false } = {}) {
    if (!CONFIG.appsScriptUrl) throw new ErrorApp('SIN_URL', 'Falta configurar appsScriptUrl en config/app.config.js.');
    const s = publico ? null : SesionActiva.obtener();
    Log.debug('Api', '→ ' + accion);
    let r; try { r = await fetch(CONFIG.appsScriptUrl, { method: 'POST', body: JSON.stringify({ accion, token: s ? s.token : undefined, ...datos }) }); }
    catch { throw new ErrorApp('SIN_RED', 'No hay conexión con el servidor.'); }
    let j; try { j = await r.json(); } catch { throw new ErrorApp('RESPUESTA', 'El servidor respondió algo que no se entiende. Revisa la URL y que la implementación esté publicada para «Cualquier persona».'); }
    if (!j.ok) { Log.warn('Api', `✗ ${accion}: ${j.codigo}`, j.mensaje); throw new ErrorApp(j.codigo || 'SERVIDOR', j.mensaje || 'Error del servidor.'); }
    return j.datos;
  }
};
