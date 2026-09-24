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
