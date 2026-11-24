import { CONFIG } from '../../../../config/app.config.js';
import { ROLES } from '../../../../config/permisos.config.js';
import { ServicioSesiones } from '../aplicacion/ServicioSesiones.js';
import { SesionActiva } from '../../../core/SesionActiva.js';
import { Api } from '../../../core/Api.js';
import { Log } from '../../../core/Logger.js';
import { ir } from '../../../core/Rutas.js';

const FIN_SESION = ['SESION_INVALIDA', 'LIMITE_DISPOSITIVOS', 'SIN_SUSCRIPCION'];
const cerrar = (texto) => { SesionActiva.limpiar(); alert(texto || 'Tu sesión fue cerrada. Inicia sesión de nuevo.'); ir('login.html'); };
// ¿La sesión sigue siendo válida? Local: existe en la tabla de sesiones. Remoto: hubo contacto con el servidor dentro de la «licencia sin conexión».
const vigente = (s) => CONFIG.modo === 'remoto' ? Date.now() - (s.validadoEn || 0) < CONFIG.licenciaOfflineMs : new ServicioSesiones().renovar(s.token);

export const Guardia = {
  // Protege una vista. Devuelve el usuario o null (y redirige) si no puede entrar.
  exigir(roles = null, { permitirCambio = false } = {}) {
    const s = SesionActiva.obtener();
    if (!s || !vigente(s)) { Log.info('Guardia', 'Sesión no vigente: se pide iniciar sesión'); SesionActiva.limpiar(); ir('login.html?expirada=1'); return null; }
    if (roles && !roles.includes(s.usuario.rol)) { ir(ROLES[s.usuario.rol].inicio); return null; }
    if (s.usuario.debeCambiarClave && !permitirCambio) { ir('cambiar-clave.html'); return null; }
    return s.usuario;
  },
  // Señal de vida: mantiene el cupo de dispositivo y detecta si alguien cerró esta sesión o venció la suscripción.
  iniciarLatido() {
    if (typeof window !== 'undefined') window.addEventListener('sia:sesion-invalida', (e) => cerrar(e.detail));
    setInterval(async () => {
      const s = SesionActiva.obtener();
      if (CONFIG.modo === 'remoto') {
        if (!s) return cerrar();
        try { await Api.llamar('latido'); s.validadoEn = Date.now(); SesionActiva.guardar(s); }
        catch (e) { if (FIN_SESION.includes(e.codigo)) cerrar(e.message); /* SIN_RED: se sigue trabajando sin conexión */ }
      } else if (!s || !new ServicioSesiones().renovar(s.token)) cerrar();
    }, CONFIG.latidoMs);
  }
};
