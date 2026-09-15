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
- El tamaño de texto inicia en 28 y admite valores de 12 a 72. Para textos grandes, se puede aumentar el ancho/alto de la imagen. El editor avisa si el texto no deja espacio suficiente para el gráfico.
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

- Nueva sección «5 · Fondo y presentación»: Sin marco, Solo sombra, Color sólido, Degradado lineal y Degradado radial.
- Presets Océano, Blanco, Piedra, Bosque y Noche; colores inicial/final y dirección personalizables.
- Margen exterior, radio de esquinas y sombra regulables. Un valor de 0 elimina el redondeado o la sombra.
- Por defecto, «Conservar el tamaño del gráfico» añade el margen alrededor y amplía el lienzo final sin reducir el gráfico ni sus anotaciones. Puedes desactivarlo para ajustar proporcionalmente todo al tamaño elegido.
- El fondo del gráfico se elige en «Formato y tamaño». Al elegir Transparente, el fondo exterior se ve a través del gráfico y no se añade una tarjeta opaca con sombra.
- El marco se conserva en PNG, JPG y SVG; las anotaciones siguen siendo movibles en la vista previa.

## Patrones y calidad de exportación

- «Solo sombra» mantiene transparente el exterior en PNG y SVG. JPG lo rellena de blanco. El gráfico usa una tarjeta opaca para poder proyectar su sombra.
- Blanco reemplaza a Lavanda y aplica un fondo sólido blanco.
- Patrones vectoriales: Puntos, Cuadrícula, Diagonales, Cruces, Ondas y Damero. Puedes ajustar color, separación, grosor y opacidad. Se aplican al fondo exterior; Solo sombra los desactiva.
- PNG sale a 2× por defecto. En «Formato y tamaño» puedes elegir 1×, 2× o 3×; el editor muestra las dimensiones reales del archivo.
- Ejemplo: gráfico de 1600 × 900, margen de 48 px y tamaño conservado → lienzo de 1696 × 996; a 2×, PNG de 3392 × 1992.
- SVG conserva trazos, textos y patrones vectoriales. PNG no usa compresión con pérdida. JPG usa calidad máxima, pero su formato sí emplea compresión con pérdida.
- La exportación se genera directamente desde el SVG a la resolución final. No se amplía una captura de pantalla ni una imagen rasterizada pequeña.
- Si el archivo supera 48 megapíxeles, el editor pide reducir la resolución o elegir SVG; no reduce la resolución silenciosamente.

## Validación

59 pruebas JavaScript aprobadas, incluida la integración con ECharts real y los casos de fechas múltiples, variaciones, bases inválidas y bloqueo de scroll. La validación de imports, sintaxis y datos también pasó.

Se comprobó la interfaz en Chromium con tamaños de pantalla móvil y escritorio: topbar proporcional, encabezado y vista previa fijos, desplazamiento de opciones, restauración de la página y descargas PNG/JPG/SVG. Se revisó visualmente una exportación con dos fechas y flecha de variación porcentual.

También se verificaron en Chromium el color independiente de comparación, fondos de etiquetas, los siete tipos de anotación, arrastre con mouse y gesto táctil, cambio de tamaño, movimiento de un píxel, orden de elementos y conservación de las anotaciones en los tres formatos.

Se verificaron también etiquetas de valores en barras agrupadas, las fechas en los extremos del gráfico, huecos de datos, zoom, líneas de unión, restablecimiento de posiciones y cambios de dimensiones.

Verificado en Chromium móvil/escritorio: añadir y quitar series, unidades mixtas, periodos rezagados, tabla, descarga de imagen, secciones del editor, pellizco real con dos dedos, zoom sin alterar la exportación y cierre/restauración del desplazamiento.

Se verificaron también el tirador con gesto táctil, sus límites y restablecimiento; fondos y presets; esquinas y sombras; arrastre de anotaciones dentro del marco y exportación a los tres formatos.

Control de calidad en Chromium: se comparó el área del gráfico original a 1× con la misma área dentro del marco (sin redondeado ni sombra) y hubo 0 diferencias de píxeles. Se comprobaron además la transparencia de Solo sombra, los seis patrones vectoriales y las dimensiones exactas de las salidas a 2× y 3×.


## Estilos rápidos y edición libre

- «Ajustes rápidos» aparece antes de las opciones. Incluye Consultoría, Revista, Finanzas, Corporativo, Prensa y Trading. Son interpretaciones visuales con colores, jerarquía, formato y tipografías compatibles; no plantillas oficiales ni fuentes propietarias.
- «Personalizado» está seleccionado al abrir y recupera los ajustes personalizados previos al primer estilo. Los títulos, fechas, valores, anotaciones y formato de descarga se conservan. Puedes cambiar las tipografías del título y del cuerpo por separado.
- Solo una sección permanece abierta, incluida la edición de anotaciones. Su borde señala la configuración activa.
- En PC, arrastra una zona libre de la vista ampliada con el mouse. «Mover vista» permite arrastrarla incluso sobre una anotación; desactívalo para editar los elementos. También puedes desplazarla con el botón central del mouse.
- Las flechas y líneas manuales tienen tiradores en ambos extremos, con orientación libre en cualquier dirección. Arrastra el trazo para moverlo completo; el panel conserva los controles en píxeles y las orientaciones habituales.
- «Color del texto de etiquetas» se aplica a fechas, valores y porcentajes de variación, independientemente del fondo sutil.
- Los patrones admiten opacidad de 0 a 100 %. Noche y Blanco se conservan; Océano, Piedra y Bosque sustituyen los otros fondos.
- Se conserva la exportación directa a resolución final, PNG 2× predeterminado y SVG vectorial.

Verificado en navegador: seis estilos y retorno a Ninguno, color de etiquetas en SVG, acordeón exclusivo, arrastre con mouse, extremos libres y flechas verticales, opacidad 100 %, descarga SVG y vista móvil.


## Copiar gráfico y ajustes editoriales

- «Copiar gráfico» lleva la imagen directamente al portapapeles como PNG, con la resolución elegida (2× por defecto), fondos y anotaciones. Después, usa Ctrl+V o Pegar. Aunque selecciones SVG o JPG para descargar, la copia utiliza PNG para compatibilidad con aplicaciones.
- La copia y la descarga se generan desde el mismo SVG a resolución final. Se mantiene la transparencia en PNG. Los navegadores que no admiten copiar imágenes conservan la descarga; si el permiso del portapapeles está bloqueado, el modal lo indica.
- La franja roja de Revista pasa de 4 a 10 px de alto.
- Trading se adapta a la captura proporcionada: fondo negro, área de trazado oscura, línea blanca sin suavizado, relleno azul degradado, cuadrícula punteada, eje izquierdo y título ámbar. Se conservan las series reales y sus unidades.
- Se elimina Vox editorial del selector.

Validado en Chromium: escritura y lectura reales del portapapeles como PNG, mismas dimensiones y píxeles que la descarga, copia con marco/anotaciones al seleccionar SVG, rechazo de permisos, navegador sin soporte y botones visibles en móvil.


## Contraste y espacio entre elementos

- Trading vuelve a la escala izquierda. Su título usa el mismo tamaño destacado que los otros estilos.
- El fondo Claro adapta los ejes, título, cuadrícula, área y color inicial de la línea; el modo Oscuro mantiene el aspecto de terminal.
- Se amplía la separación entre subtítulo, leyenda y gráfico. La leyenda organiza los nombres en filas según el ancho disponible y la tipografía; cada fila reserva espacio antes del área de datos.
- Los meses del eje X y las cifras del eje Y tienen márgenes mayores. Las etiquetas se colocan inicialmente debajo de la leyenda y buscan posiciones libres; sus posiciones manuales siguen conservándose.
- «Líneas de unión en las etiquetas» está activado al abrir. Puedes desactivarlo para todas o para la etiqueta elegida.

Verificado en navegador: Trading claro/oscuro, título ampliado, eje izquierdo, conexiones predeterminadas, leyenda de ocho series y separación medida en lienzos anchos y estrechos.


## Categorías de estilo, relleno opcional y Paper

- Ajustes rápidos: Consultoría, Revista, Finanzas, Corporativo, Prensa, Trading y Paper. Personalizado sigue siendo la opción inicial.
- La casilla «Degradado bajo las líneas» sustituye el texto de referencias y está activada inicialmente. En los estilos genera un relleno degradado acorde al color de cada serie; Trading conserva su degradado azul.
- En Personalizado mantiene el relleno anterior. Desactivar la casilla lo oculta; activarla lo recupera. Al regresar a Ninguno se recupera también el estado previo de la casilla. En gráficos de barras aparece deshabilitada.
- Paper utiliza fondo blanco, Times New Roman con alternativas serif, título y subtítulo centrados, trazos finos, marcadores y ejes discretos; no añade la franja decorativa. Su relleno gris sutil se puede desactivar para obtener una figura académica de solo líneas. Es un estilo visual tipo paper, no un motor de composición LaTeX.
- El cambio de relleno no altera datos, etiquetas, conexiones, ni resolución de copia o descarga.

Verificado en navegador: nombres del selector, relleno activado/desactivado en los siete estilos, recuperación de Personalizado, apariencia de Paper en móvil y escritorio y exportación SVG.


## Paper: nombres y modo oscuro

- Las opciones se muestran como «Paper» y «Personalizado».
- Paper adapta la línea y el degradado al fondo oscuro con tonos claros; las comparaciones también usan una paleta clara. Se mantienen los colores elegidos manualmente y el control para ocultar el relleno.
- La cuadrícula de ambos ejes es punteada, fina y de baja opacidad, adaptada a claro/oscuro. Se activa al elegir Paper y puede ocultarse con «Mostrar cuadrícula».

Verificado: contraste de línea, relleno y etiquetas; comparaciones en oscuro; retorno a claro; cuadrícula activada/desactivada; nombres y exportación SVG.


## Leyenda de Paper para ocho series

- En gráficos de líneas, Paper reemplaza los recuadros por muestras de línea con los mismos trazos y marcadores de cada serie.
- Ocho combinaciones, en orden: continua; trazos largos; trazos cortos; raya-punto; continua con cuadrados; continua con triángulos; continua con círculos; trazos largos con rombos.
- Las muestras de la leyenda son más anchas. Su espacio se incluye al calcular las filas para que la leyenda siga separada del gráfico.
- La representación usa trazos vectoriales y se conserva en claro/oscuro, copia y descarga. Las leyendas de gráficos de barras conservan sus símbolos de barras.

Verificado con ocho series en el motor gráfico real: trazos y marcadores de la leyenda corresponden a cada línea, sin marcadores extra en las cuatro primeras muestras. Revisión visual clara/oscura, SVG y móvil.
