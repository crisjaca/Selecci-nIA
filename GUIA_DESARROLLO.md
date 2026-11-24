# Guía para modificar y ampliar SelecciónIA

## Mapa rápido
| Quiero… | Dónde |
|---|---|
| Ver/cambiar permisos de menú por rol | `config/permisos.config.js` |
| Cambiar permisos de datos por rol | `backend/Codigo.gs` → `[3] PERMISOS` (`TABLAS`) |
| Reglas de negocio que el cliente no puede saltarse | `backend/Codigo.gs` → `REGLAS_INSERTAR` / `REGLAS_ACTUALIZAR` |
| Lógica de cada requisito | `src/modulos/rfNN-*/aplicacion/` |
| Pantallas (HTML) | `vistas/<rol>/` ; su JS en `src/modulos/rfNN-*/presentacion/` |
| Acciones que se auditan | `src/modulos/rf14-auditoria/aplicacion/engancharAuditoria.js` |
| Sincronización / modo sin conexión | `src/modulos/rf10-sin-conexion/aplicacion/Sincronizador.js` |
| Comportamiento de los datos locales | `src/core/Almacen.js` y `src/core/Cola.js` |

## Receta: agregar una TABLA nueva (ej. `entrevistas`)
1. Crea la entidad en `src/modulos/rfNN/dominio/` y su repositorio (`super('entrevistas')`) en `infraestructura/`.
2. `backend/Codigo.gs`: agrega la línea en `ESQUEMA` (`entrevistas: 'idEmpresa,idCandidato,fecha:n,notas'`) y en `TABLAS` (quién lee y escribe; `col: 'idEmpresa'` aísla por empresa).
3. `config/sync.config.js`: agrega `'entrevistas'` a `TABLAS_SYNC`.
4. Ejecuta `prepararHoja()` en Apps Script (crea la pestaña) y publica una **versión nueva**.
5. Prueba: `node pruebas/todo.mjs`.
Un campo nuevo en una tabla existente: agrégalo a `ESQUEMA` (al final), a la entidad, y la columna en la pestaña (`verificarHoja()` te dice cómo debe quedar).

## Receta: agregar una VISTA
1. HTML en `vistas/<rol>/mi-vista.html` (copia uno existente) y su JS en el módulo.
2. Regístrala en `config/permisos.config.js` dentro de `vistas` del rol: `['Mi vista', 'mi-vista.html']`.
3. La vista debe empezar con `iniciarVista('<rol>', { tablero: false })`; eso aplica el control de acceso.

## Receta: auditar una acción nueva
Agrega una línea en `engancharAuditoria.js`: clase, método, nombre de la acción, y qué guardar en `det`. **Nunca** incluyas contraseñas ni datos personales de candidatos.

## Receta: cambiar un límite o regla del plan
Los límites (usuarios, dispositivos, sesiones por usuario) viven en `planes`. La validación que cuenta está en el servidor: `cupoUsuarios()` y `login()` en `Codigo.gs`. La del cliente es solo para dar el aviso al instante.

## Cómo funciona la sincronización (para depurar)
1. Todo cambio se guarda en la copia local y se anota en la **cola** (`sia:cola`).
2. `Sync.sincronizar()` envía la cola (lotes de 50) y luego pide los cambios desde la última marca de tiempo del servidor.
3. El servidor valida cada operación: permiso del rol, pertenencia a la empresa, versión y reglas de negocio. Lo rechazado vuelve en `rechazadas` y el registro se restaura a la versión del servidor (**el servidor siempre gana**).
4. Los borrados viajan como «lápidas» (pestaña `eliminados`).
5. Sin internet todo sigue funcionando; la «licencia» sin conexión dura `licenciaOfflineMs` (8 h) y luego pide iniciar sesión.

## Registro de actividad
`Log.info('Modulo', 'mensaje', { datos })` en el cliente (visible en *Diagnóstico*). Niveles: debug, info, warn, error (`nivelLog`). En el servidor, `LOG('INFO', 'modulo', 'mensaje', datos)` (visible en *Ejecuciones*).

## Pruebas
`node pruebas/todo.mjs` (Node 20+, sin instalar nada). El servidor se prueba contra un simulador de Google (`pruebas/gas.mjs`), y hay una prueba de punta a punta con varios dispositivos (`integracion.test.mjs`). `python3 pruebas/conflictos.py` revisa importaciones, vistas, nombres y tablas duplicadas (marca dos falsos positivos conocidos: `aprobar` y `aprobado`).
Lo que NO cubren: el aspecto de las pantallas, pdf.js/mammoth y los servicios reales de Google. Pruébalos en un navegador.
