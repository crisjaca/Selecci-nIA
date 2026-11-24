export class EtapaProceso {
  constructor(d = {}) { Object.assign(this, { id: null, idEmpresa: null, idVacante: null, nombreEtapa: '', tipo: 'entrevista', orden: 1 }, d); }
}
