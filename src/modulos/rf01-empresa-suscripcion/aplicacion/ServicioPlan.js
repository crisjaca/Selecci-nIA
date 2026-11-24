import { RepositorioPlan } from '../infraestructura/RepositorioPlan.js';
import { RepositorioSuscripcion } from '../infraestructura/RepositorioSuscripcion.js';
import { Plan } from '../../../compartido/dominio/Plan.js';
import { ErrorApp } from '../../../core/Errores.js';

export class ServicioPlan {
  constructor() { this.repo = new RepositorioPlan(); this.suscripciones = new RepositorioSuscripcion(); }
  listar() { return this.repo.listar(); }
  activos() { return this.repo.listar(p => p.estado === 'activo'); }
  _validar(d) {
    const n = (k) => Number(d[k]);
    if (!d.nombre?.trim()) throw new ErrorApp('DATOS', 'El plan necesita un nombre.');
    if (!(n('precio') >= 0) || d.precio === '') throw new ErrorApp('DATOS', 'El precio debe ser un número igual o mayor a 0.');
    for (const k of ['limiteUsuarios', 'limiteDispositivosSimultaneos', 'sesionesPorUsuario'])
      if (!Number.isInteger(n(k)) || n(k) < 1) throw new ErrorApp('DATOS', 'Los límites deben ser números enteros desde 1.');
    return { nombre: d.nombre.trim(), precio: n('precio'), periodicidad: d.periodicidad, limiteUsuarios: n('limiteUsuarios'),
      limiteDispositivosSimultaneos: n('limiteDispositivosSimultaneos'), sesionesPorUsuario: n('sesionesPorUsuario') };
  }
  guardar(d) { const v = this._validar(d); return d.id ? this.repo.actualizar(d.id, v) : this.repo.insertar(new Plan(v)); }
  cambiarEstado(id, estado) { return this.repo.actualizar(id, { estado }); }
  eliminar(id) {
    if (this.suscripciones.listar(s => s.idPlan === id).length) throw new ErrorApp('EN_USO', 'Hay suscripciones con este plan. Desactívalo en lugar de eliminarlo.');
    this.repo.eliminar(id);
  }
}
