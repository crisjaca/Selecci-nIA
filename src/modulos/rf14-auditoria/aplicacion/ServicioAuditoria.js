import { RepositorioAuditoria } from '../infraestructura/RepositorioAuditoria.js';
import { norm } from '../../../core/Texto.js';
export class ServicioAuditoria {
  constructor() { this.repo = new RepositorioAuditoria(); }
  consultar({ idEmpresa = '', rol = '', q = '' } = {}, limite = 300) {
    const t = norm(q);
    return this.repo.listar(r => (!idEmpresa || r.idEmpresa === idEmpresa) && (!rol || r.rol === rol) && (!t || norm(`${r.accion} ${r.usuario} ${r.detalle} ${r.entidad}`).includes(t))).sort((a, b) => b.fecha - a.fecha).slice(0, limite);
  }
}
