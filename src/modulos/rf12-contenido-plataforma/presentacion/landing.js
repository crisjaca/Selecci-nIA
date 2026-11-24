import { ServicioContenido } from '../aplicacion/ServicioContenido.js';
import { SesionActiva } from '../../../core/SesionActiva.js';
import { ROLES } from '../../../../config/permisos.config.js';
import { RAIZ } from '../../../core/Rutas.js';
import { esc } from '../../../core/Ui.js';
import { CONFIG } from '../../../../config/app.config.js';
import { Api } from '../../../core/Api.js';

// En modo remoto el visitante (sin sesión) pide el contenido publicado al servidor; si falla, se muestran los textos por defecto.
const remoto = CONFIG.modo === 'remoto' ? await Api.llamar('contenidoPublico', {}, { publico: true }).catch(() => null) : null;
const c = new ServicioContenido().obtener(remoto), $ = (id) => document.getElementById(id);
$('quienes').textContent = c.quienesSomos; $('mision').textContent = c.mision; $('vision').textContent = c.vision;
$('correo').textContent = c.contacto.correo; $('correo').href = 'mailto:' + c.contacto.correo;
const lista = (id, items, campo) => { const s = $(id); if (!items.length) { s.hidden = true; return; }
  s.querySelector('ul').innerHTML = items.map(i => `<li><b>${esc(i.titulo)}</b> ${esc(i.texto || '')}</li>`).join(''); };
lista('sec-novedades', c.novedades); lista('sec-promociones', c.promociones); lista('sec-alianzas', c.alianzas);
const s = SesionActiva.obtener();   // si ya hay sesión, el botón lleva al tablero
if (s) { const a = $('acceso'); a.textContent = 'Ir a mi tablero'; a.href = RAIZ + ROLES[s.usuario.rol].inicio; }
