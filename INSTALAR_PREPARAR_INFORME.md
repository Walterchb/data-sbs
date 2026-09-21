# Preparar Informe y gráficos guardados

## Instalar

1. Fetch / Pull en GitHub Desktop.
2. Copia el contenido de este ZIP al repositorio, respetando las carpetas.
3. Commit → Push. Después de la publicación, recarga con Ctrl+F5.

El paquete conserva los archivos de datos financieros. Incluye las mejoras anteriores.

## Preparar un informe

El botón del topbar ahora se llama **Preparar Informe**. Está disponible en escritorio y tablet de más de 760 px; no aparece en móvil. No requiere configurar márgenes, tipografías ni paginación.

1. **Cálculos:** elige una cuenta de Balance o Resultados, periodo y columna. Pulsa + o arrastra a la fórmula. La cuenta se resalta y muestra su letra antes del +. Puedes mezclar fechas: cada entrada conserva entidad, fecha, columna, fuente y valor.
2. Puedes cargar **26 cálculos predeterminados**, agrupados por capital, calidad de activos, coberturas, liquidez, solvencia contable, rentabilidad y eficiencia. Cargan fórmula y cuentas de la entidad, periodo y columna seleccionados. ROA y ROE analíticos usan utilidad de 12 meses y promedio de 13 cierres: no se identifican como ratios publicados por SBS. Si falta una base, se avisa sin reemplazarla por cero.
3. Escribe una operación con +, -, *, /, ^ y paréntesis. Para un ratio usa `a/b` y formato Porcentaje; no multipliques también por 100. Pon nombre al cálculo y un **Detalle** opcional, que siempre se muestra a su lado en la tabla y pulsa **Agregar al informe**. También puedes agregar una nota general a la tabla de resultados.
4. **Contenido y revisión:** completa nombre, fecha, subtítulo y autor opcional. Agrega los gráficos guardados y las tablas disponibles en la vista del dashboard. Puedes editar títulos, ordenar o quitar adjuntos, editar resultados y añadir una conclusión.
5. Usa **Vista previa PDF**, **Descargar PDF** o **Descargar Excel**. También puedes exportar un informe de gráficos y tablas sin cálculos.

Las cuentas monetarias del editor se expresan en S/ miles, incluido ME como equivalente en soles. Balance contiene saldos al cierre y Resultados contiene acumulados YTD. Se conservan los signos de la fuente. Los resultados se muestran con **2 decimales**, pero los cálculos y datos de origen conservan su precisión.

## Guardar gráficos y añadir tablas

- En **Preparar imagen**, pulsa **Guardar gráfico**. La sección **6 · Guardados** muestra los gráficos de la sesión y permite eliminarlos. En Preparar Informe → Contenido, elige el gráfico y pulsa Agregar gráfico.
- El PDF convierte el SVG guardado en trazos y texto seleccionable: no rasteriza el gráfico. Conserva líneas, etiquetas, degradados, patrones y anotaciones. Las tipografías locales son las mismas en la vista previa, la imagen y el PDF. Se corrigen pesos y posiciones de texto según las medidas del navegador. Solo las sombras de desenfoque utilizan una capa decorativa transparente; las series, etiquetas y textos continúan siendo vectoriales. Un SVG con imágenes externas produce un aviso; no se sustituye silenciosamente por un PNG. Excel conserva la composición como PNG sin pérdida, limitado a 2400 px en el lado mayor.
- Las tablas se capturan con sus filas actualmente visibles, filtros y unidades. Las filas plegadas no se incorporan. Se excluyen columnas que solo tienen gráficos sin valores de texto.
- Para añadir tablas de otras secciones, cierra el informe, navega a esa sección y vuelve a abrirlo. El borrador sigue ahí. Las tablas son instantáneas y no cambian al cambiar la entidad o fecha del dashboard.
- Los adjuntos ya agregados al informe se mantienen aunque quites el gráfico de Guardados.

**El borrador y los gráficos guardados se eliminan al recargar o cerrar la página.** Cerrar los modales no los elimina. Descarga antes de recargar. Los archivos incluyen el contenido agregado, no el cálculo que todavía esté en edición.

Límites para cuidar memoria: 20 gráficos guardados / 40 MB en la galería; 30 adjuntos / 25 MB de imágenes en el informe; 1000 filas por tabla; 60 cálculos y 80 variables por cálculo.

## Descargas

**PDF:** elige **Corporativo**, **Editorial** (marfil, reglas finas y acentos verdes) o **Paper**. Todos incluyen portada con cuadrícula desvanecida de líneas discontinuas y autor en mayúsculas, resultados con Detalle junto al nombre, nota general, índice enlazado inmediatamente después de la portada, contenido y anexos identificados. Las portadas tienen reglas y acentos propios de cada estilo; el índice distingue secciones numeradas y subsecciones con conexiones discontinuas.

**Contenido:** cada elemento tiene un número de página. Se agrupan visualmente por página y puedes cambiar su orden con las flechas. Máximo cuatro por página; la distribución se ajusta automáticamente. Ya no se elige entre modos de distribución.

Los encabezados de Editorial y Paper tienen reglas arriba y abajo, texto ligeramente mayor y centrado horizontal y verticalmente; los valores numéricos se mantienen alineados a la derecha. Las tablas que no caben completas tienen una vista parcial identificada y una referencia enlazada a su anexo completo. El respaldo reúne las fórmulas y una lista única de cuentas y constantes, agrupada por entidad, cierre y unidad. No repite los resultados ni el Detalle. Las constantes y las letras se muestran en mayúsculas. Las referencias enlazan los archivos de origen sin mostrar URLs largas. Las tablas completas idénticas comparten un único anexo. Cada página incluye un enlace para volver al índice. Puedes desactivar los anexos de cálculos; las continuaciones de tablas se conservan.

**Capital:** APR, capital global, CET1/APR, TIER 1/APR y reconstrucción de patrimonio efectivo total, TIER 1, TIER 2 y su participación. Se utiliza B-2402 de la entidad y el cierre exactos; no se mezcla un mes anterior sin avisar. Los importes son S/ miles. Si seleccionas MN o ME, el cálculo indica que requiere Total.

**Referencias:** `F124` era una abreviación de fila, no la celda F124. Ahora se indica explícitamente B-2201, hoja 1 (Balance) o 2 (Resultados) y fila. La columna monetaria aparece por separado. Se contrastaron las 149 filas del catálogo con archivos originales de 2021 y 2026. Capital identifica fuente y métrica; no inventa coordenadas de Excel que no contiene el conjunto de datos compacto.


**Excel:** Revisión con fórmulas nativas, Datos con las entradas editables y fechas reales, y hojas adicionales para cada gráfico o tabla. Las tablas son celdas editables; los gráficos conservan la composición guardada como imágenes. Los resultados recalculan al modificar las celdas de Datos. Formatos de dos decimales, encabezados fijos y ajuste de impresión al ancho de página.

## Otras mejoras

- Buscador más compacto, con accesos a consultas frecuentes y resultados jerarquizados; conserva filtro por tipo y coincidencia exacta.
- El estado de sincronización dice **Actualizado**. Se conservan los avisos y errores cuando corresponde.

## Validación

77 pruebas JavaScript. Comprobación en navegador de predeterminados, capital, Detalle, notas, asignación de páginas y exportaciones. Los tres estilos PDF se renderizaron y revisaron; extracción de títulos, fechas y valores de los gráficos confirmada, con trazos vectoriales y sin rasterizar el contenido del gráfico. Se compararon imágenes guardadas y PDFs renderizados con cuatro estilos y con fondo, patrón y sombra. Excel conserva fórmulas nativas y resultados con dos decimales; no se probó en Microsoft Excel de escritorio.
