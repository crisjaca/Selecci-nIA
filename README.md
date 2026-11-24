
# SelecciónIA
Plataforma de selección de personal por suscripción. Web estática (GitHub Pages) + Google Sheets/Apps Script como base de datos.

- **Probar sin servidor:** `modo: 'local'` en `config/app.config.js` y abrir con un servidor local (`npx serve .`). Administrador inicial: admin@seleccionia.com / Admin123!
- **Conectar a Google Sheets:** sigue `GUIA_FASE4.md`.
- **Modificar o ampliar:** `GUIA_DESARROLLO.md`. **Historial y pendientes:** `CHANGELOG.md`.
- **Pruebas:** `node pruebas/todo.mjs`

Estructura: `vistas/<rol>/` (HTML) · `src/modulos/rfNN-*/{presentacion,aplicacion,dominio,infraestructura}` (un paquete por requisito) · `src/compartido/dominio/` · `src/core/` · `config/` · `backend/Codigo.gs` · `pruebas/`.
