import { RepositorioUsuario } from '../../rf11-autenticacion/infraestructura/RepositorioUsuario.js';
import { ServicioSuscripcion } from './ServicioSuscripcion.js';
import { Usuario } from '../../../compartido/dominio/Usuario.js';
import { Seguridad } from '../../../core/Seguridad.js';
import { ErrorApp } from '../../../core/Errores.js';

export class ServicioUsuariosEmpresa {
  constructor() { this.usuarios = new RepositorioUsuario(); this.sus = new ServicioSuscripcion(); }
  listar(idEmpresa) { return this.usuarios.listar(u => u.idEmpresa === idEmpresa && u.rol !== 'empresa'); }
  cupo(idEmpresa) {
    const { sus, plan } = this.sus.resumen(idEmpresa);
    return { sus, plan, usados: this.listar(idEmpresa).filter(u => u.estado === 'activo').length, limite: plan ? plan.limiteUsuarios : 0 };
  }
  async crear(idEmpresa, d) {
    const c = this.cupo(idEmpresa);
    if (!c.plan) throw new ErrorApp('SIN_SUSCRIPCION', 'Necesitas una suscripción activa para crear usuarios.');
    if (c.usados >= c.limite) throw new ErrorApp('LIMITE_USUARIOS', `Tu plan permite ${c.limite} usuario${c.limite > 1 ? 's' : ''}. Mejora tu suscripción para crear más.`);
    if (!d.nombre?.trim() || !/^\S+@\S+\.\S+$/.test(d.correo || '')) throw new ErrorApp('DATOS', 'Escribe un nombre y un correo válido.');
    if (!['reclutador', 'director'].includes(d.rol)) throw new ErrorApp('DATOS', 'Elige un rol.');
    if (this.usuarios.porCorreo(d.correo)) throw new ErrorApp('DUPLICADO', 'Ya existe una cuenta con ese correo.');
    const clave = Seguridad.claveTemporal(), sal = Seguridad.sal();
    const usuario = this.usuarios.insertar(new Usuario({ nombre: d.nombre.trim(), correo: d.correo.trim(), rol: d.rol, idEmpresa, sal, claveHash: await Seguridad.hash(clave, sal), debeCambiarClave: true }));
    return { usuario, clave };
  }
  cambiarEstado(idEmpresa, id, estado) {
    const u = this.usuarios.obtener(id); if (!u || u.idEmpresa !== idEmpresa) throw new ErrorApp('NO_ENCONTRADO', 'Usuario no encontrado.');
    if (estado === 'activo') { const c = this.cupo(idEmpresa); if (c.usados >= c.limite) throw new ErrorApp('LIMITE_USUARIOS', 'No hay cupo de usuarios en tu plan para activar otro.'); }
    return this.usuarios.actualizar(id, { estado });
  }
  async reiniciarClave(idEmpresa, id) {
    const u = this.usuarios.obtener(id); if (!u || u.idEmpresa !== idEmpresa) throw new ErrorApp('NO_ENCONTRADO', 'Usuario no encontrado.');
    const clave = Seguridad.claveTemporal(), sal = Seguridad.sal();
    this.usuarios.actualizar(id, { sal, claveHash: await Seguridad.hash(clave, sal), debeCambiarClave: true });
    return { correo: u.correo, clave };
  }
}
