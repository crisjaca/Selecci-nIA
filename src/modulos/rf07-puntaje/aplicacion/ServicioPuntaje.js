import { RepositorioPuntaje } from '../infraestructura/RepositorioPuntaje.js';
import { Puntaje } from '../dominio/Puntaje.js';
import { RepositorioCandidato } from '../../rf03-hojas-de-vida/infraestructura/RepositorioCandidato.js';
import { RepositorioHojaDeVida } from '../../rf03-hojas-de-vida/infraestructura/RepositorioHojaDeVida.js';
import { ServicioVacantes } from '../../rf02-vacantes/aplicacion/ServicioVacantes.js';
import { NIVELES_EDUCATIVOS as NIV } from '../../../compartido/dominio/Requisito.js';
import { norm } from '../../../core/Texto.js';
import { ErrorApp } from '../../../core/Errores.js';

export const PESOS = { formacion: 40, experiencia: 40, adicionales: 20 };   // se normalizan a 100 según los criterios que defina la vacante
// Puntaje 0–100 por reglas ponderadas y explicables (no es un modelo de IA). El filtro (RF_04) decide "cumple"; el puntaje mide qué tanto encaja.
export class ServicioPuntaje {
  constructor() { this.repo = new RepositorioPuntaje(); this.candidatos = new RepositorioCandidato(); this.hojas = new RepositorioHojaDeVida(); this.vacantes = new ServicioVacantes(); }
  calcular(idEmpresa, idCandidato) {
    const c = this.candidatos.obtener(idCandidato); if (!c || c.idEmpresa !== idEmpresa) throw new ErrorApp('DATOS', 'Faltan datos del candidato.');
    const v = this.vacantes.obtener(idEmpresa, c.idVacante); if (!v) throw new ErrorApp('DATOS', 'Faltan datos de la vacante.');
    const r = v.requisitos, d = [];
    if (!r.nivelEducativoMinimo && !(r.aniosExperienciaMinima > 0) && !r.palabrasClave.length) throw new ErrorApp('DATOS', 'La vacante no tiene requisitos para comparar.');
    if (r.nivelEducativoMinimo) { const min = NIV.indexOf(r.nivelEducativoMinimo), x = NIV.indexOf(c.nivelEducativo);
      d.push({ criterio: 'Formación académica', peso: PESOS.formacion, aporte: x >= min ? 1 : (x + 1) / (min + 1), detalle: `${c.nivelEducativo} frente a ${r.nivelEducativoMinimo}` }); }
    if (r.aniosExperienciaMinima > 0) d.push({ criterio: 'Experiencia laboral', peso: PESOS.experiencia, aporte: Math.min(1, c.aniosExperiencia / r.aniosExperienciaMinima), detalle: `${c.aniosExperiencia} de ${r.aniosExperienciaMinima} año(s) requeridos` });
    if (r.palabrasClave.length) { const t = norm(this.hojas.porCandidato(c.id)?.textoExtraido || ''), h = t ? r.palabrasClave.filter(k => t.includes(norm(k))) : [];
      d.push({ criterio: 'Requisitos adicionales', peso: PESOS.adicionales, aporte: h.length / r.palabrasClave.length, detalle: t ? `${h.length} de ${r.palabrasClave.length} encontrados` : 'No se pudo leer el texto de la hoja de vida' }); }
    const total = d.reduce((s, x) => s + x.peso, 0), valor = Math.round(d.reduce((s, x) => s + x.peso * x.aporte, 0) / total * 100);
    this.repo.listar(p => p.idCandidato === c.id).forEach(p => this.repo.eliminar(p.id));
    return this.repo.insertar(new Puntaje({ idEmpresa, idCandidato: c.id, idVacante: v.id, valorPuntaje: valor, desglose: d.map(x => ({ criterio: x.criterio, peso: Math.round(x.peso / total * 100), aporte: Math.round(x.aporte * 100), detalle: x.detalle })) }));
  }
  calcularVacante(idEmpresa, idVacante) {
    if (!this.vacantes.obtener(idEmpresa, idVacante)) throw new ErrorApp('DATOS', 'Faltan datos de la vacante.');
    this.candidatos.listar(c => c.idEmpresa === idEmpresa && c.idVacante === idVacante).forEach(c => this.calcular(idEmpresa, c.id));
    return this.ranking(idEmpresa, idVacante);
  }
  ranking(idEmpresa, idVacante) {
    const por = Object.fromEntries(this.candidatos.listar(c => c.idEmpresa === idEmpresa && c.idVacante === idVacante).map(c => [c.id, c]));
    return this.repo.listar(p => p.idEmpresa === idEmpresa && p.idVacante === idVacante && por[p.idCandidato]).map(p => ({ ...p, candidato: por[p.idCandidato] })).sort((a, b) => b.valorPuntaje - a.valorPuntaje);
  }
}
