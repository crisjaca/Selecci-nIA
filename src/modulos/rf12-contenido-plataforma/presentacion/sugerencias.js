import { iniciarVista } from '../../rf11-autenticacion/presentacion/shell.js';
import { ServicioSugerencias } from '../aplicacion/ServicioSugerencias.js';
import { RepositorioEmpresa } from '../../rf01-empresa-suscripcion/infraestructura/RepositorioEmpresa.js';
import { esc, alerta, tabla, fecha, delegar } from '../../../core/Ui.js';

const TIPO = { sugerencia: 'Sugerencia', problema: 'Problema', otro: 'Otro' }, ROL = { empresa: 'Empresa', reclutador: 'Reclutador', director: 'Director de Área' };
// Vista compartida: el administrador lee y responde; los demás roles escriben y ven la respuesta.
export function vistaSugerencias(rol) {
  const u = iniciarVista(rol, { tablero: false }); if (!u) return;
  const sv = new ServicioSugerencias(), admin = rol === 'admin_plataforma', c = document.getElementById('contenido');
  c.innerHTML = admin ? `<h1>Sugerencias</h1><p class="sub">Mensajes que envían las empresas y sus usuarios.</p><div id="msg" class="alerta" hidden role="alert"></div><div id="panel"></div><div id="lista"></div>`
    : `<h1>Sugerencias</h1><p class="sub">Cuéntanos qué mejorar o qué problema encontraste. El equipo de SelecciónIA lo lee y te responde aquí.</p><div id="msg" class="alerta" hidden role="alert"></div>
    <form id="form" class="grid-form"><div class="cp"><label for="tipo">Tipo</label><select id="tipo" name="tipo"><option value="sugerencia">Sugerencia</option><option value="problema">Problema</option><option value="otro">Otro</option></select></div>
    <div class="cp"><label for="asunto">Asunto</label><input id="asunto" name="asunto" type="text"></div><div class="cp ancho"><label for="mensaje">Mensaje</label><textarea id="mensaje" name="mensaje" rows="3"></textarea></div><button class="btn" type="submit">Enviar</button></form><div id="lista"></div>`;
  const msg = document.getElementById('msg'), emp = Object.fromEntries(new RepositorioEmpresa().listar().map(e => [e.id, e.nombre]));
  const pintar = () => document.getElementById('lista').innerHTML = admin
    ? tabla([['Fecha', s => fecha(s.creado)], ['De', s => `${s.usuario} · ${ROL[s.rol] || s.rol}${emp[s.idEmpresa] ? ' · ' + emp[s.idEmpresa] : ''}`], ['Mensaje', s => `<b>${esc(TIPO[s.tipo])}: ${esc(s.asunto)}</b><br>${esc(s.mensaje)}${s.respuesta ? `<br><span class="sub">Respuesta: ${esc(s.respuesta)}</span>` : ''}`, true], ['Estado', s => s.estado],
      ['', s => `${s.estado === 'nueva' ? `<button class="btn mini sec" data-a="leida" data-id="${s.id}">Marcar leída</button> ` : ''}<button class="btn mini sec" data-a="resp" data-id="${s.id}">Responder</button>`, true]], sv.todas(), 'Aún no hay mensajes.')
    : tabla([['Fecha', s => fecha(s.creado)], ['Mensaje', s => `<b>${esc(TIPO[s.tipo])}: ${esc(s.asunto)}</b><br>${esc(s.mensaje)}`, true], ['Estado', s => s.estado], ['Respuesta', s => s.respuesta || '—']], sv.deUsuario(u.id), 'Aún no has enviado mensajes.');
  const f = document.getElementById('form');
  if (f) f.addEventListener('submit', (ev) => { ev.preventDefault(); try { sv.enviar(u, Object.fromEntries(new FormData(f))); f.reset(); alerta(msg, 'Mensaje enviado. ¡Gracias!', 'ok'); pintar(); } catch (e) { alerta(msg, e.message); } });
  delegar(c, (a, id) => { try {
    if (a === 'leida') sv.cambiarEstado(id, 'leida');
    if (a === 'resp') { document.getElementById('panel').innerHTML = `<form id="fr" class="grid-form"><div class="cp ancho"><label for="rt">Respuesta</label><textarea id="rt" rows="2"></textarea></div><button class="btn" type="submit">Enviar respuesta</button></form>`;
      document.getElementById('fr').addEventListener('submit', (ev) => { ev.preventDefault(); try { sv.responder(id, document.getElementById('rt').value); document.getElementById('panel').innerHTML = ''; alerta(msg, 'Respuesta enviada.', 'ok'); pintar(); } catch (e) { alerta(msg, e.message); } }); return; }
    alerta(msg, ''); pintar(); } catch (e) { alerta(msg, e.message); } });
  pintar();
}
