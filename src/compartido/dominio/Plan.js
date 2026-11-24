export class Plan {
  constructor(d = {}) {
    Object.assign(this, { id: null, nombre: '', precio: 0, periodicidad: 'mensual', limiteUsuarios: 1,
      limiteDispositivosSimultaneos: 1, sesionesPorUsuario: 1, estado: 'activo' }, d);
  }
}
