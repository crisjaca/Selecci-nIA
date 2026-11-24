import { iniciarVista } from '../../rf11-autenticacion/presentacion/shell.js';
import { ServicioEmpresa } from '../aplicacion/ServicioEmpresa.js';
import { ServicioSuscripcion } from '../aplicacion/ServicioSuscripcion.js';
import { esc, alerta, tabla, fecha, delegar, campo } from '../../../core/Ui.js';

if (iniciarVista('admin_plataforma', { tablero: false })) {
  const se = new ServicioEmpresa(), ss = new ServicioSuscripcion(), c = document.getElementById('contenido');
  c.innerHTML = `<h1>Empresas</h1><p class="sub">Crea la cuenta de una empresa con una contraseña por defecto. La empresa deberá cambiarla al ingresar y luego compra su suscripción.</p>
  <div id="msg" class="alerta" hidden role="alert"></div>
  <form id="form" class="grid-form">${campo('Nombre de la empresa', 'nombreEmpresa')}${campo('NIT', 'nit')}${campo('Nombre del contacto', 'nombre')}${campo('Correo de acceso', 'correo', 'email')}<button class="btn" type="submit">Crear empresa</button></form>
  <div id="lista"></div>`;
  const msg = document.getElementById('msg');
  const pintar = () => document.getElementById('lista').innerHTML = tabla([
    ['Empresa', e => e.nombre], ['NIT', e => e.nit], ['Correo', e => e.correoContacto],
    ['Suscripción', e => { const r = ss.resumen(e.id); return r.plan ? `${r.plan.nombre} · vence ${fecha(r.sus.fechaVencimiento)}` : 'Sin suscripción'; }],
    ['Estado', e => e.estado],
    ['', e => `<button class="btn mini sec" data-a="estado" data-id="${e.id}">${e.estado === 'activa' ? 'Suspender' : 'Activar'}</button> <button class="btn mini sec" data-a="clave" data-id="${e.id}">Reiniciar contraseña</button>`, true]
  ], se.listar(), 'Aún no hay empresas. Crea la primera con el formulario.');
  document.getElementById('form').addEventListener('submit', async (ev) => {
    ev.preventDefault(); const f = ev.target;
    try { const r = await se.crearPorAdmin(Object.fromEntries(new FormData(f))); f.reset();
      alerta(msg, `Empresa creada. Contraseña por defecto: ${r.clave} (compártela ahora: no se vuelve a mostrar).`, 'ok'); pintar();
    } catch (e) { alerta(msg, e.message); }
  });
  delegar(c, async (a, id) => {
    try {
      if (a === 'estado') { const e = se.listar().find(x => x.id === id); se.cambiarEstado(id, e.estado === 'activa' ? 'suspendida' : 'activa'); alerta(msg, ''); }
      if (a === 'clave') { const r = await se.reiniciarClave(id); alerta(msg, `Nueva contraseña para ${r.correo}: ${r.clave} (la deberá cambiar al ingresar).`, 'ok'); }
      pintar();
    } catch (e) { alerta(msg, e.message); }
  });
  pintar();
}
