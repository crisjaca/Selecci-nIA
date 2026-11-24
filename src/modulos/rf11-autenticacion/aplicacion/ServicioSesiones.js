import { CONFIG } from '../../../../config/app.config.js';
import { ROLES_CON_CUPO } from '../../../../config/permisos.config.js';
import { RepositorioSesion } from '../infraestructura/RepositorioSesion.js';
import { RepositorioEmpresa } from '../../rf01-empresa-suscripcion/infraestructura/RepositorioEmpresa.js';
import { RepositorioPlan } from '../../rf01-empresa-suscripcion/infraestructura/RepositorioPlan.js';
import { RepositorioSuscripcion } from '../../rf01-empresa-suscripcion/infraestructura/RepositorioSuscripcion.js';
import { ServicioNotificaciones } from '../../rf13-avisos-notificaciones/aplicacion/ServicioNotificaciones.js';
import { Sesion } from '../dominio/Sesion.js';
import { Dispositivo } from '../../../core/Dispositivo.js';
import { ErrorApp } from '../../../core/Errores.js';

export class ServicioSesiones {
  constructor() {
    this.repo = new RepositorioSesion(); this.empresas = new RepositorioEmpresa();
    this.planes = new RepositorioPlan(); this.suscripciones = new RepositorioSuscripcion();
    this.notificaciones = new ServicioNotificaciones();
  }
  expirar() { const lim = Date.now() - CONFIG.sesionExpiraMs; this.repo.listar(s => s.ultimaActividad < lim).forEach(s => this.repo.eliminar(s.id)); }

  // En el servidor (fase 4) este método se ejecuta dentro de un LockService para evitar que dos ingresos tomen el último cupo.
  abrir(u) {
    this.expirar();
    const disp = Dispositivo.id(), nav = Dispositivo.navegador();
    this.repo.listar(s => s.idUsuario === u.id && s.dispositivo === disp).forEach(s => this.repo.eliminar(s.id));

    if (ROLES_CON_CUPO.includes(u.rol)) {
      const empresa = this.empresas.obtener(u.idEmpresa), sus = this.suscripciones.vigentePorEmpresa(u.idEmpresa);
      const plan = sus && this.planes.obtener(sus.idPlan);
      if (!empresa || empresa.estado !== 'activa' || !plan)
        throw new ErrorApp('SIN_SUSCRIPCION', 'La suscripción de tu empresa no está activa. Contacta a quien administra la cuenta de tu empresa.');
      const porUsuario = plan.sesionesPorUsuario || 1, limite = plan.limiteDispositivosSimultaneos || 1;
      if (this.repo.listar(s => s.idUsuario === u.id).length >= porUsuario)
        throw new ErrorApp('LIMITE_USUARIO', 'Tu cuenta ya está conectada en otro dispositivo. Cierra esa sesión para ingresar aquí.');
      const activas = this.repo.listar(s => s.idEmpresa === u.idEmpresa && ROLES_CON_CUPO.includes(s.rol)).length;
      if (activas >= limite) {
        this.notificaciones.registrarIntentoBloqueado({ empresa, plan, usuario: u, navegador: nav, usados: activas, limite });
        throw new ErrorApp('LIMITE_DISPOSITIVOS', `Tu empresa alcanzó el límite de ${limite} dispositivo${limite > 1 ? 's' : ''} conectado${limite > 1 ? 's' : ''} según su plan. Pídele a tu empresa que cierre una sesión o mejore la suscripción.`);
      }
    }
    const t = Date.now();
    return this.repo.insertar(new Sesion({ token: crypto.randomUUID(), idUsuario: u.id, idEmpresa: u.idEmpresa, rol: u.rol, dispositivo: disp, navegador: nav, inicio: t, ultimaActividad: t }));
  }
  renovar(token) { const s = this.repo.porToken(token); if (!s) return false; this.repo.actualizar(s.id, { ultimaActividad: Date.now() }); return true; }
  cerrar(token) { const s = this.repo.porToken(token); if (s) this.repo.eliminar(s.id); }
  activasDeEmpresa(idEmpresa) { this.expirar(); return this.repo.listar(s => s.idEmpresa === idEmpresa && ROLES_CON_CUPO.includes(s.rol)); }
}
