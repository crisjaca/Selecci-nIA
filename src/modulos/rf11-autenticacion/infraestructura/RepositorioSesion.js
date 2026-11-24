import { RepositorioBase } from '../../../core/RepositorioBase.js';
export class RepositorioSesion extends RepositorioBase {
  constructor() { super('sesiones'); }
  porToken(t) { return this.listar(s => s.token === t)[0] || null; }
}
