export class Sugerencia {
  constructor(d = {}) { Object.assign(this, { id: null, idEmpresa: null, idUsuario: null, usuario: '', rol: '', tipo: 'sugerencia', asunto: '', mensaje: '', estado: 'nueva', respuesta: '', fechaRespuesta: null }, d); }
}
