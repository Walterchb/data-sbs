# Treasury Hub · actualización 15

## Cambios de esta revisión

- Modal de entidades independiente del estilo de los detalles KPI: fondo, texto, tarjetas, bordes y selección responden a los tokens del tema claro/oscuro. Tarjetas más compactas y tipografía del botón principal igual a las pestañas (0.74 rem).
- Composición en filas compactas con cabecera común: rubro, barra divergente, variación absoluta, saldo, participación y YoY/YTD/MoM. El eje cero queda alineado entre filas y las magnitudes están a la derecha. Las unidades se indican en la cabecera.
- Los stats, cálculos, bases de comparación y datos se conservan. En pantallas intermedias los dos paneles se apilan; en móvil las columnas se consultan con desplazamiento horizontal dentro de cada bloque.
- Comprobados los flujos existentes con 7 pruebas de navegación/composición y el validador del proyecto. No se ejecutó comprobación visual en navegador porque el ejecutable no estaba disponible.

## Instalación

Este paquete actualiza el proyecto conciliado `data-sbs-ultra.zip` e incluye los cambios anteriores.

**Descomprime el ZIP y sube todos sus archivos al repositorio, respetando las carpetas y reemplazando los existentes.** También incluye datos y scripts: reemplazar únicamente el HTML o JavaScript deja incompleto el selector.

Conserva los demás archivos del proyecto. El workflow de sincronización incluido incorpora la publicación de `data/entities/`. Tras publicar, recarga con Ctrl+F5 si el navegador conserva la versión anterior.

## Selector global de entidad

El botón de entidad aparece al principio de la navegación y abre un modal con tarjetas. Los nombres se abrevian (BCI, Falabella, Santander) y se mantiene visible el ámbito de las variantes local/exterior. Admite teclado, cierre con Escape y selección táctil. BanBif sigue seleccionado al abrir la herramienta sin una selección guardada en el enlace.

Las 24 opciones corresponden a identidades publicadas en el histórico, incluidos bancos que no tienen datos en todos los meses y variantes de cobertura:

- Banco individual.
- Banca múltiple de ámbito local.
- Banca múltiple que incluye sucursales en el exterior.
- BCP local y BCP con sucursales en el exterior.

Al cambiar de entidad se actualizan Panorama, Cambios, Cuentas SBS, Indicadores, Capital calculado, Concentración y la referencia destacada en Comparar. La fecha, el rubro, la búsqueda, la vista de tabla y el rango elegidos se conservan. La selección se incluye en el enlace y en las exportaciones CSV y las series copiadas.

Se conserva la estructura y la barra fija. Esta revisión renueva el selector de entidad y los dos bloques de composición, sin incorporar nuevos reportes ni pestañas.

## Depósitos y composición · revisión 14

Depósitos = vista (B-2201 fila 78) + ahorro (79) + plazo (80) + restringidos (85) + depósitos del sistema financiero y organismos internacionales (90). Es equivalente a obligaciones con el público (76) − otras obligaciones (86) + fila 90. No se suman nuevamente los subcomponentes del plazo. La definición actualiza todas las entidades y fechas, el KPI, su detalle, la evolución, Comparar, las exportaciones y créditos/depósitos. Obligaciones con el público permanece sin cambios como cuenta contable y como denominador del indicador Disponible/obligaciones con el público.

Control de referencia: BanBif junio 2026 = S/15,926.993 MM (S/15,926.99 MM en pantalla). Los cálculos conservan precisión completa.

Los bloques de colocaciones vigentes y fondeo del público muestran total en S/ MM, YoY, YTD y MoM. Cada componente muestra saldo, participación, tres variaciones porcentuales y una barra divergente con variación absoluta en S/ MM: derecha/verde para aumentos e izquierda/rojo para disminuciones. Los botones YoY/YTD/MoM cambian la base de las barras de cada bloque de forma independiente. Las barras usan la misma escala dentro de cada bloque y se ordenan por variación. Se incluyen los componentes directos, sin duplicar padres e hijos. El fondeo del público corresponde a obligaciones con el público, incluido Otras obligaciones; no incluye depósitos del sistema financiero.

YoY compara con el mismo mes del año anterior; YTD con diciembre anterior; MoM con el mes anterior. No se aproximan bases ausentes, ni se calcula crecimiento porcentual sobre cero o valores negativos. Una disminución no significa por sí sola deterioro del indicador: los colores expresan dirección.

El control mensual muestra «Jul - 2026» y el tooltip muestra el cierre real: «Al 31 de julio de 2026» o «Al 30 de junio de 2026».

## Datos y alcance

Se incorporan los balances y estados de resultados completos por entidad, con MN, ME y total, a partir de las columnas originales de B-2201. Se conservan 67 cortes mensuales, enero de 2021 a julio de 2026. Los resultados son acumulados desde enero; los saldos corresponden al cierre. Una entidad que todavía no estaba publicada en un mes muestra ausencia de datos, no ceros ni datos de BanBif.

Los reportes regulatorios utilizan las observaciones de la entidad seleccionada. En los reportes con hojas por banco se conservan sus fechas declaradas. La tabla de RFNE también permite mostrar las métricas que existen para otras entidades aunque no existan para BanBif.

Las variantes local y con sucursales en el exterior se mantienen separadas. Si una fuente solo publica una de ellas, elegir la otra muestra un aviso de falta de datos para ese ámbito. Por ejemplo, para los indicadores B-2401 y los reportes regionales se puede consultar el total que incluye sucursales en el exterior; Capital B-2402 utiliza el total que identifica su propia fuente. No se empalman variantes automáticamente.

La comparación de bancos conserva las demás entidades como referencias y destaca la seleccionada. En los indicadores financieros derivados del balance, la referencia del sistema respeta el ámbito seleccionado. En Concentración, las tarjetas y la clasificación de regiones corresponden a la entidad elegida, que permanece fija entre las series comparadas.

El botón de información y Fuentes y calidad siguen describiendo la publicación y sus controles generales. Sus recuentos de observaciones son los de referencia del proceso SBS, no un nuevo recuento de la entidad seleccionada.

Los valores anteriores de BanBif en `financial.json` y `overview.json` permanecen idénticos, salvo el identificador de publicación.

## Rendimiento y comportamiento

- Los estados completos adicionales se cargan bajo demanda por entidad; el navegador no descarga `hub.json` ni todos los bancos al iniciar.
- Cada paquete de entidad contiene su histórico de cuentas y resumen, sin duplicar los catálogos ni las comparaciones compartidas. Los paquetes típicos ocupan aproximadamente 0.6–0.7 MB sin compresión.
- Se conservan en memoria hasta cuatro paquetes adicionales recientes. Volver a uno de ellos evita otra descarga; el navegador puede conservar también su caché HTTP.
- Si se cambia rápidamente de entidad, únicamente la última selección puede actualizar la vista.
- Mientras se carga otra entidad se ocultan las cifras anteriores. Si falla la carga se muestra un error y se permite reintentar navegando o con Actualizar.
- La actualización de la publicación comprueba la entidad activa y las fuentes utilizadas; no vuelve a descargar todos los bancos que se hayan visitado.

## Verificación

24 pruebas JavaScript superadas: cálculos, navegación, detalles, copia, actualización, cambio global, ámbitos separados, periodos sin datos, cambios rápidos, errores y caché limitada.

22 pruebas Python superadas, incluyendo comprobación de los totales de todos los estados por entidad contra los totales bancarios originales de B-2201. Los balances y MN + ME se validan durante la compilación.

Validación de entrega correcta: 38 archivos JSON, 67 periodos financieros y 9 reportes adicionales. Sin errores en la publicación; se conservan las ocho advertencias previas de las fuentes.

No se ha publicado en GitHub ni realizado comprobación visual en un navegador real.

Validación de esta revisión: 24 pruebas JavaScript y verificación de depósitos históricos contra cada entidad; controles de integridad del proyecto.
