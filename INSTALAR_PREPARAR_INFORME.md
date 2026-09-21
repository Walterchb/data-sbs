# Preparar Informe y gráficos guardados

## Instalar

1. Fetch / Pull en GitHub Desktop.
2. Copia el contenido de este ZIP al repositorio, respetando las carpetas.
3. Commit → Push. Después de la publicación, recarga con Ctrl+F5.

El paquete conserva los archivos de datos financieros. Incluye las mejoras anteriores.

## Preparar un informe

El botón del topbar ahora se llama **Preparar Informe**. Está disponible en escritorio y tablet de más de 760 px; no aparece en móvil. No requiere configurar márgenes, tipografías ni paginación.

1. **Cálculos:** elige una cuenta de Balance o Resultados, periodo y columna. Pulsa + o arrastra a la fórmula. La cuenta se resalta y muestra su letra antes del +. Puedes mezclar fechas: cada entrada conserva entidad, fecha, columna, fuente y valor.
2. Puedes cargar **18 cálculos predeterminados**, agrupados por calidad de activos, coberturas, liquidez, solvencia contable, rentabilidad y eficiencia. Cargan fórmula y cuentas de la entidad, periodo y columna seleccionados. ROA y ROE analíticos usan utilidad de 12 meses y promedio de 13 cierres: no se identifican como ratios publicados por SBS. Si falta una base, se avisa sin reemplazarla por cero.
3. Escribe una operación con +, -, *, /, ^ y paréntesis. Para un ratio usa `a/b` y formato Porcentaje; no multipliques también por 100. Pon nombre al cálculo, elige comentario junto al nombre o como **Nota de tabla** y pulsa **Agregar al informe**. También puedes agregar una nota general a la tabla de resultados.
4. **Contenido y revisión:** completa nombre, fecha, subtítulo y autor opcional. Agrega los gráficos guardados y las tablas disponibles en la vista del dashboard. Puedes editar títulos, ordenar o quitar adjuntos, editar resultados y añadir una conclusión.
5. Usa **Vista previa PDF**, **Descargar PDF** o **Descargar Excel**. También puedes exportar un informe de gráficos y tablas sin cálculos.

Las cuentas monetarias del editor se expresan en S/ miles, incluido ME como equivalente en soles. Balance contiene saldos al cierre y Resultados contiene acumulados YTD. Se conservan los signos de la fuente. Los resultados se muestran con **2 decimales**, pero los cálculos y datos de origen conservan su precisión.

## Guardar gráficos y añadir tablas

- En **Preparar imagen**, pulsa **Guardar gráfico**. La sección **6 · Guardados** muestra los gráficos de la sesión y permite eliminarlos. En Preparar Informe → Contenido, elige el gráfico y pulsa Agregar gráfico.
- El PDF convierte el SVG guardado en trazos y texto seleccionable: no rasteriza el gráfico. Conserva líneas, etiquetas, degradados, patrones y anotaciones. Las sombras de desenfoque se omiten porque requieren un filtro de imagen. Un SVG con imágenes externas produce un aviso; no se sustituye silenciosamente por un PNG. Excel conserva la composición como PNG sin pérdida, limitado a 2400 px en el lado mayor.
- Las tablas se capturan con sus filas actualmente visibles, filtros y unidades. Las filas plegadas no se incorporan. Se excluyen columnas que solo tienen gráficos sin valores de texto.
- Para añadir tablas de otras secciones, cierra el informe, navega a esa sección y vuelve a abrirlo. El borrador sigue ahí. Las tablas son instantáneas y no cambian al cambiar la entidad o fecha del dashboard.
- Los adjuntos ya agregados al informe se mantienen aunque quites el gráfico de Guardados.

**El borrador y los gráficos guardados se eliminan al recargar o cerrar la página.** Cerrar los modales no los elimina. Descarga antes de recargar. Los archivos incluyen el contenido agregado, no el cálculo que todavía esté en edición.

Límites para cuidar memoria: 20 gráficos guardados / 40 MB en la galería; 30 adjuntos / 25 MB de imágenes en el informe; 1000 filas por tabla; 60 cálculos y 80 variables por cálculo.

## Descargas

**PDF:** elige **Corporativo**, **Editorial** (marfil, reglas finas y acentos verdes) o **Paper**. Todos incluyen portada con cuadrícula sutil y autor en mayúsculas, resumen con comentarios junto al nombre, notas, índice con páginas, contenido y anexos identificados.

Distribuciones: un elemento por página, dos lado a lado, cuatro en cuadrícula, dos gráficos + dos tablas, o asignación manual de páginas. Las flechas reordenan elementos; en modo manual asigna la página de contenido (máximo cuatro elementos). Las tablas que no caben completas tienen una vista parcial identificada y una referencia a su anexo completo. Puedes desactivar los anexos de cálculos; las continuaciones necesarias de las tablas se conservan. Los encabezados se repiten y las tablas anchas se dividen por grupos de columnas conservando el rubro.

**Excel:** Revisión con fórmulas nativas, Datos con las entradas editables y fechas reales, y hojas adicionales para cada gráfico o tabla. Las tablas son celdas editables; los gráficos conservan la composición guardada como imágenes. Los resultados recalculan al modificar las celdas de Datos. Formatos de dos decimales, encabezados fijos y ajuste de impresión al ancho de página.

## Otras mejoras

- Buscador más compacto, con accesos a consultas frecuentes y resultados jerarquizados; conserva filtro por tipo y coincidencia exacta.
- El estado de sincronización dice **Actualizado**. Se conservan los avisos y errores cuando corresponde.

## Validación

74 pruebas JavaScript. Comprobación en navegador de predeterminados, comentarios, notas, asignación de páginas y exportaciones. Los tres estilos PDF se renderizaron y revisaron; extracción de títulos, fechas y valores de los gráficos confirmada, sin imágenes rasterizadas en los PDF de prueba. Excel conserva fórmulas nativas y resultados con dos decimales; no se probó en Microsoft Excel de escritorio.
