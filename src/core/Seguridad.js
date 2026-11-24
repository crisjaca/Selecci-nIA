const hex = (b) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
// Hash con sal. En la fase 4 esta verificación se repite en el servidor (Apps Script).
export const Seguridad = {
  sal: () => hex(crypto.getRandomValues(new Uint8Array(16))),
  async hash(clave, sal) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sal + clave))); }
};
// Contraseña temporal legible (sin caracteres ambiguos) para cuentas creadas por el administrador o la empresa.
Seguridad.claveTemporal = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; return [...crypto.getRandomValues(new Uint8Array(10))].map(n => a[n % a.length]).join(''); };
