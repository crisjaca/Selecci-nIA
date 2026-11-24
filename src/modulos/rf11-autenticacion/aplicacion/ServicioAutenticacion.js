import { CONFIG } from '../../../../config/app.config.js';
import { RepositorioUsuario } from '../infraestructura/RepositorioUsuario.js';
import { ServicioSesiones } from './ServicioSesiones.js';
import { RepositorioEmpresa } from '../../rf01-empresa-suscripcion/infraestructura/RepositorioEmpresa.js';
import { Sync } from '../../rf10-sin-conexion/aplicacion/Sincronizador.js';
import { Usuario } from '../../../compartido/dominio/Usuario.js';
import { Seguridad } from '../../../core/Seguridad.js';
import { SesionActiva } from '../../../core/SesionActiva.js';
import { Dispositivo } from '../../../core/Dispositivo.js';
import { Api } from '../../../core/Api.js';
import { Log } from '../../../core/Logger.js';
import { ErrorApp } from '../../../core/Errores.js';

// Autenticación. Dos caminos según config.modo:
//   'local'  : verifica contra la tabla de usuarios del navegador y controla los cupos con ServicioSesiones.
//   'remoto' : el SERVIDOR verifica la contraseña, controla los cupos de dispositivos y entrega un token; aquí solo se guarda ese token.
export class ServicioAutenticacion {
  constructor() { this.usuarios = new RepositorioUsuario(); this.sesiones = new ServicioSesiones(); }

  async sembrarAdmin() {
    if (CONFIG.modo === 'remoto') return;                // en remoto el administrador inicial lo crea inicializar() en Apps Script
    if (this.usuarios.listar(u => u.rol === 'admin_plataforma').length) return;
    const a = CONFIG.adminSemilla, sal = Seguridad.sal();
    this.usuarios.insertar(new Usuario({ nombre: a.nombre, correo: a.correo, rol: 'admin_plataforma', sal, claveHash: await Seguridad.hash(a.clave, sal), debeCambiarClave: true }));
    Log.info('Auth', 'Administrador inicial creado (modo local)');
  }
  async iniciarSesion(correo, clave) {
    if (CONFIG.modo === 'remoto') return this._iniciarRemoto(correo, clave);
    await this.sembrarAdmin();
    const u = this.usuarios.porCorreo(correo || '');
    if (!u || u.estado !== 'activo' || await Seguridad.hash(clave, u.sal) !== u.claveHash) throw new ErrorApp('CREDENCIALES', 'Correo o contraseña incorrectos.');
    if (u.rol === 'empresa' && new RepositorioEmpresa().obtener(u.idEmpresa)?.estado === 'suspendida')
      throw new ErrorApp('EMPRESA_SUSPENDIDA', 'La cuenta de tu empresa está suspendida. Comunícate con SelecciónIA.');
    const sesion = this.sesiones.abrir(u);
    SesionActiva.guardar({ token: sesion.token, usuario: new Usuario(u).publico() });
    return new Usuario(u);
  }
  async _iniciarRemoto(correo, clave) {
    Log.info('Auth', 'Iniciando sesión en el servidor');
    const r = await Api.llamar('login', { correo, clave, dispositivo: Dispositivo.id(), navegador: Dispositivo.navegador() }, { publico: true });
    Sync.prepararUsuario(r.usuario.id);                  // si es otra persona, se borra la copia local de la anterior
    SesionActiva.guardar({ token: r.token, usuario: r.usuario, validadoEn: Date.now() });
    const s = await Sync.sincronizar();                  // descarga los datos que este usuario puede ver
    if (s.error) Log.warn('Auth', 'Sesión abierta pero la primera sincronización falló: ' + s.error);
    return new Usuario(r.usuario);
  }
  async cambiarClave(actual, nueva, confirmar) {
    const s = SesionActiva.obtener(); if (!s) throw new ErrorApp('SIN_SESION', 'Inicia sesión de nuevo.');
    if (nueva.length < 8) throw new ErrorApp('DATOS', 'La nueva contraseña debe tener al menos 8 caracteres.');
    if (nueva !== confirmar) throw new ErrorApp('DATOS', 'Las contraseñas nuevas no coinciden.');
    if (nueva === actual) throw new ErrorApp('DATOS', 'La nueva contraseña debe ser distinta de la actual.');
    if (CONFIG.modo === 'remoto') {
      const r = await Api.llamar('cambiarClave', { actual, nueva }); SesionActiva.guardar({ ...s, usuario: r.usuario }); Log.info('Auth', 'Contraseña cambiada'); return r.usuario;
    }
    const u = this.usuarios.obtener(s.usuario.id);
    if (await Seguridad.hash(actual, u.sal) !== u.claveHash) throw new ErrorApp('CREDENCIALES', 'La contraseña actual no es correcta.');
    const sal = Seguridad.sal();
    const nu = this.usuarios.actualizar(u.id, { sal, claveHash: await Seguridad.hash(nueva, sal), debeCambiarClave: false });
    SesionActiva.guardar({ token: s.token, usuario: new Usuario(nu).publico() });
    return nu;
  }
  async cerrarSesion() {
    const s = SesionActiva.obtener();
    if (CONFIG.modo === 'remoto' && s) {
      await Sync.sincronizar().catch(() => {});          // intenta enviar lo pendiente antes de salir
      await Api.llamar('logout').catch(() => {});        // sin conexión: la sesión caduca sola en el servidor
      if (!Sync.pendientes()) Sync.prepararUsuario(null); // sin pendientes: se borra la copia local
      Log.info('Auth', 'Sesión cerrada');
    } else if (s) this.sesiones.cerrar(s.token);
    SesionActiva.limpiar();
  }
}
