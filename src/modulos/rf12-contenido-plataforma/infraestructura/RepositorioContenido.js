import { RepositorioBase } from '../../../core/RepositorioBase.js';
export class RepositorioContenido extends RepositorioBase {
  constructor() { super('contenido'); }
  principal() { return this.listar()[0] || null; }
}
