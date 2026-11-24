import { RepositorioBase } from '../../../core/RepositorioBase.js';
export class RepositorioUsuario extends RepositorioBase {
  constructor() { super('usuarios'); }
  porCorreo(c) { return this.listar(u => u.correo.toLowerCase() === c.trim().toLowerCase())[0] || null; }
}
