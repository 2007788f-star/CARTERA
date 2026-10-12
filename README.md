# CARTERA familiar — Excel compartido

Aplicación privada para dos administradores de los mismos préstamos desde teléfono y computadora. El libro `cartera/CARTERA.xlsx` en R2 es el almacenamiento autoritativo de deudores, préstamos, cobros, referencias de expedientes e historial. D1 se conserva exclusivamente para cuentas, sesiones y limitación de intentos; las tablas financieras antiguas solo se leen durante la conversión explícita.

## Uso cotidiano

1. El acreedor configura la cuenta principal en `/ingresar` con la clave de instalación.
2. Desde **Accesos**, crea el segundo administrador con correo y contraseña propios. Ambos administran la misma cartera. No hay registro público de usuarios.
3. Capturar préstamos y cobros desde la app. Admite hasta 50 deudores; una persona puede tener varios préstamos.
4. **Descargar Excel** obtiene una copia actual. Las copias descargadas sirven para consultar y conservar respaldos; editarlas no cambia los datos centrales. No se suben ni reemplazan libros editados externamente.
5. Desde el expediente se cargan PDF, JPG y PNG de hasta 10 MB. Se almacenan separados del libro y solo se sirven tras comprobar la sesión.

Las hojas del libro son Control, Deudores, Prestamos, Cobros, Expedientes, Historial y Origen. Contienen filas de datos y números, no fórmulas ocultas ni contraseñas. Los cálculos de vencimiento y capital se realizan en la app con las mismas reglas verificadas de CARTERA. El historial conserva acreedor principal o segundo administrador como autor.

## Escrituras y respaldo

Cada escritura lee el libro completo, valida los datos y usa un PUT condicional de R2 con su ETag. Si otro administrador guardó primero, se vuelve a leer y validar; las revisiones de préstamos y cobros rechazan ediciones obsoletas. Las altas conservan la clave de idempotencia para reintentos de red.

Antes de reemplazar el libro se conserva la versión anterior en `cartera/respaldos/`. Si falla el respaldo, no se confirma la escritura. Los expedientes retirados se quitan del listado y se registran en el historial, pero se conservan físicamente para recuperación junto con los respaldos. No se aplica borrado automático ni retención sin una decisión del acreedor. R2 puede limitar escrituras rápidas a una misma clave; la app informa el fallo y permite reintentar, conservando la clave de operación.

Restauración: detener capturas, descargar el libro actual y el respaldo elegido, revisar su contenido y reemplazar `cartera/CARTERA.xlsx` desde la cuenta Cloudflare del titular. Los documentos referenciados se mantienen. No restaurar mientras los administradores estén capturando. No hay restauración automática desde la interfaz.

## Instalación independiente

Requiere cuenta propia Cloudflare, Worker HTTPS, D1 para accesos y R2 privado para libro y expedientes. No depende de ChatGPT para iniciar sesión o usarla. El ID D1 de `wrangler.jsonc` es un marcador: sustituirlo por el real.

```sh
npm ci
npx wrangler login
npx wrangler d1 create cartera-papa
npx wrangler r2 bucket create cartera-documentos
npx wrangler secret put SETUP_KEY
npm run db:migrate:remote
npm run deploy
```

La clave de instalación debe ser aleatoria de al menos 24 caracteres, nunca subirla a Git. Tras crear la cuenta principal, eliminarla con `npx wrangler secret delete SETUP_KEY`. Crear el segundo acceso desde la app. Las contraseñas requieren al menos 12 caracteres. Cambiar la contraseña cierra las sesiones de esa cuenta. El acreedor principal puede restablecer el segundo acceso; si pierde su propia contraseña, se requiere intervención del titular de Cloudflare (no existe recuperación por correo).

La aplicación requiere internet. En Android se instala desde el navegador HTTPS; en computadora se abre el mismo dominio. No hay APK. La publicación en Sites puede servir para revisión, pero una instalación independiente se despliega en la cuenta propia Cloudflare.

## Convertir una instalación anterior

Exportar D1 y conservar R2. Detener capturas en la versión anterior. Desplegar esta versión y entrar como acreedor principal. En **Accesos**, usar **Convertir cartera anterior a Excel** antes de capturar datos nuevos. La operación se niega si el libro ya tiene datos, conserva los IDs, documentos y movimientos, y no borra la base anterior. No convierte datos de otra cuenta ni importa Excel externos arbitrarios. Descargar el libro y conciliar saldos antes de reanudar la operación. Si los datos reales están en otra instalación o Excel, debe prepararse su importación por separado.

## Reglas de cobro

- Capital reduce el capital pendiente. En acuerdos sin interés cubre las cuotas.
- Interés cubre cargos periódicos y no reduce capital.
- Capital e interés requiere capturar ambas partes cuya suma coincide con el cobro.
- Sin desglose queda por conciliar; no confirma liquidación.
- Cuota pactada con interés representa un cargo de interés por fecha. El capital se abona aparte.
- Interés calculado permite tasa sobre capital inicial o saldo, y cargo mensual manual con prioridad. Quincenas son día 15 y último del mes; intervalos usan días/30. No se generan intereses moratorios ni capitalización automática.
- Los acuerdos con movimientos no se reescriben; una renegociación es un acuerdo nuevo.
- El balance es un control provisional de cartera, no saldo real de bancos ni balance contable definitivo. Faltan saldos iniciales, gastos, aportaciones y pasivos para ese fin.
- WhatsApp abre un borrador que el administrador revisa y envía.

## Validación local

Usar exclusivamente una base local descartable; nunca credenciales de producción.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run db:migrate:local
# .dev.vars: SETUP_KEY=<clave local aleatoria de 24 caracteres o más>
npm run test:api
npx playwright install chromium
npm run test:browser
```

API comprueba cuentas, cartera compartida entre dos administradores, autor de cambios, descarga privada de Excel, concurrencia, sobreabonos, reintentos, correcciones, anulación, cierre y expedientes. Codec comprueba tipos numéricos, centavos, Unicode, texto que parece fórmula, nulos y columnas después de Z. Navegador comprueba alta, cobro, corrección, filtros y reportes a 390 y 1365 px. Los tests agregan datos ficticios: reiniciar el almacenamiento local si se alcanza el límite de 50 deudores.
