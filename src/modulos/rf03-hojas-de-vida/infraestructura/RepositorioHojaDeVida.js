import { RepositorioBase } from '../../../core/RepositorioBase.js';
export class RepositorioHojaDeVida extends RepositorioBase {
  constructor() { super('hojas_de_vida'); }
  porCandidato(id) { return this.listar(h => h.idCandidato === id)[0] || null; }
}
