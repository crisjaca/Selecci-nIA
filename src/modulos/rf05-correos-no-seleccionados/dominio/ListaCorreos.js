export class ListaCorreos {
  constructor(d = {}) { Object.assign(this, { correosFormateados: '', total: 0, omitidos: 0, fechaRecopilacion: Date.now() }, d); }
}
