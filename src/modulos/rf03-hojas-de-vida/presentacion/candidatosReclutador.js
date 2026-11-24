import { iniciarVista } from '../../rf11-autenticacion/presentacion/shell.js';
import { ServicioCandidatos } from '../aplicacion/ServicioCandidatos.js';
import { ServicioVacantes } from '../../rf02-vacantes/aplicacion/ServicioVacantes.js';
import { esc, alerta, tabla, fecha, delegar } from '../../../core/Ui.js';

const u = iniciarVista('reclutador', { tablero: false });
if (u) {
  const sc = new ServicioCandidatos(), sv = new ServicioVacantes(), c = document.getElementById('contenido');
  const vac = sv.listar(u.idEmpresa), nombreVac = Object.fromEntries(vac.map(v => [v.id, v.titulo]));
  c.innerHTML = `<h1>Hojas de vida</h1><p class="sub">Postulaciones recibidas. Puedes ver la información de cada hoja de vida, descargar el archivo original o eliminar al candidato.</p>
  <div id="msg" class="alerta" hidden role="alert"></div><div class="cp" style="max-width:340px"><label for="vac">Vacante</label><select id="vac"><option value="">Todas</option>${vac.map(v => `<option value="${v.id}">${esc(v.titulo)}</option>`).join('')}</select></div>
  <div id="detalle"></div><div id="lista"></div>`;
  const msg = document.getElementById('msg'), sel = document.getElementById('vac');
  const pintar = () => document.getElementById('lista').innerHTML = tabla([['Candidato', x => `${x.nombre} (${x.correo})`], ['Vacante', x => nombreVac[x.idVacante] || '—'], ['Formación', x => x.nivelEducativo], ['Experiencia', x => `${x.aniosExperiencia} año(s)`], ['Recibida', x => fecha(x.creado)], ['Estado', x => x.estadoProceso.replaceAll('_', ' ')],
    ['', x => `<button class="btn mini sec" data-a="ver" data-id="${x.id}">Ver</button> <button class="btn mini sec" data-a="bajar" data-id="${x.id}">Descargar</button> <button class="btn mini sec" data-a="borrar" data-id="${x.id}">Eliminar</button>`, true]],
    sc.listar(u.idEmpresa, sel.value), 'Aún no hay postulaciones.');
  sel.addEventListener('change', () => { document.getElementById('detalle').innerHTML = ''; pintar(); });
  delegar(c, async (a, id) => { try {
    if (a === 'ver') { const x = sc.obtener(u.idEmpresa, id), h = sc.hoja(u.idEmpresa, id);
      document.getElementById('detalle').innerHTML = `<div class="det"><h2>${esc(x.nombre)}</h2><p>${esc(x.correo)}${x.telefono ? ' · ' + esc(x.telefono) : ''}</p><p>Formación declarada: <b>${esc(x.nivelEducativo)}</b> · Experiencia declarada: <b>${x.aniosExperiencia} año(s)</b></p>
      <p class="sub">Archivo: ${esc(h.nombreArchivo)} (${h.formato.toUpperCase()}, ${h.pesoMB} MB)</p>${h.textoExtraido ? `<p class="sub">Texto leído de la hoja de vida:</p><pre>${esc(h.textoExtraido.slice(0, 900))}${h.textoExtraido.length > 900 ? '…' : ''}</pre>` : '<p class="sub">No se pudo leer el texto del archivo en este dispositivo. Descárgalo para revisarlo.</p>'}</div>`; }
    if (a === 'bajar') { const r = await sc.descargar(u.idEmpresa, id), l = document.createElement('a'); l.href = URL.createObjectURL(r.blob); l.download = r.nombre; l.click(); setTimeout(() => URL.revokeObjectURL(l.href), 2000); }
    if (a === 'borrar' && confirm('Se eliminará el candidato y su hoja de vida de forma definitiva. ¿Continuar?')) { await sc.eliminar(u.idEmpresa, id); document.getElementById('detalle').innerHTML = ''; alerta(msg, 'Candidato eliminado.', 'ok'); pintar(); }
  } catch (e) { alerta(msg, e.message); } });
  pintar();
}
