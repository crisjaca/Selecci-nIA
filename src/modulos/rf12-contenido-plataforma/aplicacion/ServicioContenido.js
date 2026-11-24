import { RepositorioContenido } from '../infraestructura/RepositorioContenido.js';
// Textos iniciales de ejemplo. El administrador de plataforma los edita desde su panel (fase 2).
const POR_DEFECTO = {
  quienesSomos: 'SelecciónIA es un servicio por suscripción para que las áreas de Recursos Humanos reciban, ordenen y comparen hojas de vida sin revisarlas una por una.',
  mision: 'Reducir el tiempo que los equipos de selección dedican a revisar hojas de vida, sin quitarles la decisión final.',
  vision: 'Ser la herramienta de selección que las empresas usan incluso cuando se cae el internet.',
  contacto: { correo: 'contacto@seleccionia.com', telefono: '' },
  novedades: [], promociones: [], alianzas: []
};
export class ServicioContenido {
  constructor() { this.repo = new RepositorioContenido(); }
  obtener(remoto) { return { ...POR_DEFECTO, ...(remoto || this.repo.principal() || {}) }; }   // remoto: fila que llega del servidor para visitantes
  guardar(c) { const actual = this.repo.principal(); return actual ? this.repo.actualizar(actual.id, c) : this.repo.insertar(c); }
}
