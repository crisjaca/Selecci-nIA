import '../../rf14-auditoria/aplicacion/engancharAuditoria.js';
import { ServicioEmpresa } from '../aplicacion/ServicioEmpresa.js';
import { alerta } from '../../../core/Ui.js';
import { ir } from '../../../core/Rutas.js';

const f = document.getElementById('form'), msg = document.getElementById('msg');
f.addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(f)); d.acepta = f.acepta.checked;
  try { await new ServicioEmpresa().registrar(d); ir('login.html?registrado=1'); }
  catch (err) { alerta(msg, err.message || 'No se pudo completar el registro.'); }
});
