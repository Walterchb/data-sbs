# Treasury Hub · actualización 4

## Instalación

Este paquete actualiza el proyecto conciliado `data-sbs-ultra.zip` e incluye las adaptaciones de interfaz anteriores. Descomprime y reemplaza los archivos respetando las carpetas:

- `index.html`
- `assets/app.css`
- `assets/js/app.js`
- `assets/js/charts.js`
- `assets/js/data.js`
- `tests/dom.test.mjs`
- `tests/refresh.test.mjs`

Conserva los demás archivos del proyecto, los datos y los workflows. Sube también las pruebas para que GitHub valide la interfaz actual. Después de publicar, recarga con Ctrl+F5 si el navegador conserva el diseño anterior.

Este `index.html` es el módulo Información Financiera SBS de `data-sbs`. No reemplaza la página de TC Contable.

## Cambios de esta revisión

1. Stats sin esquinas redondeadas y con borde superior único #08283f.
2. Mínimo y máximo permanecen en la leyenda del gráfico. Las mini tarjetas muestran cambio del rango (absoluto; en pb para ratios), periodos al alza, CAGR cuando corresponde y observaciones. La utilidad acumulada usa comparaciones interanuales para evitar mezclar diciembre con enero. Los periodos sin base válida se excluyen del recuento; los conflictos entre fecha del archivo y fecha declarada suspenden las nuevas comparaciones.
3. Etiquetas de la leyenda sin bordes redondeados. Al seleccionar un punto, el tooltip muestra el indicador con un marcador del color de su línea; promedio, máximo y mínimo llevan también sus colores. El mes aparece en mayúsculas y cian claro.
4. «Ver valores de la serie» está junto a «Máx.» en la fila del rango. Su modal tiene un botón de copia a la izquierda de cerrar. Copia periodo, indicador, valor y periodo declarado como columnas separadas por tabulaciones, con dos decimales y sin separadores de miles ni símbolos monetarios. Los importes están en millones y los ratios conservan su unidad indicada en la cabecera. El separador decimal sigue el idioma del navegador; las celdas sin valor quedan vacías. Pega en Excel con Ctrl+V.

La copia requiere permiso del navegador para escribir en el portapapeles. Si no está disponible la API moderna se intenta la copia compatible; ante un bloqueo se muestra un mensaje y la tabla sigue disponible para selección manual.

## Funciones conservadas

- Calendario nativo con cortes mensuales; al seleccionar un día se utiliza el cierre del mes disponible.
- Gráficos ECharts con degradado, referencias, zoom y descarga; SVG de respaldo si no carga ECharts.
- Actualización directa, comprobación cada cinco minutos con la página visible, conservación de la selección histórica y de la versión anterior si una nueva publicación falla.
- Modo oscuro, navegación, datos conciliados, unidades y comparaciones por periodos exactos.

El motor ECharts, Manrope y Font Awesome se cargan desde los servicios usados por TC (jsDelivr, Google Fonts y cdnjs). La descarga de los reportes SBS continúa en GitHub Actions; el botón Actualizar consulta la publicación disponible.

## Verificación

14 pruebas automatizadas: cálculos, navegación, ventanas de detalle y series, información solo por clic, fechas, carga, actualización y configuración de gráficos. Validación del proyecto: referencias, sintaxis, 12 JSON, 67 periodos financieros y 7 reportes. Datos, configuración y scripts de conciliación conservados respecto al proyecto conciliado.

Esta revisión no incluye una comprobación visual en navegador real ni publicación en GitHub.
