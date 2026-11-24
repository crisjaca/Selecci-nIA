import { iniciarVista } from '../../rf11-autenticacion/presentacion/shell.js';
import { ServicioVacantes } from '../aplicacion/ServicioVacantes.js';
import { NIVELES_EDUCATIVOS } from '../../../compartido/dominio/Requisito.js';
import { RAIZ } from '../../../core/Rutas.js';
import { esc, alerta, tabla, delegar, campo } from '../../../core/Ui.js';

const u = iniciarVista('reclutador', { tablero: false });
if (u) {
  const sv = new ServicioVacantes(), c = document.getElementById('contenido');
  const niv = NIVELES_EDUCATIVOS.map(n => `<option>${n}</option>`).join('');
  c.innerHTML = `<h1>Vacantes</h1><p class="sub">Define el perfil y los requisitos mínimos. Al publicarla, los candidatos la ven en la página pública y se postulan con su hoja de vida.</p>
  <div id="msg" class="alerta" hidden role="alert"></div>
  <form id="form" class="grid-form"><input type="hidden" name="id">${campo('Título de la vacante', 'titulo')}${campo('Área', 'area')}
  <div class="cp ancho"><label for="perfilProfesional">Perfil profesional requerido</label><textarea id="perfilProfesional" name="perfilProfesional" rows="2"></textarea></div>
  <div class="cp ancho"><label for="descripcion">Descripción (opcional)</label><textarea id="descripcion" name="descripcion" rows="2"></textarea></div>
  <div class="cp"><label for="nivelEducativoMinimo">Formación académica mínima</label><select id="nivelEducativoMinimo" name="nivelEducativoMinimo"><option value="">Selecciona…</option>${niv}</select></div>
  ${campo('Experiencia laboral mínima (años)', 'aniosExperienciaMinima', 'number', 'min="0" max="50" value="0"')}${campo('Requisitos adicionales (separados por coma)', 'palabrasClave', 'text', 'placeholder="Excel, inglés, SQL"')}
  <button class="btn" type="submit" id="guardar">Guardar vacante</button></form><div id="lista"></div>`;
  const msg = document.getElementById('msg'), f = document.getElementById('form');
  const pintar = () => document.getElementById('lista').innerHTML = tabla([['Vacante', v => `${v.titulo}${v.area ? ' · ' + v.area : ''}`], ['Formación mín.', v => v.requisitos.nivelEducativoMinimo || '—'], ['Experiencia mín.', v => `${v.requisitos.aniosExperienciaMinima} año(s)`], ['Estado', v => v.estado],
    ['Enlace de postulación', v => v.estado === 'publicada' ? `<a href="${RAIZ}vistas/publico/postular.html?id=${v.id}" target="_blank" rel="noopener">Abrir</a>` : '—', true],
    ['', v => `<button class="btn mini sec" data-a="editar" data-id="${v.id}">Editar</button> ${v.estado === 'publicada' ? `<button class="btn mini sec" data-a="cerrar" data-id="${v.id}">Cerrar</button>` : `<button class="btn mini sec" data-a="publicar" data-id="${v.id}">Publicar</button>`} <button class="btn mini sec" data-a="borrar" data-id="${v.id}">Eliminar</button>`, true]],
    sv.listar(u.idEmpresa), 'Aún no has creado vacantes.');
  f.addEventListener('submit', (ev) => { ev.preventDefault();
    try { sv.guardar(u.idEmpresa, Object.fromEntries(new FormData(f))); alerta(msg, 'Vacante guardada.', 'ok'); f.reset(); f.id.value = ''; pintar(); } catch (e) { alerta(msg, e.message); } });
  delegar(c, (a, id) => { try {
    if (a === 'editar') { const v = sv.obtener(u.idEmpresa, id); f.id.value = v.id; f.titulo.value = v.titulo; f.area.value = v.area; f.perfilProfesional.value = v.perfilProfesional; f.descripcion.value = v.descripcion;
      f.nivelEducativoMinimo.value = v.requisitos.nivelEducativoMinimo; f.aniosExperienciaMinima.value = v.requisitos.aniosExperienciaMinima; f.palabrasClave.value = v.requisitos.palabrasClave.join(', '); f.scrollIntoView(); }
    if (a === 'publicar') sv.cambiarEstado(u.idEmpresa, id, 'publicada');
    if (a === 'cerrar') sv.cambiarEstado(u.idEmpresa, id, 'cerrada');
    if (a === 'borrar' && confirm('¿Eliminar esta vacante?')) sv.eliminar(u.idEmpresa, id);
    if (a !== 'editar') alerta(msg, ''); pintar(); } catch (e) { alerta(msg, e.message); } });
  pintar();
}
