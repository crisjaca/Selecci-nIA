export class Puntaje {
  constructor(d = {}) { Object.assign(this, { id: null, idEmpresa: null, idCandidato: null, idVacante: null, valorPuntaje: 0, desglose: [], fechaCalculo: Date.now() }, d); }
}
