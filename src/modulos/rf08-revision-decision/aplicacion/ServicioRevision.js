import { RepositorioDecision } from '../infraestructura/RepositorioDecision.js';
import { DecisionFinal } from '../dominio/DecisionFinal.js';
import { RecomendacionSistema } from '../dominio/RecomendacionSistema.js';
import { ServicioPuntaje } from '../../rf07-puntaje/aplicacion/ServicioPuntaje.js';
import { ServicioFiltro } from '../../rf04-filtro/aplicacion/ServicioFiltro.js';
import { ServicioEtapas } from '../../rf09-evaluacion-etapas/aplicacion/ServicioEtapas.js';
import { ESTADOS_FINALES } from '../../../compartido/dominio/Candidato.js';
import { ErrorApp } from '../../../core/Errores.js';

const UMBRAL_AVANZAR = 70;
export class ServicioRevision {
  constructor() { this.repo = new RepositorioDecision(); this.puntajes = new ServicioPuntaje(); this.filtro = new ServicioFiltro(); this.etapas = new ServicioEtapas(); this.candidatos = this.etapas.candidatos; }
  _candidato(idEmpresa, id) { const c = this.candidatos.obtener(id); if (!c || c.idEmpresa !== idEmpresa) throw new ErrorApp('NO_ENCONTRADO', 'Candidato no encontrado.'); return c; }
  lista(idEmpresa, idVacante) { return this.candidatos.listar(c => c.idEmpresa === idEmpresa && c.idVacante === idVacante); }
  // Genera la recomendación (y refresca el puntaje guardado del candidato).
  recomendacion(idEmpresa, idCandidato) {
    const c = this._candidato(idEmpresa, idCandidato), p = this.puntajes.calcular(idEmpresa, idCandidato);
    const f = this.filtro.evaluar(c, this.puntajes.hojas.porCandidato(c.id), this.puntajes.vacantes.obtener(idEmpresa, c.idVacante));
    const sugerencia = !f.cumple ? 'rechazar' : p.valorPuntaje >= UMBRAL_AVANZAR ? 'avanzar' : 'revisar';
    const nc = f.criterios.filter(k => !k.cumple).map(k => k.criterio.toLowerCase());
    return new RecomendacionSistema({ idCandidato, puntajeSugerido: p.valorPuntaje, sugerencia, criterios: f.criterios, desglose: p.desglose,
      resumen: `Puntaje ${p.valorPuntaje}/100. ${f.cumple ? 'Cumple los requisitos mínimos.' : 'No cumple los requisitos mínimos.'}${nc.length ? ' Pendiente: ' + nc.join(', ') + '.' : ''}` });
  }
  // Decisión humana: aprobar (seleccionar), rechazar o avanzar de etapa. La justificación es obligatoria.
  decidir(usuario, d) {
    const c = this._candidato(usuario.idEmpresa, d.idCandidato);
    if (ESTADOS_FINALES.includes(c.estadoProceso)) throw new ErrorApp('FINAL', 'Este candidato ya tiene una decisión final.');
    if (!['aprobar', 'rechazar', 'avanzar'].includes(d.decision)) throw new ErrorApp('DATOS', 'Elige una opción: aprobar, rechazar o avanzar de etapa.');
    if (!d.justificacion?.trim() || d.justificacion.trim().length < 5) throw new ErrorApp('DATOS', 'Escribe la justificación de tu decisión.');
    const et = this.etapas.listarEtapas(usuario.idEmpresa, c.idVacante), actual = et.find(e => e.id === c.idEtapaActual);
    let cambios, nombreEtapa = actual?.nombreEtapa || 'Antes de las etapas';
    if (d.decision === 'avanzar') {
      if (!et.length) throw new ErrorApp('SIN_ETAPAS', 'La vacante no tiene etapas definidas. Créalas en «Etapas y evaluaciones».');
      const sig = et[et.findIndex(e => e.id === c.idEtapaActual) + 1];
      if (!sig) throw new ErrorApp('ULTIMA_ETAPA', 'El candidato ya está en la última etapa. Aprueba o rechaza.');
      cambios = { estadoProceso: 'en_etapa', idEtapaActual: sig.id }; nombreEtapa = sig.nombreEtapa;
    } else cambios = { estadoProceso: d.decision === 'aprobar' ? 'seleccionado' : 'no_seleccionado' };
    let rec = null; try { rec = this.recomendacion(usuario.idEmpresa, c.id); } catch { /* sin requisitos: se decide sin recomendación */ }
    const dec = this.repo.insertar(new DecisionFinal({ idEmpresa: usuario.idEmpresa, idCandidato: c.id, idVacante: c.idVacante, decisionTomada: d.decision, justificacion: d.justificacion.trim(), nombreEtapa,
      puntajeSugerido: rec?.puntajeSugerido ?? null, sugerencia: rec?.sugerencia || '', idUsuario: usuario.id, usuarioResponsable: usuario.nombre, rol: usuario.rol }));
    this.candidatos.actualizar(c.id, cambios); return dec;
  }
  decisionesDe(idEmpresa, idCandidato) { return this.repo.listar(x => x.idEmpresa === idEmpresa && x.idCandidato === idCandidato).sort((a, b) => b.fecha - a.fecha); }
}
