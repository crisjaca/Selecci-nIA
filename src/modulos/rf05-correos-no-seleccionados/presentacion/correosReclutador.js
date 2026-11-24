import { iniciarVista } from '../../rf11-autenticacion/presentacion/shell.js';
import { ServicioCorreos } from '../aplicacion/ServicioCorreos.js';
import { ServicioVacantes } from '../../rf02-vacantes/aplicacion/ServicioVacantes.js';
import { esc, alerta, delegar } from '../../../core/Ui.js';

const u = iniciarVista('reclutador', { tablero: false });
if (u) {
  const sc = new ServicioCorreos(), vac = new ServicioVacantes().listar(u.idEmpresa), c = document.getElementById('contenido');
  c.innerHTML = `<h1>Correos de no seleccionados</h1><p class="sub">SelecciónIA no envía correos: reúne las direcciones para que las copies y escribas el mensaje desde tu propio correo empresarial.</p><div id="msg" class="alerta" hidden role="alert"></div>
  ${vac.length ? `<div class="grid-form"><div class="cp"><label for="vac">Vacante</label><select id="vac">${vac.map(v => `<option value="${v.id}">${esc(v.titulo)}</option>`).join('')}</select></div>
  <div class="cp"><label for="gr">Grupo</label><select id="gr"><option value="todos">Todos los no seleccionados</option><option value="filtro">No cumplieron el filtro</option><option value="decision">Rechazados en revisión</option></select></div>
  <div class="cp"><label for="sep">Separador</label><select id="sep"><option value=";">Punto y coma (Outlook)</option><option value=",">Coma (Gmail)</option></select></div><button class="btn" data-a="recopilar">Recopilar correos</button></div>` : '<p class="vacio">Aún no hay vacantes.</p>'}
  <div id="res" hidden><p id="info" class="sub"></p><textarea id="lista" rows="5" readonly></textarea><p><button class="btn" data-a="copiar">Copiar lista</button></p></div>`;
  const msg = document.getElementById('msg'), res = document.getElementById('res'), ta = document.getElementById('lista');
  delegar(c, async (a) => { try {
    if (a === 'recopilar') { const r = sc.recopilar(u.idEmpresa, document.getElementById('vac').value, document.getElementById('gr').value, document.getElementById('sep').value);
      ta.value = r.correosFormateados; document.getElementById('info').textContent = `${r.total} correo(s)${r.omitidos ? `; ${r.omitidos} omitido(s) por correo inválido o repetido` : ''}.`; res.hidden = false; alerta(msg, ''); }
    if (a === 'copiar') { try { await navigator.clipboard.writeText(ta.value); } catch { ta.select(); document.execCommand('copy'); } alerta(msg, 'Lista copiada. Pégala en el campo «Para» o «CCO» de tu correo.', 'ok'); }
  } catch (e) { res.hidden = true; alerta(msg, e.message); } });
}
