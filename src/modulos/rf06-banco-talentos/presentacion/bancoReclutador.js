import { iniciarVista } from '../../rf11-autenticacion/presentacion/shell.js';
import { ServicioBanco } from '../aplicacion/ServicioBanco.js';
import { ServicioVacantes } from '../../rf02-vacantes/aplicacion/ServicioVacantes.js';
import { NIVELES_EDUCATIVOS } from '../../../compartido/dominio/Requisito.js';
import { etiquetaEstado } from '../../../compartido/dominio/Candidato.js';
import { esc, alerta, tabla, fecha, delegar } from '../../../core/Ui.js';

const u = iniciarVista('reclutador', { tablero: false });
if (u) {
  const sb = new ServicioBanco(), vac = new ServicioVacantes().listar(u.idEmpresa), c = document.getElementById('contenido');
  c.innerHTML = `<h1>Banco de talentos</h1><p class="sub">Hojas de vida de candidatos que no fueron seleccionados, conservadas para futuras vacantes. Solo consulta y descarga.</p><div id="msg" class="alerta" hidden role="alert"></div>
  <form id="ff" class="grid-form"><div class="cp"><label for="q">Buscar (nombre, correo o contenido)</label><input id="q" name="q" type="text"></div>
  <div class="cp"><label for="idVacante">Vacante de origen</label><select id="idVacante" name="idVacante"><option value="">Todas</option>${vac.map(v => `<option value="${v.id}">${esc(v.titulo)}</option>`).join('')}</select></div>
  <div class="cp"><label for="nivel">Formación mínima</label><select id="nivel" name="nivel"><option value="">Cualquiera</option>${NIVELES_EDUCATIVOS.map(n => `<option>${n}</option>`).join('')}</select></div>
  <div class="cp"><label for="anios">Experiencia mínima (años)</label><input id="anios" name="anios" type="number" min="0"></div>
  <div class="cp"><label for="estado">Cómo terminó</label><select id="estado" name="estado"><option value="">Todos</option><option value="no_cumple_filtro">No cumplió el filtro</option><option value="no_seleccionado">Rechazado en revisión</option></select></div></form><div id="lista"></div>`;
  const msg = document.getElementById('msg'), f = document.getElementById('ff');
  const pintar = () => document.getElementById('lista').innerHTML = tabla([['Candidato', x => `${x.nombre} (${x.correo})`], ['Formación', x => x.nivelEducativo], ['Experiencia', x => `${x.aniosExperiencia} año(s)`], ['Estado', x => etiquetaEstado(x.estadoProceso)],
    ['Etapa final', x => x.historial.etapaFinal], ['Motivo', x => x.historial.motivoRechazo], ['Fecha', x => fecha(x.historial.fecha)], ['', x => `<button class="btn mini sec" data-a="bajar" data-id="${x.id}">Descargar</button>`, true]],
    sb.buscar(u.idEmpresa, Object.fromEntries(new FormData(f))), 'No hay candidatos que coincidan. Aparecen aquí los que no cumplen el filtro o son rechazados.');
  f.addEventListener('input', pintar); f.addEventListener('submit', e => e.preventDefault());
  delegar(c, async (a, id) => { if (a !== 'bajar') return; try { const r = await sb.descargar(u.idEmpresa, id), l = document.createElement('a'); l.href = URL.createObjectURL(r.blob); l.download = r.nombre; l.click(); setTimeout(() => URL.revokeObjectURL(l.href), 2000); } catch (e) { alerta(msg, e.message); } });
  pintar();
}
