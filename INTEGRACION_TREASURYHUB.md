# Treasury Hub · actualización 6

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

- «Resultado Neto del Ejercicio» tiene un formato diferenciado en balance y resultados: fondo propio, texto destacado y doble línea superior.
- Las subcuentas usan un pequeño punto de Font Awesome en lugar de «↳». Los grupos conservan los controles para expandir y plegar.
- La fila seleccionada tiene el borde activo únicamente a la izquierda. El relleno #e9bc0e se aplica detrás del texto y las cifras, sin colorear todo el bloque, tanto en la vista mensual como en las históricas.
- Se conserva el inicio con jerarquía SBS, ramas plegadas y referencias ocultas, además de las filas compactas, el botón Mostrar/Ocultar referencias y el control Expandir/Plegar todo.

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
