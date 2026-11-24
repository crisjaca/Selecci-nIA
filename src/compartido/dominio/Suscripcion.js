export class Suscripcion {
  constructor(d = {}) { Object.assign(this, { id: null, idEmpresa: null, idPlan: null, fechaInicio: 0, fechaVencimiento: 0, estado: 'activa' }, d); }
  vigente() { return this.estado === 'activa' && this.fechaVencimiento > Date.now(); }
}
