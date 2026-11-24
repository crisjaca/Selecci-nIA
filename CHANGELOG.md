# Registro de avance

## Fase 4 · Conexión con Google Sheets (actual)
**Hecho:** servidor `backend/Codigo.gs` (sesiones con token, límites de dispositivos y de usuarios validados en el servidor, permisos por rol, aislamiento por empresa, auditoría del servidor, archivos en Drive); sincronización con cola de cambios y trabajo sin conexión (RF_10); registro de actividad y vista de diagnóstico; postulación pública, registro de empresa y contenido público contra el servidor; 159 pruebas automáticas.
**Decisiones:** el servidor siempre gana en un conflicto; solo el servidor escribe sesiones y notificaciones de límite; el administrador de plataforma no lee datos de candidatos; la cuenta «Empresa» tampoco.
**Pendiente / conocido:**
- Probar en navegador real: pantallas, lectura de CV (pdf.js/mammoth) y despliegue en GitHub Pages.
- Pasarela de pagos real (hoy simulada).
- Perfil de la empresa; restricción de directores por área; correo al administrador (`MailApp`) ante bloqueos.
- Autenticación más fuerte (hoy: SHA-256 con sal; considerar PBKDF2 o un proveedor de identidad si crece).
- Rendimiento de Apps Script con volúmenes grandes (ver GUIA_FASE4.md).

## Fase 3 · Operación del reclutador
RF_02 vacantes, RF_03 postulación y hojas de vida, RF_04 filtro, RF_05 correos, RF_06 banco de talentos, RF_07 puntaje, RF_08 revisión y decisión (reclutador y director), RF_09 etapas y evaluaciones; sugerencias y auditoría general.

## Fase 2 · Paneles de administrador y empresa
Empresas con contraseña por defecto, planes, suscripciones (pago simulado), usuarios internos, contenido, avisos, notificaciones, sesiones activas y límite de dispositivos.

## Fase 1 · Núcleo
Landing, registro, inicio de sesión, cambio de contraseña, roles y estructura por paquetes.
