import { RepositorioBase } from '../../../core/RepositorioBase.js';
export class RepositorioEmpresa extends RepositorioBase {
  constructor() { super('empresas'); }
  porNit(nit) { return this.listar(e => e.nit === nit.trim())[0] || null; }
}
