// Tablas que se sincronizan con Google Sheets. DEBE coincidir con TABLAS de backend/Codigo.gs.
// Para agregar una tabla: 1) ESQUEMA y TABLAS en Codigo.gs  2) aquí  3) ver GUIA_DESARROLLO.md
export const TABLAS_SYNC = ['usuarios', 'empresas', 'planes', 'suscripciones', 'sesiones', 'notificaciones', 'contenido', 'avisos', 'sugerencias',
  'vacantes', 'candidatos', 'hojas_de_vida', 'resultados_filtro', 'puntajes', 'etapas', 'evaluaciones_etapa', 'historial_auditoria', 'decisiones', 'auditoria'];
// Se leen del servidor pero el navegador no las modifica (las escribe solo el servidor).
export const SOLO_LECTURA = ['sesiones'];
