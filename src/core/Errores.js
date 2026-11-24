export class ErrorApp extends Error {
  constructor(codigo, mensaje) { super(mensaje); this.codigo = codigo; }
}
