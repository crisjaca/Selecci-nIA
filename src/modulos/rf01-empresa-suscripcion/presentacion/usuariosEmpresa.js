import { iniciarVista } from '../../rf11-autenticacion/presentacion/shell.js';
import { ServicioUsuariosEmpresa } from '../aplicacion/ServicioUsuariosEmpresa.js';
import { alerta, tabla, fecha, delegar, campo } from '../../../core/Ui.js';

const u = iniciarVista('empresa', { tablero: false });
if (u) {
  const sv = new ServicioUsuariosEmpresa(), c = document.getElementById('contenido');
  c.innerHTML = `<h1>Usuarios internos</h1><p class="sub">Crea a tus reclutadores y directores. Reciben una contraseña por defecto que deben cambiar al ingresar.</p>
  <div id="cupo"></div><div id="msg" class="alerta" hidden role="alert"></div>
  <form id="form" class="grid-form">${campo('Nombre', 'nombre')}${campo('Correo', 'correo', 'email')}<div class="cp"><label for="rol">Rol</label><select id="rol" name="rol"><option value="reclutador">Reclutador</option><option value="director">Director de Área</option></select></div><button class="btn" type="submit">Crear usuario</button></form>
  <div id="lista"></div>`;
  const msg = document.getElementById('msg');
  const pintar = () => {
    const k = sv.cupo(u.idEmpresa);
    document.getElementById('cupo').innerHTML = k.plan ? `<div class="alerta info">Usuarios activos: <b>${k.usados} de ${k.limite}</b> (plan ${k.plan.nombre}).</div>` : `<div class="alerta error">Sin suscripción activa: no puedes crear usuarios. Ve a «Suscripción y pago».</div>`;
    document.getElementById('lista').innerHTML = tabla([['Nombre', x => x.nombre], ['Correo', x => x.correo], ['Rol', x => x.rol === 'director' ? 'Director de Área' : 'Reclutador'], ['Estado', x => x.estado],
      ['', x => `<button class="btn mini sec" data-a="estado" data-id="${x.id}">${x.estado === 'activo' ? 'Desactivar' : 'Activar'}</button> <button class="btn mini sec" data-a="clave" data-id="${x.id}">Reiniciar contraseña</button>`, true]],
      sv.listar(u.idEmpresa), 'Aún no has creado usuarios.');
  };
  document.getElementById('form').addEventListener('submit', async (ev) => { ev.preventDefault(); const f = ev.target;
    try { const r = await sv.crear(u.idEmpresa, Object.fromEntries(new FormData(f))); f.reset(); alerta(msg, `Usuario creado. Contraseña por defecto: ${r.clave} (compártela ahora: no se vuelve a mostrar).`, 'ok'); pintar(); }
    catch (e) { alerta(msg, e.message); } });
  delegar(c, async (a, id) => { try {
    if (a === 'estado') { const x = sv.usuarios.obtener(id); sv.cambiarEstado(u.idEmpresa, id, x.estado === 'activo' ? 'inactivo' : 'activo'); alerta(msg, ''); }
    if (a === 'clave') { const r = await sv.reiniciarClave(u.idEmpresa, id); alerta(msg, `Nueva contraseña para ${r.correo}: ${r.clave}`, 'ok'); }
    pintar(); } catch (e) { alerta(msg, e.message); } });
  pintar();
}
