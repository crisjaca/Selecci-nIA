import { Requisito } from './Requisito.js';
export class Vacante {
  constructor(d = {}) {
    Object.assign(this, { id: null, idEmpresa: null, titulo: '', area: '', perfilProfesional: '', descripcion: '', estado: 'borrador', fechaPublicacion: null }, d);
    this.requisitos = new Requisito(d.requisitos);
  }
}
