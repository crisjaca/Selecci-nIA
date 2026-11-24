export class DecisionFinal {
  constructor(d = {}) { Object.assign(this, { id: null, idEmpresa: null, idCandidato: null, idVacante: null, decisionTomada: '', justificacion: '', nombreEtapa: '', puntajeSugerido: null, sugerencia: '', fecha: Date.now(), idUsuario: null, usuarioResponsable: '', rol: '' }, d); }
}
