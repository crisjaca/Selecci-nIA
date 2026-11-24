export class Notificacion {
  constructor(d = {}) {
    Object.assign(this, { id: null, tipo: '', titulo: '', idEmpresa: null, intentos: 1, leida: false, ultimaFecha: Date.now(), datos: {} }, d);
  }
}
