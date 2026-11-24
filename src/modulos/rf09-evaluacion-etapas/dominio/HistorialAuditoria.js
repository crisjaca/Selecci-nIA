// Respaldo de cada evaluación registrada. Solo guarda ids (no datos personales del candidato).
export class HistorialAuditoria {
  constructor(d = {}) { Object.assign(this, { id: null, idEmpresa: null, idEvaluacion: null, idCandidato: null, nombreEtapa: '', fechaRegistro: Date.now(), usuarioResponsable: '', resultadoRegistrado: '' }, d); }
}
