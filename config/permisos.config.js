// MATRIZ DE ROLES. Cada vista: [título, archivo en vistas/<carpeta>/ o null si aún no existe].
// Para agregar una vista: crea el HTML en vistas/<carpeta>/, su JS en el módulo y regístrala aquí.
export const ROLES = {
  admin_plataforma: { etiqueta: 'Administrador de plataforma', carpeta: 'admin-plataforma', inicio: 'vistas/admin-plataforma/dashboard.html', fase: 2,
    vistas: [['Empresas', 'empresas.html'], ['Planes y suscripciones', 'planes.html'], ['Contenido', 'contenido.html'], ['Avisos', 'avisos.html'],
      ['Notificaciones', 'notificaciones.html'], ['Sesiones activas', 'sesiones.html'], ['Sugerencias', 'sugerencias.html'], ['Auditoría', 'auditoria.html'], ['Diagnóstico', 'diagnostico.html']] },
  empresa: { etiqueta: 'Empresa', carpeta: 'empresa', inicio: 'vistas/empresa/dashboard.html', fase: 2,
    vistas: [['Suscripción y pago', 'suscripcion.html'], ['Usuarios internos', 'usuarios.html'], ['Sesiones activas', 'sesiones.html'], ['Sugerencias', 'sugerencias.html'], ['Perfil de la empresa', null]] },
  reclutador: { etiqueta: 'Reclutador', carpeta: 'reclutador', inicio: 'vistas/reclutador/dashboard.html', fase: 3,
    vistas: [['Vacantes', 'vacantes.html'], ['Hojas de vida', 'candidatos.html'], ['Filtro de candidatos', 'filtro.html'], ['Puntaje', 'puntaje.html'], ['Revisión y decisión', 'revision.html'],
      ['Etapas y evaluaciones', 'etapas.html'], ['Correos de no seleccionados', 'correos.html'], ['Banco de talentos', 'banco.html'], ['Sugerencias', 'sugerencias.html'], ['Sincronización', 'sincronizacion.html']] },
  director: { etiqueta: 'Director de Área', carpeta: 'director', inicio: 'vistas/director/dashboard.html', fase: 3,
    vistas: [['Ranking de candidatos', 'ranking.html'], ['Recomendaciones y decisión', 'decision.html'], ['Sugerencias', 'sugerencias.html']] }
};
export const ROLES_CON_CUPO = ['reclutador', 'director'];
