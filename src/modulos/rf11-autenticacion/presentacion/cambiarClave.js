import { ServicioAutenticacion } from '../aplicacion/ServicioAutenticacion.js';
import { Guardia } from './Guardia.js';
import { ROLES } from '../../../../config/permisos.config.js';
import { alerta } from '../../../core/Ui.js';
import { ir } from '../../../core/Rutas.js';

const u = Guardia.exigir(null, { permitirCambio: true });
if (u) {
  const f = document.getElementById('form'), msg = document.getElementById('msg');
  if (u.debeCambiarClave) alerta(msg, 'Por seguridad, cambia la contraseña por defecto antes de continuar.', 'info');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await new ServicioAutenticacion().cambiarClave(f.actual.value, f.nueva.value, f.confirmar.value); ir(ROLES[u.rol].inicio); }
    catch (err) { alerta(msg, err.message); }
  });
}
