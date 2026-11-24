import { RepositorioCandidato } from '../infraestructura/RepositorioCandidato.js';
import { RepositorioHojaDeVida } from '../infraestructura/RepositorioHojaDeVida.js';
import { ExtractorTexto } from '../infraestructura/ExtractorTexto.js';
import { RepositorioResultadoFiltro } from '../../rf04-filtro/infraestructura/RepositorioResultadoFiltro.js';
import { RepositorioPuntaje } from '../../rf07-puntaje/infraestructura/RepositorioPuntaje.js';
import { RepositorioDecision } from '../../rf08-revision-decision/infraestructura/RepositorioDecision.js';
import { RepositorioEvaluacion } from '../../rf09-evaluacion-etapas/infraestructura/RepositorioEvaluacion.js';
import { ServicioVacantes } from '../../rf02-vacantes/aplicacion/ServicioVacantes.js';
import { Candidato } from '../../../compartido/dominio/Candidato.js';
import { HojaDeVida } from '../../../compartido/dominio/HojaDeVida.js';
import { NIVELES_EDUCATIVOS } from '../../../compartido/dominio/Requisito.js';
import { Archivos } from '../../../core/ArchivoStore.js';
import { ErrorApp } from '../../../core/Errores.js';

const MAX = 10 * 1024 * 1024;
export class ServicioCandidatos {
  constructor(deps = {}) {
    this.candidatos = new RepositorioCandidato(); this.hojas = new RepositorioHojaDeVida(); this.resultados = new RepositorioResultadoFiltro(); this.puntajes = new RepositorioPuntaje(); this.decisiones = new RepositorioDecision(); this.evaluaciones = new RepositorioEvaluacion();
    this.vacantes = new ServicioVacantes(); this.archivos = deps.archivos || Archivos(); this.extractor = deps.extractor || new ExtractorTexto();
  }
  // Postulación pública (sin cuenta): valida datos, consentimiento, formato y peso de la hoja de vida.
  async postular(d) {
    const v = this.vacantes.publicas().find(x => x.id === d.idVacante); if (!v) throw new ErrorApp('VACANTE', 'Esta vacante ya no está disponible.');
    if (!d.nombre?.trim()) throw new ErrorApp('DATOS', 'Escribe tu nombre.');
    if (!/^\S+@\S+\.\S+$/.test(d.correo || '')) throw new ErrorApp('DATOS', 'Escribe un correo válido.');
    if (!NIVELES_EDUCATIVOS.includes(d.nivelEducativo)) throw new ErrorApp('DATOS', 'Selecciona tu máximo nivel de formación.');
    const anios = Number(d.aniosExperiencia === '' ? NaN : d.aniosExperiencia);
    if (!Number.isInteger(anios) || anios < 0 || anios > 60) throw new ErrorApp('DATOS', 'Los años de experiencia deben ser un número entero (0 si no tienes).');
    if (!d.consentimiento) throw new ErrorApp('DATOS', 'Debes aceptar el tratamiento de tus datos personales para postularte.');
    const f = d.archivo; if (!f) throw new ErrorApp('ARCHIVO', 'Adjunta tu hoja de vida.');
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx'].includes(ext)) throw new ErrorApp('FORMATO', 'La hoja de vida debe ser un archivo PDF o DOCX.');
    if (f.size === 0) throw new ErrorApp('ARCHIVO', 'El archivo está vacío.');
    if (f.size > MAX) throw new ErrorApp('PESO', 'La hoja de vida pesa más de 10 MB. Reduce su tamaño e inténtalo de nuevo.');
    if (this.candidatos.listar(c => c.idVacante === v.id && c.correo.toLowerCase() === d.correo.trim().toLowerCase()).length) throw new ErrorApp('DUPLICADO', 'Ya te postulaste a esta vacante con ese correo.');
    const texto = await this.extractor.extraer(f).catch(() => ''), idHoja = crypto.randomUUID();
    await this.archivos.guardar(idHoja, f);   // primero el archivo: si falla, no queda un registro huérfano
    const c = this.candidatos.insertar(new Candidato({ idEmpresa: v.idEmpresa, idVacante: v.id, nombre: d.nombre.trim(), correo: d.correo.trim(), telefono: (d.telefono || '').trim(), nivelEducativo: d.nivelEducativo, aniosExperiencia: anios, consentimiento: true }));
    this.hojas.insertar(new HojaDeVida({ id: idHoja, idCandidato: c.id, idEmpresa: v.idEmpresa, nombreArchivo: f.name, formato: ext, pesoMB: Math.round(f.size / 10485.76) / 100, textoExtraido: texto, extraccion: texto ? 'ok' : 'sin_texto' }));
    return c;
  }
  listar(idEmpresa, idVacante = '') { return this.candidatos.listar(c => c.idEmpresa === idEmpresa && (!idVacante || c.idVacante === idVacante)).sort((a, b) => b.creado - a.creado); }
  obtener(idEmpresa, id) { const c = this.candidatos.obtener(id); return c && c.idEmpresa === idEmpresa ? c : null; }
  hoja(idEmpresa, idCandidato) { return this.obtener(idEmpresa, idCandidato) ? this.hojas.porCandidato(idCandidato) : null; }
  async descargar(idEmpresa, idCandidato) { const h = this.hoja(idEmpresa, idCandidato); if (!h) throw new ErrorApp('NO_ENCONTRADO', 'Hoja de vida no encontrada.'); const b = await this.archivos.obtener(h.id); if (!b) throw new ErrorApp('ARCHIVO', 'El archivo no está disponible en este dispositivo.'); return { blob: b, nombre: h.nombreArchivo }; }
  // Eliminación definitiva (protección de datos): candidato, hoja de vida, archivo y resultados del filtro.
  async eliminar(idEmpresa, id) {
    const c = this.obtener(idEmpresa, id); if (!c) throw new ErrorApp('NO_ENCONTRADO', 'Candidato no encontrado.');
    const h = this.hojas.porCandidato(id); if (h) { await this.archivos.eliminar(h.id); this.hojas.eliminar(h.id); }
    this.resultados.listar(r => r.idCandidato === id).forEach(r => this.resultados.eliminar(r.id)); [this.puntajes, this.decisiones, this.evaluaciones].forEach(r => r.listar(x => x.idCandidato === id).forEach(x => r.eliminar(x.id)));
    this.candidatos.eliminar(id);
  }
}
