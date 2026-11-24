// Un grupo de no seleccionados de una vacante. Se arma al recopilar; no se guarda.
export const GRUPOS = { todos: ['no_cumple_filtro', 'no_seleccionado'], filtro: ['no_cumple_filtro'], decision: ['no_seleccionado'] };
export class GrupoCandidatos {
  constructor(d = {}) { Object.assign(this, { idGrupo: '', nombreGrupo: '', candidatos: [] }, d); }
}
