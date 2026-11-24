import { RepositorioAuditoria } from '../infraestructura/RepositorioAuditoria.js';
import { RegistroAuditoria } from '../dominio/RegistroAuditoria.js';
import { SesionActiva } from '../../../core/SesionActiva.js';
// registrar() nunca lanza errores: la auditoría no debe romper la acción que audita. En la fase 4 la escribe el servidor.
export const Auditoria = {
  registrar(accion, { entidad = '', idEntidad = '', idEmpresa, detalle = '', actor } = {}) {
    try {
      const u = actor || SesionActiva.obtener()?.usuario;
      new RepositorioAuditoria().insertar(new RegistroAuditoria({ accion, entidad, idEntidad: idEntidad || '', detalle, idEmpresa: idEmpresa !== undefined ? idEmpresa : (u?.idEmpresa ?? null), idUsuario: u?.id || null, usuario: u?.nombre || 'Público / sistema', rol: u?.rol || '' }));
    } catch { /* se ignora a propósito */ }
  }
};
