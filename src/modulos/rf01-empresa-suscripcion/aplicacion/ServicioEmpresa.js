import { RepositorioEmpresa } from '../infraestructura/RepositorioEmpresa.js';
import { RepositorioUsuario } from '../../rf11-autenticacion/infraestructura/RepositorioUsuario.js';
import { Empresa } from '../../../compartido/dominio/Empresa.js';
import { Usuario } from '../../../compartido/dominio/Usuario.js';
import { CONFIG } from '../../../../config/app.config.js';
import { Api } from '../../../core/Api.js';
import { Seguridad } from '../../../core/Seguridad.js';
import { ErrorApp } from '../../../core/Errores.js';

export class ServicioEmpresa {
  constructor() { this.empresas = new RepositorioEmpresa(); this.usuarios = new RepositorioUsuario(); }
  listar() { return this.empresas.listar(); }
  _validar(d) {
    if (!d.nombreEmpresa?.trim() || !d.nit?.trim() || !d.nombre?.trim() || !d.correo?.trim()) throw new ErrorApp('DATOS', 'Completa todos los campos.');
    if (!/^\S+@\S+\.\S+$/.test(d.correo)) throw new ErrorApp('DATOS', 'El correo no tiene un formato válido.');
    if (this.empresas.porNit(d.nit)) throw new ErrorApp('DUPLICADO', 'Ya existe una empresa con ese NIT.');
    if (this.usuarios.porCorreo(d.correo)) throw new ErrorApp('DUPLICADO', 'Ya existe una cuenta con ese correo.');
  }
  async _crear(d, clave, forzarCambio) {
    const empresa = this.empresas.insertar(new Empresa({ nombre: d.nombreEmpresa.trim(), nit: d.nit.trim(), correoContacto: d.correo.trim() }));
    const sal = Seguridad.sal();
    this.usuarios.insertar(new Usuario({ nombre: d.nombre.trim(), correo: d.correo.trim(), rol: 'empresa', idEmpresa: empresa.id, sal, claveHash: await Seguridad.hash(clave, sal), debeCambiarClave: forzarCambio }));
    return empresa;
  }
  // Auto-registro: la empresa queda sin suscripción hasta que elija un plan y pague.
  async registrar(d) {
    this._validar(d);
    if (d.clave.length < 8) throw new ErrorApp('DATOS', 'La contraseña debe tener al menos 8 caracteres.');
    if (d.clave !== d.confirmar) throw new ErrorApp('DATOS', 'Las contraseñas no coinciden.');
    if (!d.acepta) throw new ErrorApp('DATOS', 'Debes aceptar los términos y la política de tratamiento de datos.');
    if (CONFIG.modo === 'remoto') {                          // el servidor crea la empresa y calcula el hash de la contraseña
      const r = await Api.llamar('registrarEmpresa', { nombreEmpresa: d.nombreEmpresa, nit: d.nit, nombre: d.nombre, correo: d.correo, clave: d.clave }, { publico: true });
      return { id: r.idEmpresa, nombre: d.nombreEmpresa };
    }
    return this._crear(d, d.clave, false);
  }
  // Alta por el administrador de plataforma: contraseña por defecto que la empresa debe cambiar al ingresar.
  async crearPorAdmin(d) { this._validar(d); const clave = Seguridad.claveTemporal(); return { empresa: await this._crear(d, clave, true), clave }; }
  cambiarEstado(id, estado) { return this.empresas.actualizar(id, { estado }); }
  async reiniciarClave(idEmpresa) {
    const u = this.usuarios.listar(x => x.idEmpresa === idEmpresa && x.rol === 'empresa')[0];
    if (!u) throw new ErrorApp('NO_ENCONTRADO', 'La empresa no tiene cuenta principal.');
    const clave = Seguridad.claveTemporal(), sal = Seguridad.sal();
    this.usuarios.actualizar(u.id, { sal, claveHash: await Seguridad.hash(clave, sal), debeCambiarClave: true });
    return { correo: u.correo, clave };
  }
}
