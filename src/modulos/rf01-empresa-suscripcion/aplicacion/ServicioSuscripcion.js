import { RepositorioSuscripcion } from '../infraestructura/RepositorioSuscripcion.js';
import { RepositorioPlan } from '../infraestructura/RepositorioPlan.js';
import { PasarelaPago } from '../infraestructura/PasarelaPago.js';
import { Suscripcion } from '../../../compartido/dominio/Suscripcion.js';
import { ErrorApp } from '../../../core/Errores.js';

export class ServicioSuscripcion {
  constructor() { this.repo = new RepositorioSuscripcion(); this.planes = new RepositorioPlan(); this.pasarela = new PasarelaPago(); }
  listar() { return this.repo.listar(); }
  resumen(idEmpresa) { const sus = this.repo.vigentePorEmpresa(idEmpresa); return { sus, plan: sus ? this.planes.obtener(sus.idPlan) : null }; }
  pagar(idEmpresa, idPlan) {
    const plan = this.planes.obtener(idPlan);
    if (!plan || plan.estado !== 'activo') throw new ErrorApp('PLAN', 'Ese plan no está disponible.');
    const r = this.pasarela.cobrar({ monto: plan.precio, idEmpresa });
    if (!r.aprobado) throw new ErrorApp('PAGO_RECHAZADO', 'El pago fue rechazado. Tu suscripción no cambió.');
    this.repo.listar(s => s.idEmpresa === idEmpresa && s.estado === 'activa').forEach(s => this.repo.actualizar(s.id, { estado: 'reemplazada' }));
    const ahora = Date.now(), dias = plan.periodicidad === 'anual' ? 365 : 30;
    return this.repo.insertar(new Suscripcion({ idEmpresa, idPlan, fechaInicio: ahora, fechaVencimiento: ahora + dias * 864e5, idTransaccion: r.idTransaccion }));
  }
  cancelar(id) { return this.repo.actualizar(id, { estado: 'cancelada' }); }
}
