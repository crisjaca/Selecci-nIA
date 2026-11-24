// SIMULADA: aprueba siempre. Para una pasarela real, reemplaza el cuerpo de cobrar() manteniendo la respuesta.
export class PasarelaPago {
  cobrar({ monto }) { return { aprobado: true, monto, idTransaccion: 'SIM-' + Date.now().toString(36).toUpperCase() }; }
}
