export class Sesion {
  constructor(d = {}) {
    Object.assign(this, { id: null, token: '', idUsuario: null, idEmpresa: null, rol: '', dispositivo: '', navegador: '', inicio: 0, ultimaActividad: 0 }, d);
  }
}
