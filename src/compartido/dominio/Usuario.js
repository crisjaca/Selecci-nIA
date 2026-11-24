export class Usuario {
  constructor(d = {}) {
    Object.assign(this, { id: null, nombre: '', correo: '', rol: '', idEmpresa: null, estado: 'activo', claveHash: '', sal: '', debeCambiarClave: false }, d);
  }
  publico() { const { claveHash, sal, ...p } = this; return p; }
}
