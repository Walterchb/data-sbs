# Actualización: desplazamiento móvil y editor de gráficos

## Instalación

1. En GitHub Desktop, usa Fetch origin y Pull origin antes de copiar los archivos.
2. Descomprime el ZIP y copia todo su contenido dentro de la carpeta de tu repositorio data-sbs, conservando las rutas y aceptando reemplazar los archivos incluidos.
3. Haz Commit y Push origin.
4. Cuando termine la publicación, recarga el dashboard con Ctrl+F5. En el móvil, recarga la página para cargar el código actualizado.

Este paquete conserva las mejoras anteriores y la corrección de los errores de ECharts. No incluye datos históricos ni cambios en la sincronización SBS.

## Cambios

- El topbar móvil acompaña el desplazamiento píxel a píxel; al subir, reaparece gradualmente. La navegación ocupa el espacio liberado.
- Los bordes de Variación y de la primera columna usan tonos suaves de la cuadrícula.
- El modal bloquea el desplazamiento de la página de fondo y restaura su posición al cerrar. El encabezado, la vista previa y el pie con el botón de descarga permanecen fijos. Solo las opciones se desplazan y sus barras de desplazamiento están ocultas.
- Permite agregar y quitar varias fechas de etiqueta dentro del rango visible.
- «Agregar comparación» permite elegir fecha inicial, final y flecha o línea. En gráficos de varias series, también se elige la serie. Se pueden agregar varias comparaciones.
- La Var % se calcula como (valor final / valor inicial − 1) × 100. Se usan las observaciones exactas de cada fecha y la misma serie. Si faltan datos, el periodo declarado no coincide o la base es cero o negativa, se indica el motivo y se solicita corregir o quitar la comparación antes de exportar.
- Las comparaciones etiquetan sus extremos cuando se elige «Fechas elegidas».
- El tamaño de texto admite valores de 12 a 72. Para textos grandes, se puede aumentar el ancho/alto de la imagen. El editor avisa si el texto no deja espacio suficiente para el gráfico.
- Se mantienen PNG, JPG y SVG, títulos, subtítulos, fondos, dimensiones, fuente, decimales, cuadrícula y opciones de línea. La imagen exportada conserva el rango visible.

## Validación

37 pruebas JavaScript aprobadas, incluida la integración con ECharts real y los casos de fechas múltiples, variaciones, bases inválidas y bloqueo de scroll. La validación de imports, sintaxis y datos también pasó.

Se comprobó la interfaz en Chromium con tamaños de pantalla móvil y escritorio: topbar proporcional, encabezado y vista previa fijos, desplazamiento de opciones, restauración de la página y descargas PNG/JPG/SVG. Se revisó visualmente una exportación con dos fechas y flecha de variación porcentual.
