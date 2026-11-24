export class HojaDeVida {
  constructor(d = {}) {
    Object.assign(this, { id: null, idCandidato: null, idEmpresa: null, fechaPostulacion: Date.now(), nombreArchivo: '', formato: '', pesoMB: 0, textoExtraido: '', extraccion: 'pendiente' }, d);
  }
}
