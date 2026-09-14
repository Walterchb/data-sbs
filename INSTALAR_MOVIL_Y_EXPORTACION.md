# Actualización: móvil, tablas y exportación de gráficos

Este paquete se aplica sobre la última versión del dashboard data-sbs entregada en esta conversación.

## Instalación

1. En GitHub Desktop, usa Fetch origin y Pull origin antes de copiar los archivos.
2. Descomprime el ZIP y copia todo su contenido dentro de la carpeta del repositorio, conservando las rutas y aceptando reemplazar los archivos incluidos.
3. Haz Commit y Push origin.
4. Cuando termine la publicación, recarga el dashboard con Ctrl+F5. En el móvil, recarga la página.

Se incluyen cinco archivos de interfaz, tres archivos de pruebas, package.json, package-lock.json y esta guía. No se incluyen datos históricos ni cambios en la sincronización SBS.

## Cambios

- Móvil: el topbar se oculta al bajar y reaparece al subir. La navegación ocupa el espacio liberado. Se contempla el foco de teclado y la preferencia de movimiento reducido.
- Tablas: primera columna fija y con fondo opaco; columna Variación de Composición con bordes a ambos lados; borde inferior de la última fila visible.
- Posición ME: se desactivan las ligaduras que pueden transformar visualmente (c) en ©. Las fórmulas y los datos SBS se conservan.
- Gráficos: el icono Descargar abre Preparar imagen, con vista previa y exportación PNG, JPG o SVG. Incluye tamaños predefinidos y dimensiones personalizadas, título, subtítulo, fondo, etiquetas, fecha de etiqueta, decimales, cuadrícula, fuente y opciones de línea. SVG conserva la calidad al ampliarse.
- JPG utiliza fondo opaco; PNG y SVG también admiten transparencia. La exportación conserva el rango visible y no modifica el gráfico del dashboard. Las series sin observación en la fecha elegida no reciben una etiqueta sustitutiva.

## Validación

34 pruebas JavaScript aprobadas y validación de imports, sintaxis y datos aprobada. Se verificó el modal con ECharts real: generación SVG, cambios de opciones, dimensiones, restricción de transparencia en JPG, cierre y restauración de foco. Se renderizaron y revisaron muestras de los gráficos exportados.

Pendiente: revisión visual completa del dashboard en un navegador móvil y comprobación de la descarga PNG/JPG en navegador. El navegador de pruebas no estuvo disponible en este entorno.

## Corrección de ECharts

Se corrigieron los errores «Bind must be called on a function» y «Cannot read properties of undefined (reading '__ec_inner_…')». El botón personalizado de exportación ahora se registra junto con su función en la primera configuración del gráfico. Antes, el registro se hacía en dos pasos y dejaba ECharts parcialmente inicializado.

La prueba de regresión utiliza ECharts 5.6.0 real y comprueba creación, apertura del modal, generación SVG, zoom, restauración, actualización y limpieza repetida de gráficos de líneas y barras. La dependencia añadida es exclusivamente para las pruebas.
