# Treasury Hub · actualización 7

## Instalación

Este paquete actualiza el proyecto conciliado `data-sbs-ultra.zip` e incluye las adaptaciones de interfaz anteriores. Descomprime y reemplaza los archivos respetando las carpetas:

- `index.html`
- `assets/app.css`
- `assets/js/app.js`
- `assets/js/charts.js`
- `assets/js/data.js`
- `assets/js/tables.js`
- `tests/analytics.test.mjs`
- `tests/dom.test.mjs`
- `tests/refresh.test.mjs`

Conserva los demás archivos del proyecto, los datos y los workflows. Sube también las pruebas para que GitHub valide la interfaz actual. Después de publicar, recarga con Ctrl+F5 si el navegador conserva el diseño anterior.

Este `index.html` es el módulo Información Financiera SBS de `data-sbs`. No reemplaza la página de TC Contable.

## Cambios de esta revisión

- Fuentes ya no aparece en la navegación principal. Se accede desde Información → Ver fechas por fuente; se conservan la vista y sus enlaces oficiales.
- El encabezado del detalle de Cuentas SBS muestra «Julio 2026 · Saldo al cierre» o «Julio 2026 · Acumulado enero al mes de corte», según la fecha y cuenta seleccionadas. Debajo aparece la ruta jerárquica de la cuenta, con separadores de Font Awesome.
- Los valores de detalle usan el mismo diseño de tarjetas que las estadísticas: borde superior #08283f, esquinas rectas, fondo y tipografía consistentes, y dos columnas en móvil.
- Las notas debajo de los gráficos conservan las aclaraciones de unidades y comparabilidad, sin enlaces al archivo SBS.
- Se mantienen las mejoras anteriores: jerarquía SBS plegada por defecto, referencias ocultas, filas compactas, resultado neto diferenciado y selección con borde izquierdo y resaltado amarillo detrás del texto y las cifras.

Se conservan los nombres, vínculos entre cuentas, cifras, unidades y fuentes oficiales del catálogo conciliado.

## Funciones conservadas

- Calendario nativo con cortes mensuales; al seleccionar un día se utiliza el cierre del mes disponible.
- Gráficos ECharts con degradado, referencias, zoom y descarga; SVG de respaldo si no carga ECharts.
- Actualización directa, comprobación cada cinco minutos con la página visible, conservación de la selección histórica y de la versión anterior si una nueva publicación falla.
- Modo oscuro, navegación, datos conciliados, unidades y comparaciones por periodos exactos.

El motor ECharts, Manrope y Font Awesome se cargan desde los servicios usados por TC (jsDelivr, Google Fonts y cdnjs). La descarga de los reportes SBS continúa en GitHub Actions; el botón Actualizar consulta la publicación disponible.

## Verificación

14 pruebas automatizadas: cálculos, navegación, estado inicial plegado, referencias ocultas/visibles, expansión y plegado completo, orden de padres e hijos, ventanas de detalle, copia, fechas, actualización y gráficos. Validación del proyecto: referencias, sintaxis, 12 JSON, 67 periodos financieros y 7 reportes. Datos, configuración y scripts de conciliación conservados respecto al proyecto conciliado.

Esta revisión no incluye una comprobación visual en navegador real ni publicación en GitHub.
