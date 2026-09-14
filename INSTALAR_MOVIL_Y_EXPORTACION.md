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

## Anotaciones y colores

- Cada comparación automática tiene su propio selector de color para el trazo y la flecha.
- «Fondo sutil en etiquetas» permite activar o desactivar el fondo de las etiquetas de datos y comparaciones.
- La barra «Anotar», sobre la vista previa, agrega círculos, óvalos, rectángulos, flechas, líneas, textos y resaltados.
- Toca o haz clic sobre un elemento para seleccionarlo. Arrástralo con el mouse o el dedo; el tirador permite cambiar su tamaño. Pulsa «Listo» o un espacio vacío para volver a las opciones del gráfico.
- El panel permite ajustar posición y tamaño en píxeles, borde, relleno, opacidad y texto. Los botones de movimiento admiten saltos de 1, 5, 10 o 25 píxeles; las flechas del teclado mueven 1 píxel y Mayús + flecha, 10.
- Puedes duplicar, eliminar o cambiar el orden de los elementos. Los resaltados quedan detrás de las figuras y textos añadidos; los cuadros de texto también admiten un subrayado de color detrás de las letras.
- Las anotaciones se incluyen en PNG, JPG y SVG; los controles de selección no aparecen en la descarga.

## Etiquetas movibles y capas del gráfico

- El selector «Color del fondo de etiquetas» cambia el color del fondo sutil. La casilla permite seguir activándolo o desactivándolo.
- Las etiquetas de fechas, valores y variaciones se pueden seleccionar directamente en la vista previa. El último icono de la barra también abre la selección de etiquetas.
- Arrastra con mouse o dedo, o usa los controles X/Y y los botones de movimiento. Los valores permanecen vinculados a sus datos y no se editan manualmente.
- Activa «Líneas de unión en las etiquetas» para todas, o la casilla «Línea de unión con su referencia» para la etiqueta seleccionada. La unión sigue apuntando al dato o al centro del trazo de comparación.
- «Restablecer posición» devuelve la etiqueta seleccionada a su ubicación inicial. Las posiciones se mantienen al cambiar el formato y se adaptan al cambiar las dimensiones.
- En las figuras y textos añadidos, «Capa» permite elegir «Detrás del gráfico» o «Delante del gráfico». Los resaltados se crean detrás del gráfico por defecto, debajo del título, curvas y etiquetas, pero encima del fondo general.

## Editor ordenado y zoom

- Las opciones se agrupan en cinco secciones plegables: Título y fuente; Formato y tamaño; Etiquetas y comparaciones; Estilo del gráfico; Fondo y presentación.
- La vista previa admite zoom de 100% a 400% con dos dedos, con botones +/− y con un botón para volver a ajustar la imagen.
- Con la vista ampliada puedes desplazarla con dos dedos; un dedo sobre un espacio libre también desplaza la vista. Arrastrar una anotación sigue moviendo ese elemento.
- El zoom solo afecta a la vista previa: no recorta la descarga ni cambia sus dimensiones.
- El recuadro de selección ya no permanece marcado. La edición sigue disponible en el panel del elemento, con «Listo» para cerrarlo. Se conserva el indicador de foco para navegación por teclado.

## Comparar bancos y series

- Gráfico superior con hasta ocho combinaciones de banco e indicador, y tabla inferior con sus valores originales.
- «Indicador principal» actualiza las series de los bancos principales. «Agregar serie» permite incorporar otra combinación, por ejemplo depósitos de BanBif junto con créditos de varios bancos.
- La entidad de la navegación permanece como referencia. Puedes quitar las demás series con × y elegir bancos para el indicador principal en el desplegable de selección múltiple.
- «Valores» compara magnitudes de la misma unidad; «Base 100» compara su evolución relativa desde una fecha común con bases positivas. Si se mezclan unidades, se usa Base 100 automáticamente. Las series sin datos se identifican y no impiden comparar las demás.
- La tabla incluye periodo declarado, valor, MoM, YTD, YoY, promedio, mínimo, máximo y número de observaciones del rango. Los ratios cambian en puntos básicos; los importes, en porcentaje.
- El resultado neto es acumulado: se conserva YoY y se omiten MoM/YTD para no confundirlos con crecimiento mensual.
- Los reportes se cargan bajo demanda y se reutiliza la caché. No se sustituyen los datos locales por los que incluyen sucursales del exterior.
- La descarga CSV incluye las estadísticas y el nombre oficial SBS de cada banco. El gráfico usa el editor de imágenes con anotaciones.

## Altura de la vista previa en móvil

- Arrastra la barra «Ajustar altura», debajo de la vista previa, para ampliar o reducir el espacio de imagen.
- El botón ↺ restablece la altura inicial. El encabezado y la descarga permanecen fijos, y siempre queda espacio para las opciones.
- El zoom con dos dedos sigue disponible dentro del recuadro. Ajustar su altura solo cambia el espacio de trabajo, no las dimensiones de la descarga.

## Fondo y presentación

- Nueva sección «5 · Fondo y presentación»: Sin marco, Color sólido, Degradado lineal y Degradado radial.
- Presets Azul, Lavanda, Arena, Menta y Noche; colores inicial/final y dirección personalizables.
- Margen exterior, radio de esquinas y sombra regulables. Un valor de 0 elimina el redondeado o la sombra.
- El gráfico completo y sus anotaciones se ajustan proporcionalmente dentro del marco, conservando el ancho y alto finales elegidos.
- El fondo del gráfico se elige en «Formato y tamaño». Al elegir Transparente, el fondo exterior se ve a través del gráfico y no se añade una tarjeta opaca con sombra.
- El marco se conserva en PNG, JPG y SVG; las anotaciones siguen siendo movibles en la vista previa.

## Validación

47 pruebas JavaScript aprobadas, incluida la integración con ECharts real y los casos de fechas múltiples, variaciones, bases inválidas y bloqueo de scroll. La validación de imports, sintaxis y datos también pasó.

Se comprobó la interfaz en Chromium con tamaños de pantalla móvil y escritorio: topbar proporcional, encabezado y vista previa fijos, desplazamiento de opciones, restauración de la página y descargas PNG/JPG/SVG. Se revisó visualmente una exportación con dos fechas y flecha de variación porcentual.

También se verificaron en Chromium el color independiente de comparación, fondos de etiquetas, los siete tipos de anotación, arrastre con mouse y gesto táctil, cambio de tamaño, movimiento de un píxel, orden de elementos y conservación de las anotaciones en los tres formatos.

Se verificaron también etiquetas de valores en barras agrupadas, las fechas en los extremos del gráfico, huecos de datos, zoom, líneas de unión, restablecimiento de posiciones y cambios de dimensiones.

Verificado en Chromium móvil/escritorio: añadir y quitar series, unidades mixtas, periodos rezagados, tabla, descarga de imagen, secciones del editor, pellizco real con dos dedos, zoom sin alterar la exportación y cierre/restauración del desplazamiento.

Se verificaron también el tirador con gesto táctil, sus límites y restablecimiento; fondos y presets; esquinas y sombras; arrastre de anotaciones dentro del marco y exportación a los tres formatos.
