import { RepositorioAviso } from '../infraestructura/RepositorioAviso.js';
import { Aviso } from '../dominio/Aviso.js';
import { ErrorApp } from '../../../core/Errores.js';
// Avisos de actualización o mantenimiento que el administrador publica y todos los usuarios ven al ingresar.
export class ServicioAvisos {
  constructor() { this.repo = new RepositorioAviso(); }
  listar() { return this.repo.listar().sort((a, b) => b.fecha - a.fecha); }
  activos() { return this.listar().filter(a => a.estado === 'activo'); }
  publicar({ titulo, texto }) {
    if (!titulo?.trim() || !texto?.trim()) throw new ErrorApp('DATOS', 'Escribe un título y el mensaje del aviso.');
    return this.repo.insertar(new Aviso({ titulo: titulo.trim(), texto: texto.trim() }));
  }
  archivar(id) { return this.repo.actualizar(id, { estado: 'archivado' }); }
}
