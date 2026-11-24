import { RepositorioVacante } from '../infraestructura/RepositorioVacante.js';
import { RepositorioCandidato } from '../../rf03-hojas-de-vida/infraestructura/RepositorioCandidato.js';
import { RepositorioEmpresa } from '../../rf01-empresa-suscripcion/infraestructura/RepositorioEmpresa.js';
import { ServicioSuscripcion } from '../../rf01-empresa-suscripcion/aplicacion/ServicioSuscripcion.js';
import { RepositorioEtapa } from '../../rf09-evaluacion-etapas/infraestructura/RepositorioEtapa.js';
import { Vacante } from '../../../compartido/dominio/Vacante.js';
import { NIVELES_EDUCATIVOS } from '../../../compartido/dominio/Requisito.js';
import { ErrorApp } from '../../../core/Errores.js';

export class ServicioVacantes {
  constructor() { this.repo = new RepositorioVacante(); this.candidatos = new RepositorioCandidato(); this.empresas = new RepositorioEmpresa(); this.sus = new ServicioSuscripcion(); this.etapas = new RepositorioEtapa(); }
  listar(idEmpresa) { return this.repo.listar(v => v.idEmpresa === idEmpresa).sort((a, b) => b.creado - a.creado); }
  obtener(idEmpresa, id) { const v = this.repo.obtener(id); return v && v.idEmpresa === idEmpresa ? v : null; }
  _validar(d) {
    if (!d.titulo?.trim()) throw new ErrorApp('DATOS', 'La vacante necesita un título.');
    if (!d.perfilProfesional?.trim()) throw new ErrorApp('DATOS', 'Describe el perfil profesional que buscas.');
    if (d.nivelEducativoMinimo && !NIVELES_EDUCATIVOS.includes(d.nivelEducativoMinimo)) throw new ErrorApp('DATOS', 'Nivel de formación no válido.');
    const anios = d.aniosExperienciaMinima === '' || d.aniosExperienciaMinima == null ? 0 : Number(d.aniosExperienciaMinima);
    if (!Number.isInteger(anios) || anios < 0 || anios > 50) throw new ErrorApp('DATOS', 'Los años de experiencia deben ser un entero entre 0 y 50.');
    const claves = (Array.isArray(d.palabrasClave) ? d.palabrasClave : String(d.palabrasClave || '').split(',')).map(k => k.trim()).filter(Boolean);
    return { titulo: d.titulo.trim(), area: (d.area || '').trim(), perfilProfesional: d.perfilProfesional.trim(), descripcion: (d.descripcion || '').trim(),
      requisitos: { nivelEducativoMinimo: d.nivelEducativoMinimo || '', aniosExperienciaMinima: anios, palabrasClave: claves } };
  }
  guardar(idEmpresa, d) {
    const v = this._validar(d);
    if (d.id) { if (!this.obtener(idEmpresa, d.id)) throw new ErrorApp('NO_ENCONTRADO', 'Vacante no encontrada.'); return this.repo.actualizar(d.id, v); }
    return this.repo.insertar(new Vacante({ ...v, idEmpresa }));
  }
  cambiarEstado(idEmpresa, id, estado) {
    const v = this.obtener(idEmpresa, id); if (!v) throw new ErrorApp('NO_ENCONTRADO', 'Vacante no encontrada.');
    if (estado === 'publicada' && !v.requisitos.nivelEducativoMinimo) throw new ErrorApp('REQUISITOS', 'Antes de publicar, define la formación mínima requerida.');
    return this.repo.actualizar(id, { estado, fechaPublicacion: estado === 'publicada' ? Date.now() : v.fechaPublicacion });
  }
  eliminar(idEmpresa, id) {
    if (!this.obtener(idEmpresa, id)) throw new ErrorApp('NO_ENCONTRADO', 'Vacante no encontrada.');
    if (this.candidatos.listar(c => c.idVacante === id).length) throw new ErrorApp('EN_USO', 'La vacante ya tiene candidatos. Ciérrala en lugar de eliminarla.');
    this.etapas.listar(e => e.idVacante === id).forEach(e => this.etapas.eliminar(e.id));
    this.repo.eliminar(id);
  }
  // Vacantes visibles al público: publicadas, de empresas activas con suscripción vigente.
  publicas() {
    return this.repo.listar(v => v.estado === 'publicada').map(v => ({ v, e: this.empresas.obtener(v.idEmpresa) }))
      .filter(x => x.e && x.e.estado === 'activa' && this.sus.resumen(x.e.id).plan).map(x => ({ ...x.v, empresaNombre: x.e.nombre }));
  }
}
