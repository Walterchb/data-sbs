# Treasury Hub · actualización 11

## Instalación

Este paquete actualiza el proyecto conciliado `data-sbs-ultra.zip` e incluye las adaptaciones de interfaz anteriores. Descomprime y reemplaza los archivos respetando las carpetas:

- `index.html`
- `assets/app.css`
- `assets/js/app.js`
- `assets/js/charts.js`
- `assets/js/capital.js`
- `assets/js/data.js`
- `assets/js/tables.js`
- `tests/analytics.test.mjs`
- `tests/capital.test.mjs`
- `tests/dom.test.mjs`
- `tests/refresh.test.mjs`

Conserva los demás archivos del proyecto, los datos y los workflows. Sube también las pruebas para que GitHub valide la interfaz actual. Después de publicar, recarga con Ctrl+F5 si el navegador conserva el diseño anterior.

Este `index.html` es el módulo Información Financiera SBS de `data-sbs`. No reemplaza la página de TC Contable.

## Cambios de esta revisión

- Se elimina el panel separado «Composición del capital regulatorio · calculada».
- Los datos oficiales y calculados se reúnen en «Datos SBS y magnitudes calculadas», con columnas BanBif, MoM, YTD, YoY, Banca múltiple y periodo declarado. Se conservan las fórmulas en «Ver cálculo» y las series históricas de BanBif.
- YTD compara el valor con diciembre del año anterior al periodo declarado: variación porcentual para importes, puntos básicos para ratios y diferencia en veces para múltiplos. Si falta el corte exacto o existe una advertencia de fecha, se muestra —. La columna también está disponible en las demás tablas de fuentes regulatorias.
- La exportación CSV incluye YTD y, en Capital, el valor del sistema. Las filas calculadas continúan identificadas como tales.
- Se conserva el diseño anterior y la barra fija.

Los datos fuente SBS y las fórmulas de reconstrucción del capital no cambian.

## Funciones conservadas

- Calendario nativo con cortes mensuales; al seleccionar un día se utiliza el cierre del mes disponible.
- Gráficos ECharts con degradado, referencias, zoom y descarga; SVG de respaldo si no carga ECharts.
- Actualización directa, comprobación cada cinco minutos con la página visible, conservación de la selección histórica y de la versión anterior si una nueva publicación falla.
- Modo oscuro, navegación, datos conciliados, unidades y comparaciones por periodos exactos.

El motor ECharts, Manrope y Font Awesome se cargan desde los servicios usados por TC (jsDelivr, Google Fonts y cdnjs). La descarga de los reportes SBS continúa en GitHub Actions; el botón Actualizar consulta la publicación disponible.

## Verificación

16 pruebas automatizadas: composición del capital, datos ausentes y fechas incompatibles, cálculos, navegación, estado inicial plegado, referencias ocultas/visibles, expansión y plegado completo, orden de padres e hijos, ventanas de detalle, copia, fechas, actualización y gráficos. Validación del proyecto: referencias, sintaxis, 12 JSON, 67 periodos financieros y 7 reportes. Datos, configuración y scripts de conciliación conservados respecto al proyecto conciliado.

Esta revisión no incluye una comprobación visual en navegador real ni publicación en GitHub.
