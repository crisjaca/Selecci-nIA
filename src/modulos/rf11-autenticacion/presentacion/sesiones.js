import { ROLES_CON_CUPO } from '../../../../config/permisos.config.js';
import { iniciarVista } from './shell.js';
import { ServicioSesiones } from '../aplicacion/ServicioSesiones.js';
import { RepositorioUsuario } from '../infraestructura/RepositorioUsuario.js';
import { RepositorioEmpresa } from '../../rf01-empresa-suscripcion/infraestructura/RepositorioEmpresa.js';
import { ServicioNotificaciones } from '../../rf13-avisos-notificaciones/aplicacion/ServicioNotificaciones.js';
import { Sync } from '../../rf10-sin-conexion/aplicacion/Sincronizador.js';
import { CONFIG } from '../../../../config/app.config.js';
import { Api } from '../../../core/Api.js';
import { tabla, fecha, hora, delegar } from '../../../core/Ui.js';

// Vista compartida: la empresa ve las sesiones de sus usuarios; el administrador ve las de todas las empresas.
export function vistaSesiones(rol) {
  const u = iniciarVista(rol, { tablero: false }); if (!u) return;
  const admin = rol === 'admin_plataforma', ss = new ServicioSesiones(), sn = new ServicioNotificaciones(), c = document.getElementById('contenido');
  c.innerHTML = `<h1>Sesiones activas</h1><p class="sub">Dispositivos conectados ahora. Si cierras una sesión, ese dispositivo vuelve al inicio de sesión y libera su cupo.</p><div id="activas"></div><h2>Ingresos bloqueados por el límite del plan</h2><div id="bloq"></div>`;
  const pintar = () => {
    ss.expirar();
    const usr = Object.fromEntries(new RepositorioUsuario().listar().map(x => [x.id, x.nombre])), emp = Object.fromEntries(new RepositorioEmpresa().listar().map(x => [x.id, x.nombre]));
    const lista = ss.repo.listar(s => ROLES_CON_CUPO.includes(s.rol) && (admin || s.idEmpresa === u.idEmpresa));
    document.getElementById('activas').innerHTML = tabla([['Usuario', s => usr[s.idUsuario] || '—'], ...(admin ? [['Empresa', s => emp[s.idEmpresa] || '—']] : []), ['Navegador', s => s.navegador],
      ['Inició', s => `${fecha(s.inicio)} ${hora(s.inicio)}`], ['Última actividad', s => hora(s.ultimaActividad)], ['', s => `<button class="btn mini sec" data-a="cerrar" data-id="${s.id}">Cerrar sesión</button>`, true]], lista, 'No hay dispositivos conectados.');
    const bl = sn.repo.listar(n => n.tipo === 'limite_dispositivos' && (admin || n.idEmpresa === u.idEmpresa)).sort((a, b) => b.ultimaFecha - a.ultimaFecha);
    document.getElementById('bloq').innerHTML = tabla([['Último intento', n => `${fecha(n.ultimaFecha)} ${hora(n.ultimaFecha)}`], ...(admin ? [['Empresa', n => n.datos.empresa]] : []), ['Usuario', n => `${n.datos.usuario} (${n.datos.correo})`], ['Navegador', n => n.datos.navegador], ['Intentos', n => n.intentos]], bl, 'No ha habido ingresos bloqueados.');
  };
  delegar(c, async (a, id) => {
    if (a !== 'cerrar') return;
    if (CONFIG.modo === 'remoto') { await Api.llamar('cerrarSesionDe', { id }).catch(e => alert(e.message)); await Sync.sincronizar(); } else ss.repo.eliminar(id);
    pintar(); });
  pintar();
}
