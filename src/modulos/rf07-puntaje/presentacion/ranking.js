import { iniciarVista } from '../../rf11-autenticacion/presentacion/shell.js';
import { ServicioPuntaje } from '../aplicacion/ServicioPuntaje.js';
import { ServicioVacantes } from '../../rf02-vacantes/aplicacion/ServicioVacantes.js';
import { etiquetaEstado } from '../../../compartido/dominio/Candidato.js';
import { esc, alerta, tabla, delegar } from '../../../core/Ui.js';

// Vista compartida: el reclutador calcula y consulta; el director solo consulta el ranking.
export function vistaRanking(rol) {
  const u = iniciarVista(rol, { tablero: false }); if (!u) return;
  const sp = new ServicioPuntaje(), vac = new ServicioVacantes().listar(u.idEmpresa), calc = rol === 'reclutador', c = document.getElementById('contenido');
  c.innerHTML = `<h1>${calc ? 'Puntaje de candidatos' : 'Ranking de candidatos'}</h1><p class="sub">Puntaje de 0 a 100 que mide qué tan bien encaja cada candidato con los requisitos de la vacante. Se calcula con reglas ponderadas que puedes ver en el desglose; es una ayuda, la decisión es de las personas.</p>
  <div id="msg" class="alerta" hidden role="alert"></div>
  ${vac.length ? `<div class="grid-form"><div class="cp"><label for="vac">Vacante</label><select id="vac">${vac.map(v => `<option value="${v.id}">${esc(v.titulo)}</option>`).join('')}</select></div>${calc ? '<button class="btn" data-a="calcular">Calcular puntajes</button>' : ''}</div>` : '<p class="vacio">Aún no hay vacantes.</p>'}<div id="lista"></div>`;
  const msg = document.getElementById('msg'), sel = document.getElementById('vac');
  const pintar = () => document.getElementById('lista').innerHTML = tabla([['Candidato', x => x.candidato.nombre], ['Puntaje', x => `<b>${x.valorPuntaje}</b>/100<div class="barra-p"><i style="width:${x.valorPuntaje}%"></i></div>`, true], ['Desglose', x => x.desglose.map(k => `<div>${esc(k.criterio)} (${k.peso}%): <b>${k.aporte}%</b> <span class="sub">${esc(k.detalle)}</span></div>`).join(''), true], ['Estado', x => etiquetaEstado(x.candidato.estadoProceso)]],
    sel ? sp.ranking(u.idEmpresa, sel.value) : [], calc ? 'Aún no hay puntajes. Pulsa «Calcular puntajes».' : 'El reclutador aún no ha calculado los puntajes de esta vacante.');
  if (sel) { sel.addEventListener('change', pintar); pintar(); }
  delegar(c, (a) => { if (a !== 'calcular') return; try { const r = sp.calcularVacante(u.idEmpresa, sel.value); alerta(msg, r.length ? `Puntajes calculados para ${r.length} candidato(s).` : 'Esta vacante aún no tiene candidatos.', r.length ? 'ok' : 'info'); pintar(); } catch (e) { alerta(msg, e.message); } });
}
