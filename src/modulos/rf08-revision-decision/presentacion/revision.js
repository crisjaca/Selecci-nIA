import { iniciarVista } from '../../rf11-autenticacion/presentacion/shell.js';
import { ServicioRevision } from '../aplicacion/ServicioRevision.js';
import { ServicioVacantes } from '../../rf02-vacantes/aplicacion/ServicioVacantes.js';
import { etiquetaEstado, ESTADOS_FINALES } from '../../../compartido/dominio/Candidato.js';
import { esc, alerta, tabla, fecha, delegar } from '../../../core/Ui.js';

const SUG = { avanzar: 'Se recomienda avanzar', revisar: 'Se recomienda revisión manual', rechazar: 'Se recomienda no continuar' }, DEC = { avanzar: 'Avanzó de etapa', aprobar: 'Aprobó (seleccionado)', rechazar: 'Rechazó' };
// Vista compartida: reclutador y director de área revisan la recomendación y registran la decisión final.
export function vistaRevision(rol) {
  const u = iniciarVista(rol, { tablero: false }); if (!u) return;
  const sr = new ServicioRevision(), vac = new ServicioVacantes().listar(u.idEmpresa), c = document.getElementById('contenido');
  c.innerHTML = `<h1>Revisión y decisión</h1><p class="sub">El sistema recomienda; tú decides. Revisa la recomendación y registra tu decisión con su justificación.</p><div id="msg" class="alerta" hidden role="alert"></div>
  ${vac.length ? `<div class="cp" style="max-width:340px"><label for="vac">Vacante</label><select id="vac">${vac.map(v => `<option value="${v.id}">${esc(v.titulo)}</option>`).join('')}</select></div>` : '<p class="vacio">Aún no hay vacantes.</p>'}<div id="panel"></div><div id="lista"></div>`;
  const msg = document.getElementById('msg'), sel = document.getElementById('vac'), panel = document.getElementById('panel');
  const pintar = () => document.getElementById('lista').innerHTML = tabla([['Candidato', x => x.nombre], ['Estado', x => etiquetaEstado(x.estadoProceso)], ['Experiencia', x => `${x.aniosExperiencia} año(s)`], ['', x => ESTADOS_FINALES.includes(x.estadoProceso) ? '<span class="sub">Decisión final registrada</span>' : `<button class="btn mini" data-a="revisar" data-id="${x.id}">Revisar</button>`, true]], sel ? sr.lista(u.idEmpresa, sel.value) : [], 'Esta vacante aún no tiene candidatos.');
  if (sel) { sel.addEventListener('change', () => { panel.innerHTML = ''; pintar(); }); pintar(); }
  delegar(c, (a, id) => { try {
    if (a === 'revisar') { const r = sr.recomendacion(u.idEmpresa, id), x = sr.candidatos.obtener(id), prev = sr.decisionesDe(u.idEmpresa, id);
      panel.innerHTML = `<div class="det"><h2>${esc(x.nombre)}</h2><p><span class="tag${r.sugerencia === 'rechazar' ? ' no' : ''}">${SUG[r.sugerencia]}</span> ${esc(r.resumen)}</p>
      ${r.criterios.map(k => `<div>${k.cumple ? '✓' : '✗'} <b>${esc(k.criterio)}</b>: ${esc(k.encontrado)} <span class="sub">(${esc(k.requerido)})</span></div>`).join('')}
      ${prev.length ? `<p class="sub">Decisiones anteriores: ${prev.map(d => `${DEC[d.decisionTomada]} (${esc(d.usuarioResponsable)}, ${fecha(d.fecha)})`).join('; ')}</p>` : ''}
      <form id="fd" class="grid-form"><div class="cp"><label for="dec">Decisión</label><select id="dec" name="decision"><option value="">Selecciona…</option><option value="avanzar">Avanzar a la siguiente etapa</option><option value="aprobar">Aprobar (seleccionar)</option><option value="rechazar">Rechazar</option></select></div>
      <div class="cp ancho"><label for="jus">Justificación</label><textarea id="jus" name="justificacion" rows="2"></textarea></div><button class="btn" type="submit">Registrar decisión</button></form></div>`;
      document.getElementById('fd').addEventListener('submit', (ev) => { ev.preventDefault(); try { sr.decidir(u, { idCandidato: id, ...Object.fromEntries(new FormData(ev.target)) }); panel.innerHTML = ''; alerta(msg, 'Decisión registrada.', 'ok'); pintar(); } catch (e) { alerta(msg, e.message); } }); panel.scrollIntoView(); } } catch (e) { alerta(msg, e.message); } });
}
