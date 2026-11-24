import '../../rf14-auditoria/aplicacion/engancharAuditoria.js';
import { ROLES } from '../../../../config/permisos.config.js';
import { Guardia } from './Guardia.js';
import { ServicioAutenticacion } from '../aplicacion/ServicioAutenticacion.js';
import { ServicioNotificaciones } from '../../rf13-avisos-notificaciones/aplicacion/ServicioNotificaciones.js';
import { ServicioAvisos } from '../../rf13-avisos-notificaciones/aplicacion/ServicioAvisos.js';
import { ServicioSuscripcion } from '../../rf01-empresa-suscripcion/aplicacion/ServicioSuscripcion.js';
import { Sync } from '../../rf10-sin-conexion/aplicacion/Sincronizador.js';
import { CONFIG } from '../../../../config/app.config.js';
import { RAIZ, ir } from '../../../core/Rutas.js';
import { esc, fecha, hora } from '../../../core/Ui.js';

// Barra superior, menú del rol y avisos. Con tablero=true pinta además el tablero de inicio. Devuelve el usuario o null.
export function iniciarVista(rol, { tablero = true } = {}) {
  const u = Guardia.exigir([rol]); if (!u) return null;
  Guardia.iniciarLatido();
  const meta = ROLES[rol], base = RAIZ + 'vistas/' + meta.carpeta + '/';
  const nuevas = rol === 'admin_plataforma' ? new ServicioNotificaciones().noLeidas().length : 0;
  const menu = [['Inicio', 'dashboard.html'], ...meta.vistas.filter(v => v[1])]
    .map(v => `<a href="${base}${v[1]}"${location.pathname.endsWith('/' + v[1]) ? ' aria-current="page"' : ''}>${esc(v[0])}${v[1] === 'notificaciones.html' && nuevas ? ` <b class="punto">${nuevas}</b>` : ''}</a>`).join('');
  document.getElementById('barra').innerHTML = `<div class="barra-in"><a class="marca" href="${RAIZ}index.html">SelecciónIA</a><span class="rolchip">${esc(meta.etiqueta)}</span>
    <span class="espacio"></span><span id="estado" class="estado"></span><span class="quien">${esc(u.nombre)}</span><button id="salir" class="btn mini sec">Cerrar sesión</button></div><nav class="menu">${menu}</nav>`;
  const est = document.getElementById('estado');
  // Indicador de conexión y cambios pendientes (RNF_03). Clic = sincronizar ahora.
  const pintar = () => { const n = Sync.pendientes(), on = navigator.onLine !== false, ult = Sync.estado().ultima; est.dataset.on = on;
    est.textContent = `${on ? 'En línea' : 'Sin conexión'} · ${n} pendiente${n === 1 ? '' : 's'}${CONFIG.modo === 'remoto' && ult ? ' · sincronizado ' + hora(ult) : ''}`; };
  ['online', 'offline', 'sia:sync', 'sia:cola'].forEach(ev => addEventListener(ev, pintar)); pintar();
  est.title = 'Clic para sincronizar ahora'; est.style.cursor = 'pointer'; est.onclick = () => Sync.sincronizar();
  Sync.iniciar();                                              // sincronización automática (solo en modo remoto)
  document.getElementById('salir').onclick = async () => { await new ServicioAutenticacion().cerrarSesion(); ir('login.html'); };
  const main = document.getElementById('contenido'), avisos = document.createElement('div');
  avisos.className = 'avisos'; main.before(avisos);
  avisos.innerHTML = new ServicioAvisos().activos().map(a => `<div class="alerta info"><b>${esc(a.titulo)}.</b> ${esc(a.texto)}</div>`).join('');
  if (tablero) {
    let extra = '';
    if (rol === 'empresa') { const { sus, plan } = new ServicioSuscripcion().resumen(u.idEmpresa);
      extra = plan ? `<div class="alerta ok">Suscripción activa: <b>${esc(plan.nombre)}</b>, vence el ${fecha(sus.fechaVencimiento)}.</div>` : `<div class="alerta info">Tu empresa aún no tiene suscripción activa. Elige un plan en «Suscripción y pago».</div>`; }
    const listo = meta.vistas.filter(v => v[1]), falta = meta.vistas.filter(v => !v[1]);
    main.innerHTML = `<h1>Hola, ${esc(u.nombre.split(' ')[0])}</h1>${extra}
      ${listo.length ? `<h2>Disponible ahora</h2><ul class="enlaces">${listo.map(v => `<li><a href="${base}${v[1]}">${esc(v[0])}</a></li>`).join('')}</ul>` : ''}
      ${falta.length ? `<h2>Próximamente</h2><p class="sub">Estas vistas se construyen en las siguientes fases.</p><ul class="pendientes">${falta.map(v => `<li>${esc(v[0])}</li>`).join('')}</ul>` : ''}`;
  }
  return u;
}
