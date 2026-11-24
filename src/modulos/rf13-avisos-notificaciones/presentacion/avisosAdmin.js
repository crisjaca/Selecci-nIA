import { iniciarVista } from '../../rf11-autenticacion/presentacion/shell.js';
import { ServicioAvisos } from '../aplicacion/ServicioAvisos.js';
import { alerta, tabla, fecha, delegar, campo } from '../../../core/Ui.js';

if (iniciarVista('admin_plataforma', { tablero: false })) {
  const sv = new ServicioAvisos(), c = document.getElementById('contenido');
  c.innerHTML = `<h1>Avisos de actualización</h1><p class="sub">Los avisos activos aparecen en la parte superior del tablero de todos los usuarios.</p>
  <div id="msg" class="alerta" hidden role="alert"></div>
  <form id="form" class="grid-form">${campo('Título', 'titulo')}<div class="cp ancho"><label for="texto">Mensaje</label><textarea id="texto" name="texto" rows="3"></textarea></div><button class="btn" type="submit">Publicar aviso</button></form><div id="lista"></div>`;
  const msg = document.getElementById('msg');
  const pintar = () => document.getElementById('lista').innerHTML = tabla([['Fecha', a => fecha(a.fecha)], ['Título', a => a.titulo], ['Mensaje', a => a.texto], ['Estado', a => a.estado],
    ['', a => a.estado === 'activo' ? `<button class="btn mini sec" data-a="archivar" data-id="${a.id}">Archivar</button>` : '', true]], sv.listar(), 'No has publicado avisos.');
  document.getElementById('form').addEventListener('submit', (ev) => { ev.preventDefault(); const f = ev.target;
    try { sv.publicar(Object.fromEntries(new FormData(f))); f.reset(); alerta(msg, 'Aviso publicado.', 'ok'); pintar(); } catch (e) { alerta(msg, e.message); } });
  delegar(c, (a, id) => { if (a === 'archivar') { sv.archivar(id); pintar(); } });
  pintar();
}
