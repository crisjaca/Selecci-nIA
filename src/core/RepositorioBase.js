import { Tabla } from './Almacen.js';
export class RepositorioBase {
  constructor(tabla) { this.tabla = new Tabla(tabla); }
  listar(f) { return this.tabla.listar(f); }
  obtener(id) { return this.tabla.obtener(id); }
  insertar(o) { return this.tabla.insertar(o); }
  actualizar(id, c) { return this.tabla.actualizar(id, c); }
  eliminar(id) { this.tabla.eliminar(id); }
}
