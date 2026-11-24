import '../../rf14-auditoria/aplicacion/engancharAuditoria.js';
import { ServicioVacantes } from '../../rf02-vacantes/aplicacion/ServicioVacantes.js';
import { ServicioCandidatos } from '../aplicacion/ServicioCandidatos.js';
import { NIVELES_EDUCATIVOS } from '../../../compartido/dominio/Requisito.js';
import { esc, alerta } from '../../../core/Ui.js';
import { CONFIG } from '../../../../config/app.config.js';
import { Api } from '../../../core/Api.js';
import { PostulacionRemota } from '../aplicacion/PostulacionRemota.js';

const id = new URLSearchParams(location.search).get('id'), main = document.getElementById('principal'), remoto = CONFIG.modo === 'remoto';
const v = remoto ? (await Api.llamar('vacantesPublicas', {}, { publico: true }).catch(() => [])).find(x => x.id === id) : new ServicioVacantes().publicas().find(x => x.id === id);
if (!v) main.innerHTML = '<div class="alerta info">Esta vacante no está disponible. <a href="vacantes.html">Ver otras vacantes</a></div>';
else {
  main.innerHTML = `<h1>${esc(v.titulo)}</h1><p class="sub">${esc(v.empresaNombre)}${v.area ? ' · ' + esc(v.area) : ''}</p><p>${esc(v.perfilProfesional)}</p>
  <p class="sub">Requisitos: formación mínima ${esc(v.requisitos.nivelEducativoMinimo)}, experiencia mínima ${v.requisitos.aniosExperienciaMinima} año(s)${v.requisitos.palabrasClave.length ? ', y valoramos: ' + esc(v.requisitos.palabrasClave.join(', ')) : ''}.</p>
  <div id="msg" class="alerta" hidden role="alert"></div>
  <form id="form" class="grid-form"><div class="cp"><label for="nombre">Nombre completo</label><input id="nombre" name="nombre" type="text" required></div>
  <div class="cp"><label for="correo">Correo</label><input id="correo" name="correo" type="email" required></div><div class="cp"><label for="telefono">Teléfono (opcional)</label><input id="telefono" name="telefono" type="text"></div>
  <div class="cp"><label for="nivelEducativo">Máximo nivel de formación</label><select id="nivelEducativo" name="nivelEducativo" required><option value="">Selecciona…</option>${NIVELES_EDUCATIVOS.map(n => `<option>${n}</option>`).join('')}</select></div>
  <div class="cp"><label for="aniosExperiencia">Años de experiencia laboral</label><input id="aniosExperiencia" name="aniosExperiencia" type="number" min="0" max="60" required></div>
  <div class="cp ancho"><label for="archivo">Hoja de vida (PDF o DOCX, máximo 10 MB)</label><input id="archivo" name="archivo" type="file" accept=".pdf,.docx" required></div>
  <label class="chk ancho"><input type="checkbox" name="consentimiento" id="consentimiento"> Autorizo el tratamiento de mis datos personales para este proceso de selección.</label>
  <button class="btn" type="submit">Enviar postulación</button></form>`;
  const f = document.getElementById('form'), msg = document.getElementById('msg');
  f.addEventListener('submit', async (e) => { e.preventDefault(); const b = f.querySelector('button'); b.disabled = true;
    try { await (remoto ? PostulacionRemota : new ServicioCandidatos()).postular({ idVacante: v.id, nombre: f.nombre.value, correo: f.correo.value, telefono: f.telefono.value, nivelEducativo: f.nivelEducativo.value, aniosExperiencia: f.aniosExperiencia.value, consentimiento: f.consentimiento.checked, archivo: f.archivo.files[0] });
      main.innerHTML = '<div class="alerta ok"><b>¡Postulación enviada!</b> La empresa revisará tu hoja de vida. <a href="vacantes.html">Ver otras vacantes</a></div>';
    } catch (err) { alerta(msg, err.message || 'No se pudo enviar la postulación.'); b.disabled = false; } });
}
