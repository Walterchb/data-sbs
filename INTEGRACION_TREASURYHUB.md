# Treasury Hub · actualización 5

## Instalación

Este paquete actualiza el proyecto conciliado `data-sbs-ultra.zip` e incluye las adaptaciones de interfaz anteriores. Descomprime y reemplaza los archivos respetando las carpetas:

- `index.html`
- `assets/app.css`
- `assets/js/app.js`
- `assets/js/charts.js`
- `assets/js/data.js`
- `assets/js/tables.js`
- `tests/dom.test.mjs`
- `tests/refresh.test.mjs`

Conserva los demás archivos del proyecto, los datos y los workflows. Sube también las pruebas para que GitHub valide la interfaz actual. Después de publicar, recarga con Ctrl+F5 si el navegador conserva el diseño anterior.

Este `index.html` es el módulo Información Financiera SBS de `data-sbs`. No reemplaza la página de TC Contable.

## Cambios de esta revisión

- Cuentas SBS abre con «Jerarquía SBS», las ramas plegadas y las referencias B-2201/F9 ocultas. Los encabezados y totales del nivel superior permanecen visibles.
- «Mostrar referencias» / «Ocultar referencias» controla las referencias técnicas en todas las filas, también en las vistas históricas. Las referencias se mantienen en la exportación.
- «Expandir todo» cambia a «Plegar todo» al expandir. Actúa sobre el estado financiero seleccionado. Las flechas de cada rubro permiten recorrer la jerarquía por niveles.
- Filas compactas, sin la segunda línea técnica por defecto; los botones de cuenta tienen altura mínima de 24 px y el relleno vertical de las celdas es de 4 px. Las tendencias se reducen a 18 px de alto.
- Totales y grupos superiores en azul, principales con un color diferenciado, niveles intermedios con peso medio y hojas con texto más suave e indentación consistente. La selección se marca sin borrar el formato del nivel.
- Los órdenes por saldo y movimiento ordenan dentro de cada nivel, conservando padres e hijos juntos. El orden predeterminado sigue siendo la jerarquía SBS original.
- La búsqueda muestra temporalmente coincidencias y sus padres, incluso si estaban plegados. Las flechas quedan deshabilitadas durante la búsqueda para evitar indicar un plegado que oculta coincidencias; «Plegar todo» limpia la búsqueda y restaura la vista resumida. Al borrar la búsqueda manualmente se conserva el plegado anterior.
- «Principales» abre los grupos superiores y limita el detalle a sus rubros inmediatos.

Se conservan los nombres, vínculos entre cuentas, cifras, unidades y fuentes oficiales del catálogo conciliado. No se agregan categorías contables nuevas a partir del ejemplo visual.

## Funciones conservadas

- Calendario nativo con cortes mensuales; al seleccionar un día se utiliza el cierre del mes disponible.
- Gráficos ECharts con degradado, referencias, zoom y descarga; SVG de respaldo si no carga ECharts.
- Actualización directa, comprobación cada cinco minutos con la página visible, conservación de la selección histórica y de la versión anterior si una nueva publicación falla.
- Modo oscuro, navegación, datos conciliados, unidades y comparaciones por periodos exactos.

El motor ECharts, Manrope y Font Awesome se cargan desde los servicios usados por TC (jsDelivr, Google Fonts y cdnjs). La descarga de los reportes SBS continúa en GitHub Actions; el botón Actualizar consulta la publicación disponible.

## Verificación

14 pruebas automatizadas: cálculos, navegación, estado inicial plegado, referencias ocultas/visibles, expansión y plegado completo, orden de padres e hijos, ventanas de detalle, copia, fechas, actualización y gráficos. Validación del proyecto: referencias, sintaxis, 12 JSON, 67 periodos financieros y 7 reportes. Datos, configuración y scripts de conciliación conservados respecto al proyecto conciliado.

Esta revisión no incluye una comprobación visual en navegador real ni publicación en GitHub.
