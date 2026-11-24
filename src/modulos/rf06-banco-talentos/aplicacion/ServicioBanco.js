import { HistorialProceso } from '../dominio/HistorialProceso.js';
import { RepositorioCandidato } from '../../rf03-hojas-de-vida/infraestructura/RepositorioCandidato.js';
import { RepositorioHojaDeVida } from '../../rf03-hojas-de-vida/infraestructura/RepositorioHojaDeVida.js';
import { RepositorioResultadoFiltro } from '../../rf04-filtro/infraestructura/RepositorioResultadoFiltro.js';
import { RepositorioDecision } from '../../rf08-revision-decision/infraestructura/RepositorioDecision.js';
import { ServicioCandidatos } from '../../rf03-hojas-de-vida/aplicacion/ServicioCandidatos.js';
import { ESTADOS_NO_SELECCIONADO } from '../../../compartido/dominio/Candidato.js';
import { NIVELES_EDUCATIVOS as NIV } from '../../../compartido/dominio/Requisito.js';
import { norm } from '../../../core/Texto.js';

// Solo consulta y descarga: no modifica ningún dato.
export class ServicioBanco {
  constructor(deps) { this.candidatos = new RepositorioCandidato(); this.hojas = new RepositorioHojaDeVida(); this.resultados = new RepositorioResultadoFiltro(); this.decisiones = new RepositorioDecision(); this.cand = new ServicioCandidatos(deps); }
  historial(c) {
    if (c.estadoProceso === 'no_seleccionado') { const d = this.decisiones.listar(x => x.idCandidato === c.id && x.decisionTomada === 'rechazar').sort((a, b) => b.fecha - a.fecha)[0];
      return new HistorialProceso({ etapaFinal: d?.nombreEtapa || 'Revisión final', motivoRechazo: d?.justificacion || '—', fecha: d?.fecha || c.creado }); }
    const r = this.resultados.listar(x => x.idCandidato === c.id)[0];
    return new HistorialProceso({ etapaFinal: 'Filtro por requisitos', motivoRechazo: r?.criterios.filter(k => !k.cumple && k.obligatorio).map(k => `${k.criterio}: ${k.encontrado} (${k.requerido})`).join('; ') || '—', fecha: r?.fecha || c.creado });
  }
  buscar(idEmpresa, f = {}) {
    const q = norm(f.q || '');
    return this.candidatos.listar(c => c.idEmpresa === idEmpresa && ESTADOS_NO_SELECCIONADO.includes(c.estadoProceso)
      && (!f.idVacante || c.idVacante === f.idVacante) && (!f.estado || c.estadoProceso === f.estado)
      && (!f.nivel || NIV.indexOf(c.nivelEducativo) >= NIV.indexOf(f.nivel)) && (!f.anios || c.aniosExperiencia >= Number(f.anios))
      && (!q || norm(c.nombre + ' ' + c.correo + ' ' + (this.hojas.porCandidato(c.id)?.textoExtraido || '')).includes(q)))
      .map(c => ({ ...c, historial: this.historial(c) })).sort((a, b) => b.historial.fecha - a.historial.fecha);
  }
  descargar(idEmpresa, id) { return this.cand.descargar(idEmpresa, id); }
}
