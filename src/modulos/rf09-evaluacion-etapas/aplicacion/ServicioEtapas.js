import { RepositorioEtapa } from '../infraestructura/RepositorioEtapa.js';
import { RepositorioEvaluacion } from '../infraestructura/RepositorioEvaluacion.js';
import { RepositorioHistorial } from '../infraestructura/RepositorioHistorial.js';
import { EvaluacionEtapa } from '../dominio/EvaluacionEtapa.js';
import { HistorialAuditoria } from '../dominio/HistorialAuditoria.js';
import { EtapaProceso } from '../../../compartido/dominio/EtapaProceso.js';
import { ESTADOS_EN_ETAPA } from '../../../compartido/dominio/Candidato.js';
import { RepositorioCandidato } from '../../rf03-hojas-de-vida/infraestructura/RepositorioCandidato.js';
import { ServicioVacantes } from '../../rf02-vacantes/aplicacion/ServicioVacantes.js';
import { ErrorApp } from '../../../core/Errores.js';

export class ServicioEtapas {
  constructor() { this.etapas = new RepositorioEtapa(); this.evaluaciones = new RepositorioEvaluacion(); this.historialRepo = new RepositorioHistorial(); this.candidatos = new RepositorioCandidato(); this.vacantes = new ServicioVacantes(); }
  _vacante(idEmpresa, idVacante) { const v = this.vacantes.obtener(idEmpresa, idVacante); if (!v) throw new ErrorApp('NO_ENCONTRADO', 'Vacante no encontrada.'); return v; }
  listarEtapas(idEmpresa, idVacante) { return this.etapas.listar(e => e.idEmpresa === idEmpresa && e.idVacante === idVacante).sort((a, b) => a.orden - b.orden); }
  crearEtapa(idEmpresa, idVacante, d) {
    this._vacante(idEmpresa, idVacante);
    if (!d.nombreEtapa?.trim()) throw new ErrorApp('DATOS', 'La etapa necesita un nombre.');
    if (!['entrevista', 'prueba', 'otro'].includes(d.tipo)) throw new ErrorApp('DATOS', 'Elige el tipo de etapa.');
    const act = this.listarEtapas(idEmpresa, idVacante);
    return this.etapas.insertar(new EtapaProceso({ idEmpresa, idVacante, nombreEtapa: d.nombreEtapa.trim(), tipo: d.tipo, orden: (act.at(-1)?.orden || 0) + 1 }));
  }
  usarSugeridas(idEmpresa, idVacante) {
    if (this.listarEtapas(idEmpresa, idVacante).length) throw new ErrorApp('EN_USO', 'La vacante ya tiene etapas.');
    [['Entrevista con RH', 'entrevista'], ['Prueba técnica', 'prueba'], ['Entrevista con el área', 'entrevista']].forEach(([n, t]) => this.crearEtapa(idEmpresa, idVacante, { nombreEtapa: n, tipo: t }));
  }
  eliminarEtapa(idEmpresa, id) {
    const e = this.etapas.obtener(id); if (!e || e.idEmpresa !== idEmpresa) throw new ErrorApp('NO_ENCONTRADO', 'Etapa no encontrada.');
    if (this.candidatos.listar(c => c.idEtapaActual === id).length || this.evaluaciones.listar(x => x.idEtapa === id).length) throw new ErrorApp('EN_USO', 'La etapa tiene candidatos o evaluaciones; no se puede eliminar.');
    this.etapas.eliminar(id);
  }
  enEtapa(idEmpresa, idVacante) { return this.candidatos.listar(c => c.idEmpresa === idEmpresa && c.idVacante === idVacante && ESTADOS_EN_ETAPA.includes(c.estadoProceso) && c.idEtapaActual); }
  // El sistema no evalúa ni decide: valida, guarda, deja el respaldo y actualiza el estado. Avanzar, aprobar o rechazar se decide en RF_08.
  registrarEvaluacion(usuario, d) {
    const c = this.candidatos.obtener(d.idCandidato); if (!c || c.idEmpresa !== usuario.idEmpresa) throw new ErrorApp('DATOS', 'Candidato no encontrado.');
    const et = c.idEtapaActual && this.etapas.obtener(c.idEtapaActual);
    if (!ESTADOS_EN_ETAPA.includes(c.estadoProceso) || !et) throw new ErrorApp('SIN_ETAPA', 'El candidato no está en ninguna etapa del proceso. Avánzalo desde «Revisión y decisión».');
    if (!d.observaciones?.trim() || d.observaciones.trim().length < 5) throw new ErrorApp('DATOS', 'Escribe las observaciones de la evaluación.');
    if (!['aprobado', 'no_aprobado'].includes(d.resultado)) throw new ErrorApp('DATOS', 'Elige el resultado de la etapa.');
    const ev = this.evaluaciones.insertar(new EvaluacionEtapa({ idEmpresa: usuario.idEmpresa, idCandidato: c.id, idVacante: c.idVacante, idEtapa: et.id, nombreEtapa: et.nombreEtapa, observaciones: d.observaciones.trim(), resultado: d.resultado, idUsuario: usuario.id, usuarioResponsable: usuario.nombre }));
    this.historialRepo.insertar(new HistorialAuditoria({ idEmpresa: usuario.idEmpresa, idEvaluacion: ev.id, idCandidato: c.id, nombreEtapa: et.nombreEtapa, usuarioResponsable: usuario.nombre, resultadoRegistrado: d.resultado }));
    this.candidatos.actualizar(c.id, { estadoProceso: d.resultado === 'aprobado' ? 'etapa_aprobada' : 'etapa_no_aprobada' });
    return ev;
  }
  evaluacionesDe(idEmpresa, idCandidato) { return this.evaluaciones.listar(e => e.idEmpresa === idEmpresa && e.idCandidato === idCandidato).sort((a, b) => b.fecha - a.fecha); }
  historial(idEmpresa, idVacante = '') {
    const cand = Object.fromEntries(this.candidatos.listar(c => c.idEmpresa === idEmpresa).map(c => [c.id, c]));
    return this.historialRepo.listar(h => h.idEmpresa === idEmpresa && (!idVacante || cand[h.idCandidato]?.idVacante === idVacante))
      .map(h => ({ ...h, candidatoNombre: cand[h.idCandidato]?.nombre || 'Candidato eliminado' })).sort((a, b) => b.fechaRegistro - a.fechaRegistro);
  }
}
