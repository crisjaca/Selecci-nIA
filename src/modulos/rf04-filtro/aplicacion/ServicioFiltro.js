import { RepositorioResultadoFiltro } from '../infraestructura/RepositorioResultadoFiltro.js';
import { RepositorioCandidato } from '../../rf03-hojas-de-vida/infraestructura/RepositorioCandidato.js';
import { RepositorioHojaDeVida } from '../../rf03-hojas-de-vida/infraestructura/RepositorioHojaDeVida.js';
import { ServicioVacantes } from '../../rf02-vacantes/aplicacion/ServicioVacantes.js';
import { ResultadoFiltro } from '../dominio/ResultadoFiltro.js';
import { NIVELES_EDUCATIVOS as NIV } from '../../../compartido/dominio/Requisito.js';
import { norm } from '../../../core/Texto.js';
import { ErrorApp } from '../../../core/Errores.js';

const ETAPA_FILTRO = ['postulado', 'cumple_filtro', 'no_cumple_filtro'];   // el filtro no pisa etapas posteriores (RF_08/RF_09)
export class ServicioFiltro {
  constructor() { this.repo = new RepositorioResultadoFiltro(); this.candidatos = new RepositorioCandidato(); this.hojas = new RepositorioHojaDeVida(); this.vacantes = new ServicioVacantes(); }
  // Cumple = formación y experiencia mínimas. Los requisitos adicionales se informan y suben el nivel de cumplimiento, pero no descartan.
  evaluar(c, hoja, v) {
    const r = v.requisitos, crit = [];
    if (r.nivelEducativoMinimo) crit.push({ criterio: 'Formación académica', requerido: `mínimo ${r.nivelEducativoMinimo}`, encontrado: c.nivelEducativo, cumple: NIV.indexOf(c.nivelEducativo) >= NIV.indexOf(r.nivelEducativoMinimo), obligatorio: true });
    if (r.aniosExperienciaMinima > 0) crit.push({ criterio: 'Experiencia laboral', requerido: `mínimo ${r.aniosExperienciaMinima} año(s)`, encontrado: `${c.aniosExperiencia} año(s)`, cumple: c.aniosExperiencia >= r.aniosExperienciaMinima, obligatorio: true });
    if (r.palabrasClave.length) {
      const t = norm(hoja?.textoExtraido || ''), hallados = t ? r.palabrasClave.filter(k => t.includes(norm(k))) : [];
      crit.push({ criterio: 'Requisitos adicionales', requerido: r.palabrasClave.join(', '), encontrado: !t ? 'No se pudo leer el texto de la hoja de vida' : hallados.length ? hallados.join(', ') : 'ninguno', cumple: !!t && hallados.length === r.palabrasClave.length, obligatorio: false });
    }
    const ok = crit.filter(x => x.cumple).length;
    return { criterios: crit, cumple: crit.filter(x => x.obligatorio).every(x => x.cumple), nivelCumplimiento: crit.length ? Math.round(ok / crit.length * 100) : 100 };
  }
  ejecutar(idEmpresa, idVacante) {
    const v = this.vacantes.obtener(idEmpresa, idVacante); if (!v) throw new ErrorApp('NO_ENCONTRADO', 'Vacante no encontrada.');
    this.candidatos.listar(c => c.idEmpresa === idEmpresa && c.idVacante === idVacante).forEach(c => {
      const e = this.evaluar(c, this.hojas.porCandidato(c.id), v);
      this.repo.listar(x => x.idCandidato === c.id).forEach(x => this.repo.eliminar(x.id));
      this.repo.insertar(new ResultadoFiltro({ idEmpresa, idCandidato: c.id, idVacante, ...e }));
      if (ETAPA_FILTRO.includes(c.estadoProceso)) this.candidatos.actualizar(c.id, { estadoProceso: e.cumple ? 'cumple_filtro' : 'no_cumple_filtro' });
    });
    return this.resultados(idEmpresa, idVacante);
  }
  resultados(idEmpresa, idVacante) {
    const por = Object.fromEntries(this.candidatos.listar(c => c.idEmpresa === idEmpresa && c.idVacante === idVacante).map(c => [c.id, c]));
    return this.repo.listar(r => r.idEmpresa === idEmpresa && r.idVacante === idVacante && por[r.idCandidato]).map(r => ({ ...r, candidato: por[r.idCandidato] })).sort((a, b) => b.cumple - a.cumple || b.nivelCumplimiento - a.nivelCumplimiento);
  }
}
