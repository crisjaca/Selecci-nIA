import { iniciarVista } from '../../rf11-autenticacion/presentacion/shell.js';
import { ServicioPlan } from '../aplicacion/ServicioPlan.js';
import { ServicioSuscripcion } from '../aplicacion/ServicioSuscripcion.js';
import { ServicioEmpresa } from '../aplicacion/ServicioEmpresa.js';
import { alerta, tabla, fecha, dinero, delegar, campo } from '../../../core/Ui.js';

if (iniciarVista('admin_plataforma', { tablero: false })) {
  const sp = new ServicioPlan(), ss = new ServicioSuscripcion(), se = new ServicioEmpresa(), c = document.getElementById('contenido');
  c.innerHTML = `<h1>Planes y suscripciones</h1><p class="sub">Define los planes que las empresas pueden comprar. Los límites de usuarios y de dispositivos conectados a la vez se aplican a cada empresa según su plan.</p>
  <div id="msg" class="alerta" hidden role="alert"></div>
  <form id="form" class="grid-form"><input type="hidden" name="id">${campo('Nombre del plan', 'nombre')}${campo('Precio', 'precio', 'number', 'min="0" step="any"')}
  <div class="cp"><label for="periodicidad">Periodicidad</label><select id="periodicidad" name="periodicidad"><option value="mensual">Mensual</option><option value="anual">Anual</option></select></div>
  ${campo('Máximo de usuarios', 'limiteUsuarios', 'number', 'min="1"')}${campo('Dispositivos conectados a la vez', 'limiteDispositivosSimultaneos', 'number', 'min="1"')}${campo('Sesiones por usuario', 'sesionesPorUsuario', 'number', 'min="1" value="1"')}
  <button class="btn" type="submit" id="guardar">Crear plan</button></form>
  <h2>Planes</h2><div id="planes"></div><h2>Suscripciones</h2><div id="subs"></div>`;
  const msg = document.getElementById('msg'), f = document.getElementById('form');
  const pintar = () => {
    document.getElementById('planes').innerHTML = tabla([['Plan', p => p.nombre], ['Precio', p => `${dinero(p.precio)} ${p.periodicidad}`], ['Usuarios', p => p.limiteUsuarios], ['Dispositivos', p => p.limiteDispositivosSimultaneos], ['Sesiones/usuario', p => p.sesionesPorUsuario], ['Estado', p => p.estado],
      ['', p => `<button class="btn mini sec" data-a="editar" data-id="${p.id}">Editar</button> <button class="btn mini sec" data-a="estado" data-id="${p.id}">${p.estado === 'activo' ? 'Desactivar' : 'Activar'}</button> <button class="btn mini sec" data-a="borrar" data-id="${p.id}">Eliminar</button>`, true]],
      sp.listar(), 'Aún no hay planes. Crea el primero para que las empresas puedan suscribirse.');
    const emp = Object.fromEntries(se.listar().map(e => [e.id, e.nombre])), pl = Object.fromEntries(sp.listar().map(p => [p.id, p.nombre]));
    document.getElementById('subs').innerHTML = tabla([['Empresa', s => emp[s.idEmpresa] || '—'], ['Plan', s => pl[s.idPlan] || '—'], ['Inicio', s => fecha(s.fechaInicio)], ['Vence', s => fecha(s.fechaVencimiento)], ['Estado', s => s.estado],
      ['', s => s.estado === 'activa' ? `<button class="btn mini sec" data-a="cancelar" data-id="${s.id}">Cancelar</button>` : '', true]], ss.listar(), 'Todavía ninguna empresa se ha suscrito.');
  };
  f.addEventListener('submit', (ev) => { ev.preventDefault();
    try { sp.guardar(Object.fromEntries(new FormData(f))); alerta(msg, f.id.value ? 'Plan actualizado.' : 'Plan creado.', 'ok'); f.reset(); f.id.value = ''; document.getElementById('guardar').textContent = 'Crear plan'; pintar(); }
    catch (e) { alerta(msg, e.message); } });
  delegar(c, (a, id) => { try {
    if (a === 'editar') { const p = sp.repo.obtener(id); for (const k of ['id', 'nombre', 'precio', 'periodicidad', 'limiteUsuarios', 'limiteDispositivosSimultaneos', 'sesionesPorUsuario']) f[k].value = p[k]; document.getElementById('guardar').textContent = 'Guardar cambios'; f.scrollIntoView(); }
    if (a === 'estado') { const p = sp.repo.obtener(id); sp.cambiarEstado(id, p.estado === 'activo' ? 'inactivo' : 'activo'); }
    if (a === 'borrar' && confirm('¿Eliminar este plan?')) sp.eliminar(id);
    if (a === 'cancelar' && confirm('¿Cancelar esta suscripción? Los usuarios de la empresa no podrán iniciar sesión.')) ss.cancelar(id);
    pintar(); } catch (e) { alerta(msg, e.message); } });
  pintar();
}
