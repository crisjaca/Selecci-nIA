import { iniciarVista } from '../../rf11-autenticacion/presentacion/shell.js';
import { ServicioPlan } from '../aplicacion/ServicioPlan.js';
import { ServicioSuscripcion } from '../aplicacion/ServicioSuscripcion.js';
import { esc, alerta, tabla, fecha, dinero, delegar } from '../../../core/Ui.js';

const u = iniciarVista('empresa', { tablero: false });
if (u) {
  const sp = new ServicioPlan(), ss = new ServicioSuscripcion(), c = document.getElementById('contenido');
  c.innerHTML = `<h1>Suscripción y pago</h1><div id="msg" class="alerta" hidden role="alert"></div><div id="estado-sus"></div><h2>Planes disponibles</h2><p class="sub">El pago es una simulación mientras no se conecte una pasarela real.</p><div id="planes"></div>`;
  const msg = document.getElementById('msg');
  const pintar = () => {
    const { sus, plan } = ss.resumen(u.idEmpresa);
    document.getElementById('estado-sus').innerHTML = plan
      ? `<div class="alerta ok">Plan <b>${esc(plan.nombre)}</b> activo hasta el ${fecha(sus.fechaVencimiento)}. Hasta ${plan.limiteUsuarios} usuarios y ${plan.limiteDispositivosSimultaneos} dispositivo(s) conectado(s) a la vez.</div>`
      : `<div class="alerta info">Tu empresa no tiene una suscripción activa. Elige un plan para crear usuarios y que puedan ingresar.</div>`;
    document.getElementById('planes').innerHTML = tabla([['Plan', p => p.nombre], ['Precio', p => `${dinero(p.precio)} ${p.periodicidad}`], ['Usuarios', p => p.limiteUsuarios], ['Dispositivos a la vez', p => p.limiteDispositivosSimultaneos],
      ['', p => p.id === plan?.id ? 'Plan actual' : `<button class="btn mini" data-a="pagar" data-id="${p.id}">Pagar y activar</button>`, true]], sp.activos(), 'El administrador aún no ha publicado planes.');
  };
  delegar(c, (a, id) => { if (a !== 'pagar' || !confirm('Se simulará el pago de este plan. ¿Continuar?')) return;
    try { ss.pagar(u.idEmpresa, id); alerta(msg, 'Pago aprobado. Tu suscripción está activa.', 'ok'); pintar(); } catch (e) { alerta(msg, e.message); } });
  pintar();
}
