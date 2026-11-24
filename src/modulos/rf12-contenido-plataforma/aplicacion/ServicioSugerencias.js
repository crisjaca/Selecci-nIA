import { RepositorioSugerencia } from '../infraestructura/RepositorioSugerencia.js';
import { Sugerencia } from '../dominio/Sugerencia.js';
import { ServicioNotificaciones } from '../../rf13-avisos-notificaciones/aplicacion/ServicioNotificaciones.js';
import { Notificacion } from '../../rf13-avisos-notificaciones/dominio/Notificacion.js';
import { ErrorApp } from '../../../core/Errores.js';

// Buzón: los usuarios de las empresas escriben; el administrador de plataforma lee y responde. Avisa por una notificación.
export class ServicioSugerencias {
  constructor() { this.repo = new RepositorioSugerencia(); this.notif = new ServicioNotificaciones(); }
  enviar(usuario, d) {
    if (!['sugerencia', 'problema', 'otro'].includes(d.tipo)) throw new ErrorApp('DATOS', 'Elige el tipo de mensaje.');
    if (!d.asunto?.trim() || d.asunto.trim().length < 3) throw new ErrorApp('DATOS', 'Escribe un asunto.');
    if (!d.mensaje?.trim() || d.mensaje.trim().length < 10) throw new ErrorApp('DATOS', 'Cuéntanos un poco más (mínimo 10 caracteres).');
    const s = this.repo.insertar(new Sugerencia({ idEmpresa: usuario.idEmpresa, idUsuario: usuario.id, usuario: usuario.nombre, rol: usuario.rol, tipo: d.tipo, asunto: d.asunto.trim(), mensaje: d.mensaje.trim() }));
    this.notif.repo.insertar(new Notificacion({ tipo: 'sugerencia', titulo: 'Nuevo mensaje en el buzón de sugerencias', idEmpresa: usuario.idEmpresa, datos: { idSugerencia: s.id, asunto: s.asunto, usuario: s.usuario, rol: s.rol, tipoSug: s.tipo } }));
    return s;
  }
  deUsuario(idUsuario) { return this.repo.listar(s => s.idUsuario === idUsuario).sort((a, b) => b.creado - a.creado); }
  todas() { return this.repo.listar().sort((a, b) => b.creado - a.creado); }
  _leida(id) { this.notif.repo.listar(n => n.tipo === 'sugerencia' && n.datos?.idSugerencia === id).forEach(n => this.notif.marcarLeida(n.id)); }
  cambiarEstado(id, estado) {
    if (!['nueva', 'leida', 'atendida'].includes(estado)) throw new ErrorApp('DATOS', 'Estado no válido.');
    const s = this.repo.actualizar(id, { estado }); if (!s) throw new ErrorApp('NO_ENCONTRADO', 'Mensaje no encontrado.'); if (estado !== 'nueva') this._leida(id); return s;
  }
  responder(id, texto) {
    if (!texto?.trim()) throw new ErrorApp('DATOS', 'Escribe la respuesta.');
    const s = this.repo.actualizar(id, { respuesta: texto.trim(), estado: 'atendida', fechaRespuesta: Date.now() }); if (!s) throw new ErrorApp('NO_ENCONTRADO', 'Mensaje no encontrado.'); this._leida(id); return s;
  }
}
