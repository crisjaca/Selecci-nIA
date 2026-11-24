export class Aviso {
  constructor(d = {}) { Object.assign(this, { id: null, titulo: '', texto: '', estado: 'activo', fecha: Date.now() }, d); }
}
