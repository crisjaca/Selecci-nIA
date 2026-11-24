import { iniciarVista } from '../../rf11-autenticacion/presentacion/shell.js';
import { ServicioEtapas } from '../aplicacion/ServicioEtapas.js';
import { ServicioVacantes } from '../../rf02-vacantes/aplicacion/ServicioVacantes.js';
import { etiquetaEstado } from '../../../compartido/dominio/Candidato.js';
import { esc, alerta, tabla, fecha, hora, delegar, campo } from '../../../core/Ui.js';

const u = iniciarVista('reclutador', { tablero: false });
if (u) {
  const se = new ServicioEtapas(), vac = new ServicioVacantes().listar(u.idEmpresa), c = document.getElementById('contenido');
  c.innerHTML = `<h1>Etapas y evaluaciones</h1><p class="sub">Define las etapas de cada vacante y registra el resultado de las evaluaciones que hiciste con el candidato. El sistema solo guarda y deja el respaldo; para avanzar, aprobar o rechazar usa «Revisión y decisión».</p>
  <div id="msg" class="alerta" hidden role="alert"></div>${vac.length ? `<div class="cp" style="max-width:340px"><label for="vac">Vacante</label><select id="vac">${vac.map(v => `<option value="${v.id}">${esc(v.titulo)}</option>`).join('')}</select></div>
  <h2>Etapas</h2><form id="fe" class="grid-form">${campo('Nombre de la etapa', 'nombreEtapa')}<div class="cp"><label for="tipo">Tipo</label><select id="tipo" name="tipo"><option value="entrevista">Entrevista</option><option value="prueba">Prueba</option><option value="otro">Otro</option></select></div><button class="btn" type="submit">Agregar etapa</button><button class="btn sec" type="button" data-a="sugeridas">Usar etapas sugeridas</button></form><div id="etapas"></div>
  <h2>Candidatos en etapas</h2><div id="enetapa"></div><div id="form-ev"></div><h2>Historial de auditoría</h2><div id="hist"></div>` : '<p class="vacio">Primero crea una vacante.</p>'}`;
  const msg = document.getElementById('msg'), sel = document.getElementById('vac');
  const pintar = () => { if (!sel) return; const et = se.listarEtapas(u.idEmpresa, sel.value), nom = Object.fromEntries(et.map(e => [e.id, e.nombreEtapa]));
    document.getElementById('etapas').innerHTML = tabla([['Orden', e => e.orden], ['Etapa', e => e.nombreEtapa], ['Tipo', e => e.tipo], ['', e => `<button class="btn mini sec" data-a="quitar" data-id="${e.id}">Eliminar</button>`, true]], et, 'Esta vacante aún no tiene etapas.');
    document.getElementById('enetapa').innerHTML = tabla([['Candidato', x => x.nombre], ['Etapa actual', x => nom[x.idEtapaActual] || '—'], ['Estado', x => etiquetaEstado(x.estadoProceso)], ['Evaluaciones', x => se.evaluacionesDe(u.idEmpresa, x.id).length], ['', x => `<button class="btn mini" data-a="evaluar" data-id="${x.id}">Registrar evaluación</button>`, true]], se.enEtapa(u.idEmpresa, sel.value), 'Ningún candidato está en una etapa. Avanza candidatos desde «Revisión y decisión».');
    document.getElementById('hist').innerHTML = tabla([['Fecha', h => `${fecha(h.fechaRegistro)} ${hora(h.fechaRegistro)}`], ['Candidato', h => h.candidatoNombre], ['Etapa', h => h.nombreEtapa], ['Resultado', h => h.resultadoRegistrado === 'aprobado' ? 'Aprobado' : 'No aprobado'], ['Responsable', h => h.usuarioResponsable]], se.historial(u.idEmpresa, sel.value), 'Aún no hay evaluaciones registradas.'); };
  if (sel) { sel.addEventListener('change', () => { document.getElementById('form-ev').innerHTML = ''; pintar(); }); pintar();
    document.getElementById('fe').addEventListener('submit', (ev) => { ev.preventDefault(); try { se.crearEtapa(u.idEmpresa, sel.value, Object.fromEntries(new FormData(ev.target))); ev.target.reset(); alerta(msg, ''); pintar(); } catch (e) { alerta(msg, e.message); } }); }
  delegar(c, (a, id) => { try {
    if (a === 'sugeridas') se.usarSugeridas(u.idEmpresa, sel.value);
    if (a === 'quitar' && confirm('¿Eliminar esta etapa?')) se.eliminarEtapa(u.idEmpresa, id);
    if (a === 'evaluar') { const x = se.candidatos.obtener(id); document.getElementById('form-ev').innerHTML = `<form id="fv" class="grid-form"><h3 class="ancho">Evaluación de ${esc(x.nombre)}</h3><div class="cp ancho"><label for="obs">Observaciones</label><textarea id="obs" name="observaciones" rows="3"></textarea></div><div class="cp"><label for="res">Resultado</label><select id="res" name="resultado"><option value="aprobado">Aprobado</option><option value="no_aprobado">No aprobado</option></select></div><button class="btn" type="submit">Guardar evaluación</button></form>`;
      document.getElementById('fv').addEventListener('submit', (ev) => { ev.preventDefault(); try { se.registrarEvaluacion(u, { idCandidato: id, ...Object.fromEntries(new FormData(ev.target)) }); document.getElementById('form-ev').innerHTML = ''; alerta(msg, 'Evaluación registrada y respaldada en el historial.', 'ok'); pintar(); } catch (e) { alerta(msg, e.message); } }); return; }
    alerta(msg, ''); pintar(); } catch (e) { alerta(msg, e.message); } });
}
