# Cambios

## 5.0 — 2026-09-08

1. Reprocesamiento de 416 archivos-periodo SBS de ocho fuentes, con identidad de banco y celda de origen.
2. Corrección de B-2401: una métrica de BanBif ya no puede tomar la columna de otro banco.
3. Corrección de posición ME: se lee exactamente la fila BanBif aunque BCP tenga más celdas numéricas.
4. RFNE convertido de proporción a porcentaje, reconciliado con fondos disponibles/requeridos y sin fechas Excel/índices de fila dentro de las métricas.
5. Balance: bloques de bancos detectados por encabezados reales, recuperación de entidades finales y total oficial del sistema.
6. Identidad única por estado/rubro; provisiones y otros nombres repetidos mantienen su padre.
7. Fechas y unidades explícitas, MoM/YoY exactos, pb en ratios y comparación YTD consistente.
8. Seis vistas analíticas, búsqueda jerárquica, movimientos con materialidad, historial y comparación configurable.
9. JavaScript modular, CSS consolidado, gráficos SVG sin CDN y carga diferida/versionada de datasets.
10. DATA HEALTH, pruebas de parsers/cálculos/DOM, validación fuente–frontend y workflows que publican únicamente salidas válidas.

Eliminados: tres CSS anteriores, backup YAML inactivo, ratings_reference.json no consumido y caché Python versionada. Se mantienen el favicon y el esquema estático de publicación.

No se publicó ni se modificó el repositorio remoto; la entrega es un ZIP revisable.
