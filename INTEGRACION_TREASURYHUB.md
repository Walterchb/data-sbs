# Treasury Hub · actualización 10

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

- Indicadores y riesgos → Capital incorpora una tabla comparativa de BanBif y la banca múltiple con patrimonio efectivo total, TIER 1, TIER 2 y la participación de cada nivel.
- Son magnitudes calculadas con los APR y ratios del B-2402, identificadas como tales. Se conserva toda la precisión de origen y se redondea al mostrar: TIER 1 = APR × (TIER 1/APR) / 100; patrimonio efectivo = APR × RCG / 100; TIER 2 = patrimonio efectivo − TIER 1.
- Cada nueva magnitud de BanBif tiene serie histórica, estadísticas, comparaciones por periodos exactos, modal de valores, copia para Excel y exportación CSV. El cálculo se actualiza con el corte seleccionado y las futuras publicaciones.
- «Ver cálculo» explica las fórmulas y distingue el capital regulatorio del patrimonio contable. Los cálculos muestran — si faltan entradas, las fechas no coinciden o los valores son inconsistentes; no se rellenan periodos antiguos sin APR/TIER 1.
- Junio de 2026: BanBif muestra patrimonio efectivo S/ 3,072.21 MM, TIER 1 S/ 2,227.47 MM, TIER 2 S/ 844.74 MM y participación TIER 1 de 72.50%; sistema: 76.76% de TIER 1.
- Se conserva el diseño anterior, incluida la barra fija con Estado y Vista en la misma fila en escritorio.

Los archivos SBS originales y la conciliación no se modifican: los cálculos se agregan al cargar Capital.

## Funciones conservadas

- Calendario nativo con cortes mensuales; al seleccionar un día se utiliza el cierre del mes disponible.
- Gráficos ECharts con degradado, referencias, zoom y descarga; SVG de respaldo si no carga ECharts.
- Actualización directa, comprobación cada cinco minutos con la página visible, conservación de la selección histórica y de la versión anterior si una nueva publicación falla.
- Modo oscuro, navegación, datos conciliados, unidades y comparaciones por periodos exactos.

El motor ECharts, Manrope y Font Awesome se cargan desde los servicios usados por TC (jsDelivr, Google Fonts y cdnjs). La descarga de los reportes SBS continúa en GitHub Actions; el botón Actualizar consulta la publicación disponible.

## Verificación

16 pruebas automatizadas: composición del capital, datos ausentes y fechas incompatibles, cálculos, navegación, estado inicial plegado, referencias ocultas/visibles, expansión y plegado completo, orden de padres e hijos, ventanas de detalle, copia, fechas, actualización y gráficos. Validación del proyecto: referencias, sintaxis, 12 JSON, 67 periodos financieros y 7 reportes. Datos, configuración y scripts de conciliación conservados respecto al proyecto conciliado.

Esta revisión no incluye una comprobación visual en navegador real ni publicación en GitHub.
