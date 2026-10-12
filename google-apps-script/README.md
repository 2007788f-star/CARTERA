# CARTERA: prueba con Google Sheets y Apps Script

Variante independiente de Cloudflare. Los datos se guardan en Google Sheets, la interfaz se sirve desde Apps Script y los expedientes se abren por enlaces de carpetas privadas de Drive. No usa servicios de pago ni crea suscripciones; está sujeta a las cuotas gratuitas de Google. No contiene datos reales ni importa automáticamente la instalación anterior.

## Preparar la prueba

1. Entrar en https://script.google.com con la cuenta titular y crear un proyecto.
2. Copiar `Code.gs` al archivo de código del proyecto y crear un archivo HTML **Index** con `Index.html`.
3. En Configuración del proyecto, habilitar la visualización de `appsscript.json` y pegar el manifiesto suministrado.
4. En Propiedades del script, agregar `ADMIN_EMAILS` con exactamente los dos correos Google autorizados, separados por coma. No publicar los correos en GitHub.
5. Ejecutar `instalarCartera` desde el editor y autorizar el acceso a Sheets y al correo del usuario. La función crea una hoja de prueba y guarda su ID en `SPREADSHEET_ID`. No crea carpetas ni comparte archivos automáticamente.
6. Abrir la hoja creada y compartirla solo con el segundo administrador como editor. Crear una carpeta privada de expedientes en Drive y compartirla con ambos administradores. No activar «cualquiera con el enlace» en la hoja ni en las carpetas.
7. Implementar como **Aplicación web**, ejecutar como **usuario que accede**, acceso **cualquier usuario con cuenta Google**. Nunca ejecutar como propietario: en cuentas personales el correo del visitante puede no estar disponible y la app denegará el acceso. Cada administrador debe autorizar la app con su cuenta. La URL permite llegar al acceso, pero cada operación vuelve a verificar la lista de los dos correos.
8. Abrir la URL de implementación en computadora y teléfono. Puede aparecer la advertencia de aplicación no verificada de Google durante una prueba personal. No distribuirla a terceros.

La variante deniega acceso si Google no entrega el correo autorizado; no acepta correos enviados por el navegador como identidad. No envía tokens OAuth al HTML. El primer acceso de ambas cuentas y la configuración de despliegue requieren validación real en Google; las pruebas locales no acreditan ese paso.

## Prueba de aceptación

Crear «Deudor de prueba» por $250 sin interés, cuota $100. Desde la segunda cuenta registrar $100 a capital y verificar $150 pendiente en ambas. Reintentar el mismo cobro no debe duplicarlo. Corregirlo a $50 con motivo y verificar $200 pendiente. Abrir historial y confirmar el correo autor. Agregar un enlace a carpeta Drive y abrirlo desde ambas cuentas. Probar que una tercera cuenta no accede. Revisar desde móvil y computadora y descargar la hoja por Archivo > Descargar > Microsoft Excel.

La app contiene alta de personas/préstamos, cobros, correcciones, anulaciones, acuerdos editables con protección de condiciones, cierres/reaperturas, filtros, totales, avance de capital, historial y enlace de expediente. WhatsApp abre un mensaje que el administrador envía. No incluye aún gráficas, importador de Excel, balance contable completo ni gestión de accesos desde la interfaz: los dos correos se configuran en propiedades.

## Integridad de la hoja

Cada captura toma un bloqueo del proyecto, lee una versión íntegra, valida y escribe una nueva versión. Solo al terminar cambia una celda de Control que indica la versión activa. Si se interrumpe antes, la versión anterior sigue siendo la válida. Se conservan las últimas versiones internas; no sustituyen un respaldo externo periódico.

Las hojas Deudores, Prestamos, Cobros e Historial son vistas para consultar y descargar. Los datos autoritativos están en las hojas `_datos_*` indicadas por Control. No editar manualmente estas hojas; capturar desde la app. Los editores de la hoja pueden alterar datos directamente y deben ser personas de confianza. No se admite cambiar `SPREADSHEET_ID` a una hoja ajena al esquema.

Los links de expediente son compartidos por persona entre sus préstamos. Cargar archivos se hace en Drive. La app no recibe ni almacena documentos. Esta prueba arranca vacía: los datos reales requieren una migración posterior revisada, no copiar y pegar sobre las hojas de Control.

## Desarrollo

```sh
node scripts/build-google.mjs
node scripts/test-google.mjs
npm run typecheck
npm test
```

El generador empaqueta las reglas existentes de CARTERA en `Code.gs`. La prueba local simula Sheets, LockService y dos cuentas; comprueba identidad, pagos, sobreabonos, reintentos, conflictos de revisión, historial, enlace seguro y conservación del estado ante escritura interrumpida. También se conservan las pruebas de calendario y Excel. Para actualizar una implementación real hay que crear una versión nueva en Apps Script.
