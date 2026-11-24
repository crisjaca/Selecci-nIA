import '../../rf14-auditoria/aplicacion/engancharAuditoria.js';
import { ServicioAutenticacion } from '../aplicacion/ServicioAutenticacion.js';
import { ROLES } from '../../../../config/permisos.config.js';
import { alerta } from '../../../core/Ui.js';
import { ir } from '../../../core/Rutas.js';

const f = document.getElementById('form'), msg = document.getElementById('msg'), q = new URLSearchParams(location.search);
if (q.get('registrado')) alerta(msg, 'Cuenta creada. Inicia sesión para continuar.', 'ok');
if (q.get('expirada')) alerta(msg, 'Tu sesión terminó. Inicia sesión de nuevo.', 'info');
f.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = f.querySelector('button'); btn.disabled = true;
  try {
    const u = await new ServicioAutenticacion().iniciarSesion(f.correo.value, f.clave.value);
    ir(u.debeCambiarClave ? 'cambiar-clave.html' : ROLES[u.rol].inicio);
  } catch (err) { alerta(msg, err.message || 'No se pudo iniciar sesión.'); btn.disabled = false; }
});
