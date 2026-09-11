# Treasury Hub · actualización 13

## Instalación

Este paquete actualiza el proyecto conciliado `data-sbs-ultra.zip` e incluye los cambios anteriores.

**Descomprime el ZIP y sube todos sus archivos al repositorio, respetando las carpetas y reemplazando los existentes.** También incluye datos y scripts: reemplazar únicamente el HTML o JavaScript deja incompleto el selector.

Conserva los demás archivos del proyecto. El workflow de sincronización incluido incorpora la publicación de `data/entities/`. Tras publicar, recarga con Ctrl+F5 si el navegador conserva la versión anterior.

## Selector global de entidad

El nuevo desplegable aparece al principio de la navegación, usando la misma fila, controles y desplazamiento horizontal existentes. BanBif sigue seleccionado al abrir la herramienta sin una selección guardada en el enlace.

Las 24 opciones corresponden a identidades publicadas en el histórico, incluidos bancos que no tienen datos en todos los meses y variantes de cobertura:

- Banco individual.
- Banca múltiple de ámbito local.
- Banca múltiple que incluye sucursales en el exterior.
- BCP local y BCP con sucursales en el exterior.

Al cambiar de entidad se actualizan Panorama, Qué cambió, Cuentas SBS, Indicadores y riesgos, Capital calculado, Concentración y la referencia destacada en Comparar bancos. La fecha, el rubro, la búsqueda, la vista de tabla y el rango elegidos se conservan. La selección se incluye en el enlace y en las exportaciones CSV y las series copiadas.

La estructura, las tarjetas, los gráficos, las tablas y la barra fija conservan el diseño previo. No se incorporan nuevos reportes ni pestañas en esta revisión.

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

23 pruebas JavaScript superadas: cálculos, navegación, detalles, copia, actualización, cambio global, ámbitos separados, periodos sin datos, cambios rápidos, errores y caché limitada.

21 pruebas Python superadas, incluyendo comprobación de los totales de todos los estados por entidad contra los totales bancarios originales de B-2201. Los balances y MN + ME se validan durante la compilación.

Validación de entrega correcta: 38 archivos JSON, 67 periodos financieros y 9 reportes adicionales. Sin errores en la publicación; se conservan las ocho advertencias previas de las fuentes.

No se ha publicado en GitHub ni realizado comprobación visual en un navegador real.
