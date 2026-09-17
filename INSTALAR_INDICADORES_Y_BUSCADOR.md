# Indicadores y buscador global

Para las novedades de esta entrega, consulta INSTALAR_CALCULADORA_Y_AYUDAS.md.

## Instalación

1. En GitHub Desktop, ejecuta Fetch origin y Pull origin.
2. Descomprime el ZIP y copia todo el contenido sobre tu carpeta data-sbs, respetando las rutas y reemplazando los archivos incluidos. Incluye la carpeta .github.
3. Haz Commit y Push origin. Al terminar la publicación, recarga con Ctrl+F5 (o recarga la página en el móvil).

El paquete es incremental: conserva los estados financieros, históricos y datos de cada entidad que ya están en tu repositorio. Incluye las mejoras anteriores del editor de gráficos.

## Cambios

- Sectores: columna «% del total», orden descendente y total oficial al inicio. La participación es saldo / TOTAL CRÉDITOS A ACTIVIDADES EMPRESARIALES × 100. Filtrar no altera el denominador. La descarga incluye la participación.
- Indicadores: Solvencia, Calidad de activos, Cobertura, Rentabilidad, Eficiencia y gestión, y Liquidez. ROE y ROA aparecen en los nombres.
- RCL: ratios, totales, ALAC, entradas, salidas y contingentes. Incluye QoQ (trimestre exacto anterior) y lo exporta. Se respetan las advertencias de fechas; no se divide el promedio de saldos para reconstruir el promedio de ratios diarios.
- RFNE: ratio, totales, financiación estable disponible y requerida. Se mantienen los componentes de la fuente.
- Ratios de análisis: agrupación por finalidad y cuatro nuevas medidas: costo de riesgo crediticio 12M, gastos administrativos / ingresos financieros y servicios 12M, patrimonio / activos y margen financiero bruto / ingresos financieros YTD.
- Los flujos 12M se obtienen con YTD actual + diciembre anterior − mismo YTD anterior. En diciembre se usa el año completo. El costo de riesgo utiliza el promedio de créditos brutos de 13 cierres mensuales. No se extrapola un mes ni se confunden provisiones de gasto y de balance. Se conservan valores ausentes.
- El enlace privado de ChatGPT no pudo abrirse directamente. Se revisaron las referencias recuperadas del historial y las cuentas existentes. Las definiciones de clasificadoras que requieren castigos, intereses separados, APR o capital regulatorio no se simulan con cuentas no equivalentes. ROE, ROA y carteras ajustadas siguen disponibles como datos oficiales SBS.
- Ayudas sobre fórmulas, conceptos y comparaciones al pasar el mouse o enfocar con teclado. Los botones de información permiten consultar las definiciones en móvil. Escape cierra la ayuda.
- Buscador en el topbar, también con Ctrl+K / Cmd+K. Busca siglas, nombres, fórmulas, palabras parciales y errores leves. Muestra resultados agrupados y abre el indicador, rubro, producto o región, conservando la entidad y la fecha.
- El índice contiene solo metadatos; se carga al abrir el buscador y se reutiliza. scripts/build_search_index.py lo regenera; scripts/build_data.py y el workflow de sincronización incluyen esa actualización.

## Verificación

65 pruebas JavaScript y 24 Python; validación de imports, sintaxis y fuentes. Revisión en navegador de tablas, participaciones, grupos, fórmulas, buscador, navegación, modo oscuro y pantalla móvil.
