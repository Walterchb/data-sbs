# Treasury Hub · actualización 12

## Instalación

Este paquete actualiza el proyecto conciliado `data-sbs-ultra.zip` e incluye las adaptaciones anteriores de la interfaz.

**Descomprime el ZIP y sube todos sus archivos a tu repositorio, respetando las carpetas y reemplazando los existentes.** Esta revisión incluye interfaz, datos, configuración, scripts y pruebas. No basta con reemplazar HTML y CSS.

- `index.html` y `assets/`: interfaz y nueva pestaña Concentración.
- `data/`: publicación completa y coherente de 14 archivos JSON, incluidos los dos reportes regionales.
- `config/sources.json`: incorporación de B-2349 y B-2350 a la actualización mensual.
- `scripts/`: lectura y validación de los reportes regionales y generación de datos.
- `tests/`: pruebas y archivos de ejemplo necesarios para la validación en GitHub.

Conserva los demás archivos del proyecto y los workflows existentes. GitHub Actions utiliza las nuevas fuentes de la configuración automáticamente. No es necesario subir cachés ni instalar dependencias nuevas. Después de publicar, recarga con Ctrl+F5 si el navegador conserva la versión anterior.

Este `index.html` es el módulo Información Financiera SBS de `data-sbs`. No reemplaza la página de TC Contable.

## Concentración

En **Indicadores y riesgos → Concentración** puedes:

- Alternar depósitos (B-2350) y créditos directos (B-2349).
- Elegir una región y comparar hasta seis series simultáneas, con BanBif siempre visible. La selección inicial incorpora BBVA, BCP y el sistema.
- Consultar el porcentaje dentro de cada banco, el importe regional en S/ MM o la cuota del mercado regional. En cuota de mercado se omite la serie del sistema, que sería siempre 100%.
- Ver la evolución mensual con rangos de 12, 24 y 60 meses o todo el histórico.
- Comparar las diez regiones con mayor peso para BanBif en barras agrupadas y consultar las 26 geografías en la tabla. Al seleccionar una región en la tabla se abre su evolución.
- Exportar la comparación completa de regiones y bancos mediante el botón CSV.

Los dos reportes incluyen 67 cortes mensuales, desde enero de 2021 hasta julio de 2026. El periodo consultado respeta el selector general de fecha. Los huecos de información se mantienen como datos ausentes.

Se conserva el diseño de la herramienta, con colores por banco, degradados, leyenda y etiquetas que identifican cada serie, además de controles adaptados al móvil.

## Interpretación de los datos

La SBS publica la distribución porcentual por departamento y un total por entidad en miles de soles. El importe regional se calcula como total del mismo reporte × porcentaje / 100; para mostrar S/ MM se divide entre 1.000. La cuota de mercado se calcula como importe regional del banco / importe regional del sistema × 100.

Los importes regionales se identifican como calculados. No se mezclan los totales regionales con los del balance, porque su cobertura puede diferir. Se mantiene la cobertura de la fuente, incluidas sucursales en el exterior cuando corresponde; Lima, Callao y exterior permanecen separados. La distribución corresponde al criterio de oficinas del Anexo 10, no necesariamente al domicilio o riesgo económico final del cliente.

Las tarjetas resumen muestran la concentración de BanBif en la región, el importe calculado, su variación YTD en puntos básicos y la diferencia frente al sistema. YTD utiliza diciembre del año anterior y requiere ese corte exacto.

## Funciones conservadas

- Tabla de cuentas SBS con jerarquía inicial plegada, referencias ocultables, selección y resultado neto diferenciados, y barra fija de análisis.
- Capital con datos SBS y magnitudes calculadas en una sola tabla, fórmulas y columnas MoM, YTD y YoY.
- Gráficos y ventanas de detalle, copia de series sin desplazamientos, modo oscuro y botón de información.
- Actualización directa y comprobación periódica de la publicación disponible, conservando la selección histórica.

Los datos de las fuentes anteriores se mantienen; únicamente cambia su identificador de publicación para incorporar los nuevos reportes de forma coherente. ECharts, Manrope y Font Awesome siguen utilizando los servicios externos de la interfaz existente.

## Verificación

- 19 pruebas JavaScript superadas, incluidas navegación, gráficos comparativos, cálculos regionales, fechas y ausencia de datos. Las pruebas afectadas se repitieron tras el ajuste final de la cuota de mercado.
- 20 pruebas Python superadas, incluida la lectura de archivos SBS reales y controles de estructura y conciliación regional.
- Validador de publicación correcto: 14 JSON, 67 periodos financieros y 9 reportes adicionales.
- Ambos reportes regionales completos y sin errores de salud; se conservan las ocho advertencias previas de otras fuentes.
- Comprobación de que los nueve archivos de datos anteriores mantienen su contenido, salvo la versión de publicación.

No se ha realizado comprobación visual en navegador real ni publicación en GitHub.
