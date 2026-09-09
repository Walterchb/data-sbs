# Treasury Hub · actualización 3

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

1. Se retira «FECHA SBS». El selector y las pestañas quedan alineados en una fila en escritorio. En móvil se mantienen las dos filas.
2. Las tarjetas KPI aprovechan todo el ancho interior: título e icono arriba, cifra alineada a la izquierda y unidad/variación repartidas abajo. Se reduce su altura mínima de 104 a 88 px en escritorio; en móvil, de 98 a 88 px.
3. Los títulos del detalle aparecen en mayúsculas y cian claro sobre el fondo azul marino.
4. Se retiran los títulos y valores duplicados encima de los gráficos. La etiqueta «Último» pasa a «Selección», que corresponde al punto final del rango mostrado; si falta ese dato, muestra un guion.
5. Los stats mantienen sus cálculos y se presentan como mini tarjetas. «Ver valores de la serie» abre un modal con las observaciones del rango, unidades y fechas declaradas por la fuente, cuando difieren. Tiene desplazamiento interno, cierre con botón/Escape y retorno del foco al botón de origen.
6. El botón de información abre su modal solo mediante clic o activación por teclado. Se elimina «Cómo se actualiza» de esa ventana. Las tarjetas KPI siguen mostrando detalle al pasar el mouse y al tocar.

## Funciones conservadas

- Calendario nativo con cortes mensuales; al seleccionar un día se utiliza el cierre del mes disponible.
- Gráficos ECharts con degradado, referencias, zoom y descarga; SVG de respaldo si no carga ECharts.
- Actualización directa, comprobación cada cinco minutos con la página visible, conservación de la selección histórica y de la versión anterior si una nueva publicación falla.
- Modo oscuro, navegación, datos conciliados, unidades y comparaciones por periodos exactos.

El motor ECharts, Manrope y Font Awesome se cargan desde los servicios usados por TC (jsDelivr, Google Fonts y cdnjs). La descarga de los reportes SBS continúa en GitHub Actions; el botón Actualizar consulta la publicación disponible.

## Verificación

14 pruebas automatizadas: cálculos, navegación, ventanas de detalle y series, información solo por clic, fechas, carga, actualización y configuración de gráficos. Validación del proyecto: referencias, sintaxis, 12 JSON, 67 periodos financieros y 7 reportes. Datos, configuración y scripts de conciliación conservados respecto al proyecto conciliado.

Esta revisión no incluye una comprobación visual en navegador real ni publicación en GitHub.
