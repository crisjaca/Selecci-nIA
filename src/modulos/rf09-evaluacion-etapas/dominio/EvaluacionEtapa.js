// Evaluación hecha por una persona en una etapa (RF_09). No confundir con ResultadoFiltro (RF_04).
export class EvaluacionEtapa {
  constructor(d = {}) { Object.assign(this, { id: null, idEmpresa: null, idCandidato: null, idVacante: null, idEtapa: null, nombreEtapa: '', observaciones: '', resultado: '', fecha: Date.now(), idUsuario: null, usuarioResponsable: '' }, d); }
}
