// Resultado del filtro por requisitos (RF_04). No confundir con EvaluacionEtapa (RF_09).
export class ResultadoFiltro {
  constructor(d = {}) { Object.assign(this, { id: null, idEmpresa: null, idCandidato: null, idVacante: null, cumple: false, nivelCumplimiento: 0, criterios: [], fecha: Date.now() }, d); }
}
