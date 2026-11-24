// Cómo terminó el proceso de un candidato no seleccionado. Se arma al consultar, a partir del filtro o de la decisión final.
export class HistorialProceso {
  constructor(d = {}) { Object.assign(this, { etapaFinal: '', motivoRechazo: '', fecha: 0 }, d); }
}
