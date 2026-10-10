# Cartera familiar (versión independiente)

Aplicación privada para administrar préstamos y cobros desde navegador de computadora o como aplicación instalable desde el navegador del teléfono. Los documentos del expediente se guardan en un bucket R2 privado; se sirven solo tras verificar la sesión y propiedad del préstamo. No utiliza ChatGPT para autenticación, datos, hosting ni uso diario.

## Estado de esta entrega

Incluye acceso con contraseña y una cuenta inicial, panel y reportes existentes, expedientes por persona, documentos PDF/JPG/PNG (10 MB), mensaje de WhatsApp que el usuario confirma y aplicación web instalable. El balance existente es **provisional** porque los abonos del Excel original aún requieren clasificar y no hay saldos iniciales contables. La importación de la cartera real está pendiente y no hay servidor público configurado.

## Preparación de Cloudflare

Se requiere cuenta propia de Cloudflare y una dirección HTTPS (puede ser la dirección workers.dev de Cloudflare) para usar desde varios dispositivos. Configurar una base D1 y bucket R2 privado. Copiar sus identificadores al archivo `wrangler.jsonc`, cuyo `database_id` se entrega como marcador y cuyo bucket se llama `cartera-documentos`. Habilitar R2 y establecer un secreto `SETUP_KEY` aleatorio de al menos 24 caracteres con Wrangler. **No incluir esta clave en Git ni en el navegador de otras personas.**

```sh
npm ci
npx wrangler login
npx wrangler d1 create cartera-papa
npx wrangler r2 bucket create cartera-documentos
npx wrangler secret put SETUP_KEY
```

Al crear D1, copiar el identificador real en `wrangler.jsonc`. Para una base nueva, aplicar las migraciones con el registro de Wrangler; este comando recuerda cuáles ya se ejecutaron. No usarlo sobre una base que recibió SQL manualmente sin conciliar antes su historial:

```sh
npm run db:migrate:remote
npm run deploy
```

Para la primera instalación, ir a `/ingresar`, dar correo, contraseña fuerte y la clave `SETUP_KEY`. Después, borrar el secreto de instalación de Cloudflare. No entregar este acceso a personas ajenas a la familia. Configurar backups de D1 y R2, políticas de retención y dominio propio antes de subir documentos reales.

## Instalar en el celular

Abrir el dominio HTTPS en Chrome para Android y usar «Instalar aplicación» o «Agregar a pantalla principal». En Windows, abrir el mismo dominio desde el navegador. Los datos requieren internet; la app no guarda expedientes privados para uso sin conexión.

## Migración

La app privada anterior y su base no se modifican. No se incluyó el Excel ni el JSON con datos reales en este proyecto. Para llevar la cartera del papá hay que exportarla o volver a leer el Excel original y asociarla con la cuenta inicial; validar préstamos y abonos sin desglose antes de activar balances definitivos. No ejecutar migraciones SQL sobre la app privada anterior.

### Preparar la migración anterior

Una vez creada la cuenta inicial y la base nueva, generar el SQL en una carpeta privada **fuera del proyecto**:

```sh
python3 tools/preparar_migracion.py --source-json /ruta/privada/import-source.json --out /ruta/privada/migracion-cartera.sql
```

Revisar el archivo y ejecutar una sola vez con `wrangler d1 execute cartera-papa --remote --file /ruta/privada/migracion-cartera.sql`. El SQL contiene nombres, teléfonos y condiciones reales: no subirlo al repositorio ni compartirlo. El importador conserva las 10 entradas de cobro como `unverified` hasta que papá las clasifique. Para otros Excel se necesitará un importador general con vista previa.

## Continuación del 24 de septiembre de 2026

Se recuperó el código del paquete anterior: el repositorio solo tenía un README.
Se corrigieron las fechas imposibles, los montos con más de dos decimales,
los vencimientos después de pagos adelantados y el calendario sin intereses,
que ahora usa los abonos a capital y reconoce su liquidación. La creación de
persona y préstamo es atómica y devuelve los valores completos de la base.
El nombre y teléfono se actualizan visualmente en todos sus préstamos.

La configuración de compatibilidad está alineada con el runtime fijado en
package-lock.json. El directorio de migraciones está configurado explícitamente.

### Comprobación local

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run db:migrate:local
```

Crear `.dev.vars` (excluido de Git) con `SETUP_KEY=` seguido de una clave
aleatoria de al menos 24 caracteres y ejecutar `node scripts/smoke-test.mjs`.
Esta prueba inicia su propio servidor local y crea exclusivamente datos
ficticios en la base local, incluidos dos préstamos por persona y un PDF de
prueba. No usar esa cuenta de prueba en producción.

### Pendientes para uso real

- Autenticar Cloudflare, crear D1/R2 e insertar el ID real de D1.
- Publicar, crear la cuenta familiar y comprobar acceso desde celular y PC.
- Importar y conciliar los datos reales; no están en este repositorio.
- La instalación actual es una aplicación web: todavía no se ha generado APK.
- Los cobros mixtos requieren clasificación; no se infiere su parte de capital.


## Cobranza e integridad (octubre de 2026)

El panel agrupa por persona, conserva el detalle de cada préstamo y muestra:
capital pendiente, importe exigible al corte (atrasado + vence hoy), atraso,
primer cobro pendiente, cobros recibidos, interés identificado, importes por
conciliar y porcentaje de capital recuperado. Incluye filtros por vencimiento,
atraso, próximos siete días, liquidación y revisión. Los reportes y expedientes
usan el mismo cálculo. La actualización se realiza al recuperar foco y cada
45 segundos mientras la aplicación esté visible.

### Aplicación de pagos

- Capital: reduce el capital pendiente; en préstamos sin interés también cubre cuotas.
- Interés: cubre cargos periódicos en préstamos con interés; no reduce capital.
- Capital e interés: se capturan ambas partes y su suma debe coincidir con el cobro.
- Sin desglose / por confirmar: queda pendiente de conciliación; no confirma cuotas.

El importe del último cobro y de los recordatorios corresponde al saldo real,
no a la cuota original. No se generan recordatorios si hay datos por revisar,
si el préstamo está liquidado o si está cerrado. WhatsApp requiere que el
usuario revise y envíe el mensaje.

### Modalidades de acuerdo

Se conserva la modalidad **cuota pactada** de los préstamos anteriores. En
préstamos con interés, esa cuota es el cargo de interés por fecha; los abonos
a capital se registran por separado. Para un acuerdo basado en porcentaje,
seleccionar **interés mensual dividido por periodo**:

- El cargo mensual manual tiene prioridad sobre la tasa.
- Tasa sobre capital inicial: usa el capital original.
- Tasa sobre saldo: usa el capital pendiente antes del día del vencimiento.
- Calendario 15/fin de mes: reparte el cargo mensual entre ambas fechas,
  conservando el centavo restante en el fin de mes.
- Intervalo: cargo mensual × días del intervalo ÷ 30, redondeado a centavos.
- No se capitalizan intereses ni se cobran intereses moratorios automáticamente.
- La primera fecha es una fecha de cargo pactada; no se prorratea un periodo
  inicial incompleto. La fecha de entrega permite validar el orden de los cobros.
- Al devolver el capital completo se detienen cargos posteriores a ese día;
  los cargos de esa fecha y anteriores deben quedar pagados para liquidar.
- El vencimiento final opcional exige todo el capital restante y detiene
  nuevos cargos periódicos después de esa fecha.

Son reglas explícitas del sistema que deben coincidir con el acuerdo real.
No se infieren condiciones a partir de una nota libre. Las cuotas y acuerdos
con movimientos ya confirmados no se reescriben retroactivamente. Una
renegociación se registra como nuevo acuerdo, conservando el anterior.
Los calendarios importados aún desconocidos pueden confirmarse desde Editar.

### Correcciones y trazabilidad

Movimientos permite corregir monto, fecha, nota y aplicación con motivo. Una
anulación conserva el original y lo excluye de saldos. Para un préstamo
seleccionado por error, anular y registrar el cobro en el correcto. La bitácora
muestra antes/después de pagos, condiciones, datos de la persona y cierres.
Se conserva también en la base mediante triggers atómicos. Las versiones
impiden que un dispositivo sobrescriba cambios de otro.

Los reintentos de alta usan una clave de idempotencia. El navegador conserva
la clave de una operación pendiente en la pestaña: después de un fallo de red,
volver a enviar los mismos datos reutiliza la operación y no duplica el cobro.
Un nuevo envío legítimo obtiene otra clave después de confirmar el anterior.

### Actualización de una instalación existente

La migración `0007_integridad_cobranza.sql` agrega importes enteros en centavos,
partes de capital/interés, idempotencia, versiones, fechas y bitácora. Conserva
las tablas y movimientos anteriores; **no corrige ni elimina automáticamente
los sobreabonos históricos**. El panel los marca para revisión. No hacer
escrituras con una versión anterior del servidor tras aplicar esta migración:
las nuevas protecciones exigirán los campos en centavos.

Antes de actualizar producción, exportar D1, conservar R2, detener capturas,
aplicar las migraciones pendientes y desplegar esta versión en la misma ventana.
Verificar saldos y acceso antes de reabrir capturas. Los backups son necesarios
para volver al servidor anterior; no basta desplegar su código tras migrar.
El ID de D1 del repositorio sigue siendo un marcador: la configuración real
se realiza en la cuenta de Cloudflare de la familia. No se ha publicado una
instancia ni cargado datos reales con estas pruebas.

### Pruebas

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run db:migrate:local
# .dev.vars contiene una SETUP_KEY local ficticia, nunca una clave real.
npm run test:api
npx playwright install chromium
npm run test:browser
```

Las pruebas de navegador crean préstamos ficticios de una persona nueva y
existente, cobran, revisan el importe efectivo del recordatorio, corrigen el
movimiento, usan filtros y revisan la consolidación del reporte en 390 y 1365 px.
Ejecutarlas únicamente en una base local descartable. No usar la cuenta de
prueba en producción. La prueba API cubre también concurrencia, reintentos,
fechas futuras, desglose, anulación, edición atómica, conflictos de versión,
cierre/reapertura y privacidad. Las pruebas no envían mensajes de WhatsApp.
