import { CONFIG } from '../../../../config/app.config.js';
import { iniciarVista } from '../../rf11-autenticacion/presentacion/shell.js';
import { Sync } from '../aplicacion/Sincronizador.js';
import { Cola } from '../../../core/Cola.js';
import { Api } from '../../../core/Api.js';
import { Log } from '../../../core/Logger.js';
import { esc, alerta, tabla, fecha, hora, delegar } from '../../../core/Ui.js';

// Vista de estado de la sincronización. Para el administrador funciona además como panel de DIAGNÓSTICO (registro de actividad).
export function vistaSincronizacion(rol) {
  const u = iniciarVista(rol, { tablero: false }); if (!u) return;
  const admin = rol === 'admin_plataforma', c = document.getElementById('contenido');
  c.innerHTML = `<h1>${admin ? 'Diagnóstico' : 'Sincronización'}</h1><p class="sub">Estado de los datos de este dispositivo. ${CONFIG.modo === 'remoto' ? 'Los cambios se guardan aquí y se envían a Google Sheets cuando hay conexión.' : 'Modo local: los datos viven solo en este navegador.'}</p>
  <div id="msg" class="alerta" hidden role="alert"></div><div id="estado"></div><p><button class="btn" data-a="sync">Sincronizar ahora</button> ${admin ? '<button class="btn sec" data-a="ping">Probar conexión</button>' : ''}</p>
  <h2>Cambios pendientes de enviar</h2><div id="cola"></div><h2>Cambios rechazados por el servidor</h2><div id="rech"></div>
  ${admin ? '<h2>Registro de actividad</h2><p><button class="btn mini sec" data-a="limpiarlog">Limpiar registro</button></p><div id="logs"></div>' : ''}`;
  const msg = document.getElementById('msg'), NV = { debug: 'detalle', info: 'info', warn: 'aviso', error: 'error' };
  const pintar = () => { const e = Sync.estado(), url = CONFIG.appsScriptUrl;
    document.getElementById('estado').innerHTML = `<div class="alerta info">Modo: <b>${CONFIG.modo}</b> · Última sincronización: <b>${e.ultima ? fecha(e.ultima) + ' ' + hora(e.ultima) : 'nunca'}</b> · Pendientes: <b>${Sync.pendientes()}</b>${e.ultimoError ? ` · Último error: ${esc(e.ultimoError)}` : ''}${admin && CONFIG.modo === 'remoto' ? `<br>Servidor: ${url ? esc(url.slice(0, 48)) + '…' : 'SIN CONFIGURAR'}` : ''}</div>`;
    document.getElementById('cola').innerHTML = tabla([['Tabla', o => o.tabla], ['Acción', o => o.accion], ['Registro', o => o.id.slice(0, 8)], ['Hace', o => hora(o.ts)]], Cola.pendientes(u.id), 'Todo está enviado.');
    document.getElementById('rech').innerHTML = tabla([['Cuándo', o => `${fecha(o.ts)} ${hora(o.ts)}`], ['Tabla', o => o.tabla], ['Acción', o => o.accion], ['Motivo', o => o.mensaje]], Sync.estado().rechazadas, 'Ninguno.');
    if (admin) document.getElementById('logs').innerHTML = tabla([['Hora', l => `${fecha(l.t)} ${hora(l.t)}`], ['Nivel', l => NV[l.nivel]], ['Módulo', l => l.modulo], ['Mensaje', l => l.msg]], Log.recientes().slice(0, 100), 'Sin registros.'); };
  ['sia:sync', 'sia:cola'].forEach(ev => addEventListener(ev, pintar));
  delegar(c, async (a) => {
    if (a === 'sync') { const r = await Sync.sincronizar(); alerta(msg, r.ok ? 'Sincronizado.' : r.sinRed ? 'Sin conexión: los cambios siguen guardados en este dispositivo.' : r.omitido ? 'En modo local no hay nada que sincronizar.' : (r.error || ''), r.ok ? 'ok' : 'info'); }
    if (a === 'ping') { try { const r = await Api.llamar('ping', {}, { publico: true }); alerta(msg, `Servidor activo, versión ${r.version}.`, 'ok'); } catch (e) { alerta(msg, e.message); } }
    if (a === 'limpiarlog') Log.limpiar(); pintar(); });
  pintar();
}
