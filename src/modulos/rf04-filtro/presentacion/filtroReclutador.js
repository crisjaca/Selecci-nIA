import { iniciarVista } from '../../rf11-autenticacion/presentacion/shell.js';
import { ServicioFiltro } from '../aplicacion/ServicioFiltro.js';
import { ServicioVacantes } from '../../rf02-vacantes/aplicacion/ServicioVacantes.js';
import { esc, alerta, tabla, delegar } from '../../../core/Ui.js';

const u = iniciarVista('reclutador', { tablero: false });
if (u) {
  const sf = new ServicioFiltro(), vac = new ServicioVacantes().listar(u.idEmpresa), c = document.getElementById('contenido');
  c.innerHTML = `<h1>Filtro de candidatos</h1><p class="sub">Compara cada candidato con los requisitos de la vacante. «Cumple» exige la formación y la experiencia mínimas; los requisitos adicionales suben el nivel de cumplimiento. La formación y la experiencia son las que declaró el candidato: confírmalas en su hoja de vida.</p>
  <div id="msg" class="alerta" hidden role="alert"></div>
  ${vac.length ? `<div class="grid-form"><div class="cp"><label for="vac">Vacante</label><select id="vac">${vac.map(v => `<option value="${v.id}">${esc(v.titulo)}</option>`).join('')}</select></div><button class="btn" data-a="filtrar">Ejecutar filtro</button></div>` : '<p class="vacio">Primero crea una vacante en «Vacantes».</p>'}<div id="lista"></div>`;
  const msg = document.getElementById('msg'), sel = document.getElementById('vac');
  const pintar = (r) => document.getElementById('lista').innerHTML = tabla([['Candidato', x => `${x.candidato.nombre}`], ['Nivel', x => `${x.nivelCumplimiento}%`], ['Resultado', x => `<span class="tag${x.cumple ? '' : ' no'}">${x.cumple ? 'Cumple' : 'No cumple'}</span>`, true],
    ['Criterios', x => x.criterios.map(k => `<div>${k.cumple ? '✓' : '✗'} <b>${esc(k.criterio)}</b>: ${esc(k.encontrado)} <span class="sub">(${esc(k.requerido)})</span></div>`).join(''), true]], r, 'Aún no se ha ejecutado el filtro para esta vacante.');
  if (sel) { sel.addEventListener('change', () => pintar(sf.resultados(u.idEmpresa, sel.value))); pintar(sf.resultados(u.idEmpresa, sel.value)); }
  delegar(c, (a) => { if (a !== 'filtrar') return; try { const r = sf.ejecutar(u.idEmpresa, sel.value); pintar(r); alerta(msg, r.length ? `Filtro ejecutado: ${r.filter(x => x.cumple).length} de ${r.length} candidatos cumplen.` : 'Esta vacante aún no tiene candidatos.', r.length ? 'ok' : 'info'); } catch (e) { alerta(msg, e.message); } });
}
