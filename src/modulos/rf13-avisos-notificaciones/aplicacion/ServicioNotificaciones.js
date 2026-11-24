import { CONFIG } from '../../../../config/app.config.js';
import { RepositorioNotificacion } from '../infraestructura/RepositorioNotificacion.js';
import { Notificacion } from '../dominio/Notificacion.js';

export class ServicioNotificaciones {
  constructor() { this.repo = new RepositorioNotificacion(); }
  // Varios intentos de la misma empresa en 30 min se agrupan en una sola notificación con contador.
  registrarIntentoBloqueado({ empresa, plan, usuario, navegador, usados, limite }) {
    const ahora = Date.now();
    const datos = { empresa: empresa.nombre, nit: empresa.nit, plan: plan.nombre, usados, limite, usuario: usuario.nombre, correo: usuario.correo, navegador };
    const previa = this.repo.listar(n => n.tipo === 'limite_dispositivos' && n.idEmpresa === empresa.id && ahora - n.ultimaFecha < CONFIG.ventanaNotifMs)[0];
    if (previa) return this.repo.actualizar(previa.id, { intentos: previa.intentos + 1, ultimaFecha: ahora, leida: false, datos });
    return this.repo.insertar(new Notificacion({ tipo: 'limite_dispositivos', titulo: 'Intento de ingreso bloqueado por límite de dispositivos', idEmpresa: empresa.id, datos }));
  }
  noLeidas() { return this.repo.listar(n => !n.leida); }
  marcarLeida(id) { return this.repo.actualizar(id, { leida: true }); }
}
