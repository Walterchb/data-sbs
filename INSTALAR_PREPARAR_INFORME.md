# Preparar Informe y gráficos guardados

## Instalar

1. Fetch / Pull en GitHub Desktop.
2. Copia el contenido de este ZIP al repositorio, respetando las carpetas.
3. Commit → Push. Después de la publicación, recarga con Ctrl+F5.

El paquete conserva los archivos de datos financieros. Incluye las mejoras anteriores.

## Preparar un informe

El botón del topbar ahora se llama **Preparar Informe**. Está disponible en escritorio y tablet de más de 760 px; no aparece en móvil. No requiere configurar márgenes, tipografías ni paginación.

1. **Cálculos:** elige una cuenta de Balance o Resultados, periodo y columna. Pulsa + o arrastra a la fórmula. La cuenta se resalta y muestra su letra antes del +. Puedes mezclar fechas: cada entrada conserva entidad, fecha, columna, fuente y valor.
2. Escribe una operación con +, -, *, /, ^ y paréntesis. Para un ratio usa `a/b` y formato Porcentaje; no multipliques también por 100. Pon nombre al cálculo y pulsa **Agregar al informe**.
3. **Contenido y revisión:** completa nombre, fecha, subtítulo y autor opcional. Agrega los gráficos guardados y las tablas disponibles en la vista del dashboard. Puedes editar títulos, ordenar o quitar adjuntos, editar resultados y añadir una conclusión.
4. Usa **Vista previa PDF**, **Descargar PDF** o **Descargar Excel**. También puedes exportar un informe de gráficos y tablas sin cálculos.

Las cuentas monetarias del editor se expresan en S/ miles, incluido ME como equivalente en soles. Balance contiene saldos al cierre y Resultados contiene acumulados YTD. Se conservan los signos de la fuente. Los resultados se muestran con **2 decimales**, pero los cálculos y datos de origen conservan su precisión.

## Guardar gráficos y añadir tablas

- En **Preparar imagen**, pulsa **Guardar gráfico**. La sección **6 · Guardados** muestra los gráficos de la sesión y permite eliminarlos. En Preparar Informe → Contenido, elige el gráfico y pulsa Agregar gráfico.
- El informe utiliza una imagen PNG sin pérdida, con hasta 2400 px en el lado mayor. Esto limita el tamaño del archivo y mantiene buena legibilidad a tamaño de página. La descarga original de la imagen sigue usando la resolución que elijas en Preparar imagen.
- Las tablas se capturan con sus filas actualmente visibles, filtros y unidades. Las filas plegadas no se incorporan. Se excluyen columnas que solo tienen gráficos sin valores de texto.
- Para añadir tablas de otras secciones, cierra el informe, navega a esa sección y vuelve a abrirlo. El borrador sigue ahí. Las tablas son instantáneas y no cambian al cambiar la entidad o fecha del dashboard.
- Los adjuntos ya agregados al informe se mantienen aunque quites el gráfico de Guardados.

**El borrador y los gráficos guardados se eliminan al recargar o cerrar la página.** Cerrar los modales no los elimina. Descarga antes de recargar. Los archivos incluyen el contenido agregado, no el cálculo que todavía esté en edición.

Límites para cuidar memoria: 20 gráficos guardados / 40 MB en la galería; 30 adjuntos / 25 MB de imágenes en el informe; 1000 filas por tabla; 60 cálculos y 80 variables por cálculo.

## Descargas

**PDF:** carátula con diseño propio en azul noche; resumen con resultados y comentarios; gráficos y tablas; anexo con expresiones, cuentas y fuentes. Los encabezados de tablas se repiten al pasar de página. Las tablas anchas se dividen por grupos de columnas conservando el rubro. Tipografías incorporadas y texto seleccionable; las imágenes son PNG sin compresión con pérdida.

**Excel:** Revisión con fórmulas nativas, Datos con las entradas editables y fechas reales, y hojas adicionales para cada gráfico o tabla. Las tablas son celdas editables; los gráficos conservan la composición guardada como imágenes. Los resultados recalculan al modificar las celdas de Datos. Formatos de dos decimales, encabezados fijos y ajuste de impresión al ancho de página.

## Otras mejoras

- Buscador más compacto, con accesos a consultas frecuentes y resultados jerarquizados; conserva filtro por tipo y coincidencia exacta.
- El estado de sincronización dice **Actualizado**. Se conservan los avisos y errores cuando corresponde.

## Validación

71 pruebas JavaScript y validación del proyecto. Revisión en navegador de selección de variables, gráficos guardados, tablas, exportaciones, vista previa, modo oscuro, ocultación en móvil y borrado al recargar. Recálculo de Excel comprobado al cambiar entradas. Archivo Excel abierto y renderizado con LibreOffice para comprobar la imagen incrustada y el ajuste de impresión; no se probó en Microsoft Excel de escritorio. PDF normal y pruebas con títulos largos, comentarios extensos y tablas de varias páginas revisados.
