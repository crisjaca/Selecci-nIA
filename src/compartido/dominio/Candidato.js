// Estados del proceso. El filtro (RF_04) solo toca los tres primeros; las etapas (RF_09) y las decisiones (RF_08) manejan el resto.
export const ESTADOS_NO_SELECCIONADO = ['no_cumple_filtro', 'no_seleccionado'];   // los usan RF_05 (correos) y RF_06 (banco)
export const ESTADOS_EN_ETAPA = ['en_etapa', 'etapa_aprobada', 'etapa_no_aprobada'];
export const ESTADOS_FINALES = ['seleccionado', 'no_seleccionado'];
const ETIQUETAS = { postulado: 'Postulado', cumple_filtro: 'Cumple el filtro', no_cumple_filtro: 'No cumple el filtro', en_etapa: 'En etapa', etapa_aprobada: 'Etapa aprobada', etapa_no_aprobada: 'Etapa no aprobada', seleccionado: 'Seleccionado', no_seleccionado: 'No seleccionado' };
export const etiquetaEstado = (e) => ETIQUETAS[e] || e;
export class Candidato {
  constructor(d = {}) {
    Object.assign(this, { id: null, idEmpresa: null, idVacante: null, nombre: '', correo: '', telefono: '', nivelEducativo: '', aniosExperiencia: 0, estadoProceso: 'postulado', idEtapaActual: null, consentimiento: false }, d);
  }
}
