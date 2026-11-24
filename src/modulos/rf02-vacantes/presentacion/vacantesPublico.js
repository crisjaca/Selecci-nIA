import { ServicioVacantes } from '../aplicacion/ServicioVacantes.js';
import { esc } from '../../../core/Ui.js';
import { CONFIG } from '../../../../config/app.config.js';
import { Api } from '../../../core/Api.js';

const el = document.getElementById('vacantes');
// Modo remoto: la lista sale del servidor (el visitante no tiene datos locales). Solo vienen vacantes de empresas con suscripción vigente.
const fuente = CONFIG.modo === 'remoto' ? await Api.llamar('vacantesPublicas', {}, { publico: true }).catch(() => []) : new ServicioVacantes().publicas();
const lista = fuente.sort((a, b) => b.fechaPublicacion - a.fechaPublicacion);
el.innerHTML = lista.length ? lista.map(v => `<article class="vac"><h2>${esc(v.titulo)}</h2><p class="sub">${esc(v.empresaNombre)}${v.area ? ' · ' + esc(v.area) : ''}</p><p>${esc(v.perfilProfesional)}</p>
  <p class="sub">Formación mínima: ${esc(v.requisitos.nivelEducativoMinimo)} · Experiencia mínima: ${v.requisitos.aniosExperienciaMinima} año(s)</p><a class="btn" href="postular.html?id=${v.id}">Postularme</a></article>`).join('')
  : '<p class="vacio">No hay vacantes abiertas por ahora. Vuelve pronto.</p>';
