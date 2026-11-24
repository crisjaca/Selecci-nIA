export class Empresa {
  constructor(d = {}) { Object.assign(this, { id: null, nombre: '', nit: '', correoContacto: '', estado: 'activa' }, d); }
}
