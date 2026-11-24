// Configuración global. Cambia 'modo' a 'remoto' en la fase 4 (Apps Script).
export const CONFIG = {
  // ─── MODO DE DATOS ─────────────────────────────────────────────────────────────
  // 'local'  : todo se guarda en el navegador (pruebas, sin servidor).
  // 'remoto' : los datos viven en Google Sheets vía Apps Script; el navegador trabaja con una copia
  //            local y sincroniza (funciona sin conexión y envía los cambios al volver internet).
  modo: 'remoto',
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbw9ZKwELzAQIOkpokZfcBkFWyyuR8VqIUeLb6b074ucHffZUKUt6RVdPhaI0y7mcK4aRw/exec',              // URL de la aplicación web: https://script.google.com/macros/s/XXXX/exec
  nivelLog: 'info',               // debug | info | warn | error  (lo que se escribe en consola y en el panel Diagnóstico)
  syncIntervaloMs: 60000,         // cada cuánto se sincroniza solo (1 min)
  licenciaOfflineMs: 8 * 3600 * 1000, // cuánto se puede trabajar sin conexión antes de pedir iniciar sesión de nuevo
  prefijo: 'sia:',
  dispositivoPorPestana: true,    // true: cada pestaña cuenta como un dispositivo (útil para probar los límites)
  latidoMs: 120000,               // señal de vida de la sesión (2 min)
  sesionExpiraMs: 300000,         // sesión sin señal por 5 min = caída, libera cupo
  ventanaNotifMs: 1800000,        // agrupa intentos bloqueados de una empresa en 30 min
  adminSemilla: { nombre: 'Administrador SelecciónIA', correo: 'admin@seleccionia.com', clave: 'Admin123!' }
};
