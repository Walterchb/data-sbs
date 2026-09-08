# Treasury Hub · actualización 2

## Instalación

Este paquete actualiza la interfaz del proyecto conciliado `data-sbs-ultra.zip`. Incluye la adaptación de formato anterior y los seis cambios de esta revisión. No es un sitio independiente.

Descomprime el ZIP y reemplaza estos archivos en `data-sbs`, respetando sus carpetas:

- `index.html`
- `assets/app.css`
- `assets/js/app.js`
- `assets/js/charts.js`
- `assets/js/data.js`
- `tests/dom.test.mjs`
- `tests/refresh.test.mjs` (nuevo)

Los archivos de pruebas también deben subirse para que GitHub valide la interfaz nueva. Conserva los demás archivos del proyecto, los datos conciliados y los workflows. No subas el ZIP como archivo de la web. Después de publicar, recarga con Ctrl+F5 si aparece el diseño anterior.

Este `index.html` corresponde a Información Financiera SBS en `data-sbs`. El HTML de TC Contable se mantiene como página de su propio módulo; no se sustituye ni se mezclan ambas hojas de estilos.

## Cambios

1. Fecha y navegación comparten una fila en escritorio. En móvil, la fecha conserva su tarjeta y la navegación va debajo con desplazamiento horizontal.
2. Calendario nativo y distribución del control de TC: anterior, fecha, siguiente y Último. Como los datos financieros son mensuales, seleccionar una fecha lleva al cierre del mes disponible. Los periodos inexistentes se rechazan y se conserva la selección anterior.
3. Botón Font Awesome de información en la cabecera. Al pasar el mouse aparece el corte, unidades, advertencias y acceso a «Ver fechas por fuente». Al pulsar se abre el detalle, también en móvil.
4. KPI compactos: nombre, valor, unidad y una variación. El detalle muestra periodo, fuente, bases de comparación, MoM/YTD/YoY y cambios absolutos cuando corresponden. La utilidad acumulada se compara con el mismo mes del año anterior. Las ventanas se cierran con el botón, Escape o al seguir el enlace al rubro; el foco vuelve al control de origen cuando sigue presente.
5. Gráficos con ECharts 5, como TC: línea azul fina, área con degradado cian de tres niveles, referencias Último/Prom/Máx/Mín, tooltip, zoom, restaurar y descargar imagen. Alturas de 342 px en escritorio y 286 px en móvil; eje vertical a la derecha en escritorio y a la izquierda en móvil. El zoom con rueda requiere Ctrl para permitir desplazar la página. Se mantienen los huecos entre observaciones faltantes.
6. Actualizar comprueba directamente la publicación disponible, muestra animación y un aviso con el resultado. Evita solicitudes simultáneas y comprueba cada cinco minutos mientras la página está visible, además de comprobar al regresar después de ese intervalo. Si el usuario estaba en el último corte, una publicación nueva lo lleva al nuevo último corte; si consultaba historia, conserva su mes. Una descarga fallida conserva la versión previamente cargada.

## Actualización de datos

El botón carga los datos publicados; no inicia la descarga de archivos desde SBS ni solicita credenciales. Ese trabajo permanece en GitHub Actions. El acceso al workflow está dentro de «Cómo se actualiza» en el botón de información.

Los avisos de calidad permanecen visibles en el indicador superior incluso después de comprobar una publicación: «Comprobado» no significa que todas las fuentes tengan el mismo corte.

## Integración y dependencias

Mantén el módulo publicado desde `data-sbs` y enlázalo desde el menú de tu web con su URL real. No cambian las rutas de los datos ni del workflow.

Manrope, Font Awesome y ECharts utilizan los mismos servicios del HTML de TC: Google Fonts, cdnjs y jsDelivr. Si ECharts no carga, se conserva un gráfico SVG con degradado y la tabla de valores; el zoom y la descarga de imagen requieren ECharts.

Ambas páginas comparten la preferencia `sbs_tc_theme_treasuryhub` cuando se sirven desde el mismo origen. Bajo dominios diferentes conservan preferencias locales independientes.

## Verificación

- 14 pruebas automatizadas aprobadas: cálculos, seis vistas, búsqueda, ventanas de detalle, calendario, actualización directa, publicación fallida y opciones de gráficos.
- Validación del proyecto: referencias, sintaxis, 12 JSON, 67 periodos financieros y 7 reportes.
- Datos, configuración y scripts de conciliación conservados byte por byte respecto del proyecto conciliado.
- No se ha realizado una comprobación visual en navegador real ni una publicación en GitHub en esta revisión.
