// Se genera al momento de revisar (puntaje + filtro). El sistema solo recomienda.
export class RecomendacionSistema {
  constructor(d = {}) { Object.assign(this, { idCandidato: null, puntajeSugerido: 0, sugerencia: 'revisar', resumen: '', criterios: [], desglose: [], fechaGeneracion: Date.now() }, d); }
}
