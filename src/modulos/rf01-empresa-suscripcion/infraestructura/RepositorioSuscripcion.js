import { RepositorioBase } from '../../../core/RepositorioBase.js';
export class RepositorioSuscripcion extends RepositorioBase {
  constructor() { super('suscripciones'); }
  vigentePorEmpresa(idEmpresa) {
    return this.listar(s => s.idEmpresa === idEmpresa && s.estado === 'activa' && s.fechaVencimiento > Date.now())[0] || null;
  }
}
