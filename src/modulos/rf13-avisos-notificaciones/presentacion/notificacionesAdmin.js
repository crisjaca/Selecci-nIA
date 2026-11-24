import { iniciarVista } from '../../rf11-autenticacion/presentacion/shell.js';
import { ServicioNotificaciones } from '../aplicacion/ServicioNotificaciones.js';
import { tabla, fecha, hora, delegar } from '../../../core/Ui.js';

if (iniciarVista('admin_plataforma', { tablero: false })) {
  const sn = new ServicioNotificaciones(), c = document.getElementById('contenido');
  c.innerHTML = `<h1>Notificaciones</h1><p class="sub">Avisos para el administrador: ingresos bloqueados por el límite de dispositivos (varios intentos de la misma empresa se agrupan en uno) y mensajes nuevos del buzón de sugerencias.</p><div id="lista"></div>`;
  const texto = (n) => { const d = n.datos || {};
    if (n.tipo === 'sugerencia') return `${d.usuario} (${d.rol}) envió ${d.tipoSug}: «${d.asunto}». Respóndelo en «Sugerencias».`;
    if (n.tipo === 'limite_dispositivos') return `${d.empresa} (NIT ${d.nit}), plan ${d.plan}: ${d.usados} de ${d.limite} dispositivos en uso. Último intento: ${d.usuario} (${d.correo}) desde ${d.navegador}.`;
    return n.titulo; };
  const pintar = () => document.getElementById('lista').innerHTML = tabla([['', n => n.leida ? '' : '●'], ['Último intento', n => `${fecha(n.ultimaFecha)} ${hora(n.ultimaFecha)}`], ['Detalle', n => texto(n)], ['Intentos', n => n.tipo === 'limite_dispositivos' ? n.intentos : ''],
    ['', n => n.leida ? '' : `<button class="btn mini sec" data-a="leer" data-id="${n.id}">Marcar como leída</button>`, true]],
    sn.repo.listar().sort((a, b) => b.ultimaFecha - a.ultimaFecha), 'No hay notificaciones.');
  delegar(c, (a, id) => { if (a === 'leer') { sn.marcarLeida(id); pintar(); } });
  pintar();
}
