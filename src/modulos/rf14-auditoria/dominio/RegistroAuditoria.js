// Auditoría general: quién hizo qué y cuándo. Solo ids y nombres del personal; nunca datos personales de candidatos.
// (HistorialAuditoria, de RF_09, es otra cosa: el respaldo de cada evaluación de etapa.)
export class RegistroAuditoria {
  constructor(d = {}) { Object.assign(this, { id: null, idEmpresa: null, idUsuario: null, usuario: '', rol: '', accion: '', entidad: '', idEntidad: '', detalle: '', fecha: Date.now() }, d); }
}
