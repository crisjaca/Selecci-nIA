# Conectar SelecciónIA a Google Sheets (fase 4)

Tiempo aproximado: 20 minutos. Necesitas una cuenta de Google. Todo es gratis.

## 1. Crear la hoja de cálculo
1. Entra a https://sheets.new y ponle de nombre **SelecciónIA_BD**. Déjala vacía.

## 2. Pegar el servidor
1. En esa hoja: **Extensiones → Apps Script**.
2. Borra el código de ejemplo y pega TODO el contenido de `backend/Codigo.gs`. Guarda (💾).
3. (Recomendado) En el bloque `[1] CONFIGURACIÓN`, cambia `ADMIN_INICIAL.clave`. El administrador deberá cambiarla igual al primer ingreso.

## 3. Preparar la base de datos (una sola vez)
1. En el selector de funciones (arriba) elige **inicializar** y pulsa **Ejecutar**.
2. Google pedirá permisos (Hojas de cálculo y Drive). Si dice «aplicación no verificada»: **Avanzado → Ir a (proyecto)** → Permitir. Es tu propio script.
3. Al terminar verás en la hoja 20 pestañas con encabezados, y en tu Drive la carpeta **SelecciónIA_HojasDeVida** (privada). Para comprobar: ejecuta **verificarHoja** y mira «Ejecuciones».

## 4. Publicar la API
1. **Implementar → Nueva implementación → ⚙️ Aplicación web**.
2. *Ejecutar como*: **Yo**. *Quién tiene acceso*: **Cualquier persona**. (Debe ser así: la web en GitHub Pages llama sin iniciar sesión en Google; la seguridad la hace el propio servidor con el token.)
3. **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).
4. Prueba: pega esa URL en el navegador. Debe mostrar `{"ok":true,"datos":{"servicio":"SelecciónIA",...}}`.

## 5. Conectar la aplicación
En `config/app.config.js`:
```js
modo: 'remoto',
appsScriptUrl: 'https://script.google.com/macros/s/XXXXXXXX/exec',
```
Sube el proyecto a GitHub y activa **Settings → Pages** (rama `main`, carpeta raíz).

## 6. Primera prueba
1. Abre tu sitio → **Iniciar sesión** con el administrador inicial → cambia la contraseña.
2. Menú **Diagnóstico → Probar conexión**: debe decir «Servidor activo».
3. Crea un plan y una empresa; comprueba que aparecen en las pestañas `planes` y `empresas` de la hoja.

## Actualizar el servidor después
Edita `Codigo.gs`, guarda y entra a **Implementar → Administrar implementaciones → ✏️ → Versión: Nueva versión → Implementar**. La URL no cambia. Si solo guardas, la URL sigue sirviendo la versión anterior.
Si agregas columnas, ejecuta `verificarHoja()` y agrega la columna a mano en la pestaña (al final, con el encabezado exacto).

## Cómo ver qué está pasando
- **En el navegador:** vista *Diagnóstico* (administrador) o *Sincronización* (reclutador): última sincronización, cambios pendientes, cambios rechazados y registro de actividad. También la consola (F12), líneas `[SIA …]`.
- **En el servidor:** Apps Script → **Ejecuciones**. Cada petición deja líneas `[SIA INFO][módulo] …`. Sube el detalle con `NIVEL_LOG = 'DEBUG'`.

## Problemas frecuentes
| Síntoma | Causa probable |
|---|---|
| «El servidor respondió algo que no se entiende» | La implementación no está en «Cualquier persona», o usas la URL `/dev` en vez de `/exec`. |
| «Falta la pestaña…» | No se ejecutó `inicializar()`. |
| Correo o contraseña incorrectos con el admin | `inicializar()` no se ejecutó o ya cambiaste la contraseña inicial. |
| Cambios no suben | Mira *Sincronización*: «rechazados» muestra el motivo (permiso, conflicto, límite del plan). |
| «Exceeded maximum execution time» o lentitud | Cuotas de Apps Script; ver límites abajo. |

## Límites y cuidados
- Una cuenta gratuita de Google permite ~20.000 llamadas diarias a Apps Script y 6 minutos por ejecución. Para un piloto con varias empresas sobra; si el uso crece, el siguiente paso es una base de datos real.
- El servidor atiende **una petición a la vez** (así dos ingresos no toman el mismo cupo). Cada petición lee las hojas: con decenas de miles de filas se vuelve lento.
- Cada hoja de vida se guarda en Drive (hasta 10 MB). Vigila tu espacio.
- **Pagos:** siguen simulados. El servidor ya recalcula las fechas de la suscripción, pero con dinero real el cobro debe confirmarlo la pasarela desde el servidor.
- La URL de la API es pública. Aun así, nadie puede leer ni cambiar datos sin un token válido, y cada token solo ve los datos de su empresa y de su rol.
