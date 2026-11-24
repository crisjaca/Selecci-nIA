export const NIVELES_EDUCATIVOS = ['Bachiller', 'Técnico', 'Tecnólogo', 'Profesional', 'Especialización', 'Maestría', 'Doctorado'];
export class Requisito {
  constructor(d = {}) { Object.assign(this, { nivelEducativoMinimo: '', aniosExperienciaMinima: 0, palabrasClave: [] }, d); }
}
