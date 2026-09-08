# Auditoría técnica y funcional — versión 5.0

Fecha de entrega: 8 de septiembre de 2026. Repositorio de partida: `Walterchb/data-sbs`, commit `cfb9620d52b06f7e0c6501266d50899d5bbed600`.

## Resultado y alcance

Se inspeccionaron los archivos HTML, JavaScript embebido, tres CSS, Python, los JSON de datos y referencias, README y los workflows. El repositorio no contenía CSV ni XLS versionados ni un backend de APIs propio. Se descargaron y reprocesaron **416 archivos-periodo de ocho fuentes SBS**, desde enero de 2021 cuando existía información.

El resultado incluye un frontend reconstruido, parsers específicos, datos corregidos, controles de calidad, pruebas y documentación. Sigue siendo una web estática compatible con GitHub Pages. No se modificó ni publicó el repositorio remoto.

## Problemas y causas raíz

| Hallazgo | Causa raíz comprobada | Corrección |
|---|---|---|
| Indicadores de otros bancos dentro de BanBif | Extracción vertical en columnas `ec - 2` a `ec + 2` | Columna exacta de la entidad; 22 métricas válidas en julio, frente a 110 entradas mezcladas |
| Posición ME atribuida a BCP | Selección de la fila vecina con mayor cantidad de números; BanBif tenía un guion en opciones | Fila exacta de BanBif, sin comparar densidad entre bancos |
| RFNE de 46,234 | Fecha serial Excel recogida bajo el título del reporte; también se recogían índices de filas | Solo celdas de importes con rótulo y columna válidos; descarte de cabeceras/notas |
| RFNE como 1.05% | Proporción original usada como porcentaje | Conversión × 100 y reconciliación con fondos disponibles/requeridos |
| Liquidez o RCL con cifras monetarias tratadas como ratios | Primer match genérico de “Moneda Nacional”, “Total” o “APR”; unidad inferida por módulo | Unidades explícitas y selección exacta del ratio |
| Provisiones crediticias equivocadas | Primera coincidencia de “Provisiones”, también presente en inversiones y pasivos | Identidad del rubro y selección dentro del bloque de créditos |
| Series históricas cruzadas | Búsqueda por etiqueta, sin ruta padre; fuzzy matching entre conceptos | ID por estado/rubro y claves normalizadas estrictas |
| ROE/ROA o márgenes ausentes | Patrones que no coincidían con los nombres oficiales y restricciones a diciembre | Indicadores oficiales completos y fórmulas YTD consistentes |
| Sistema y bancos finales incompletos | Fórmula fija de bloques de 12 columnas, inválida en los bloques finales | Detección de encabezados reales; recuperación del total oficial y de cada banco |
| Comparaciones aparentemente mensuales con saltos | Se tomaba la última observación anterior, no necesariamente el mes exacto | Comparativos exactos; faltantes visibles |
| Acumulados comparados entre diciembre y enero | Mezcla de stock y flujo YTD | YoY del mismo mes y flujo mensual con reinicio en enero |
| RCL publicado en una carpeta posterior al trimestre declarado | Fecha de URL usada como fecha de observación | Se conservan ambas fechas, se informa el desfase y se suspenden comparaciones automáticas |
| CSS contradictorio | Tres hojas acumuladas, 132 `!important` entre las dos cargadas, múltiples parches | Una hoja de estilos, tokens y reglas responsive; sin `!important` |
| Lectura pesada y repetida | `hub.json` completo, sin caché, incluso para comprobación de cambios | Manifiesto pequeño, datasets separados y caché por versión |
| Publicación sin gate de calidad | Workflow imprimía estado, pero no validaba resultados; reset remoto y copia de un único JSON | Validación previa, publicación conjunta de outputs y detención si cambia `main` |

## Evidencia de datos corregidos

| Caso | Antes | Después, contrastado con XLS |
|---|---:|---:|
| Posición global ME, junio 2026 | S/ 186.28 MM, correspondiente al BCP | **S/ 10.23 MM, BanBif** |
| RFNE, julio 2026 | Fecha serial 46,234 susceptible de seleccionarse como ratio | **105.02%** |
| ROE BanBif, julio 2026 | No encontrado por el selector de ROE; dataset mezclado con bancos vecinos | **14.00%**, fila oficial de utilidad anualizada/patrimonio promedio |
| Cobertura crediticia, julio 2026 | El resumen podía usar provisiones de inversiones por coincidencia de nombre | **191.31%** sobre cartera atrasada |
| Participación de créditos BanBif, julio 2026 | 4.0147% con universo incompleto | **3.9738%** sobre el total oficial local |
| Banco Efectiva, activos julio 2026 | `null` | **S/ 2,213.99 MM** |
| Total banca múltiple local, activos julio 2026 | `null` | **S/ 604,336.73 MM** |

Los valores monetarios se derivan de importes SBS en miles de soles. La presentación en millones utiliza dos decimales, sin redondear antes de calcular ratios.

## Decisiones de arquitectura

- Lectores de formatos separados de la lógica de cada reporte y de la orquestación de descargas.
- Parsers por topología conocida: bancos en columnas, bancos en filas, hojas dedicadas y bloques contables.
- Tres formatos históricos de capital reconocidos explícitamente; no se acepta silenciosamente un formato desconocido.
- `hub.json` mantiene trazabilidad completa; el navegador consume salidas compactas validadas.
- Identificadores estables y metadatos por métrica; fechas del encabezado y unidades se verifican antes de publicar.
- JavaScript en módulos ES, sin funciones globales ni dependencias de producción. jsdom se usa solo en desarrollo/pruebas.
- SVG nativo para líneas y barras. No depende de Google Fonts, Font Awesome o un CDN de gráficos. Rangos explícitos y tabla accesible de valores en lugar del zoom dependiente de ECharts.
- Las fórmulas de ratios de análisis no añaden diferencia de cambio o derivados por segunda vez cuando ya están contenidos en ingresos financieros.
- No se inventan códigos SBS detallados, desagregación BCRP dentro de rubros agregados ni datos de clasificadoras.

## UX y funcionalidad

Las trece entradas principales se consolidaron en seis vistas; los ocho reportes siguen accesibles. Se eliminaron repeticiones entre estadísticas, radar y tarjetas sin contexto.

El panorama muestra activos, créditos, obligaciones con el público, patrimonio, mora y utilidad; permite profundizar en cuentas. Los movimientos se ordenan por importe, porcentaje, aumento, caída o participación, con materialidad configurable. El árbol conserva rutas, búsqueda de padres, expansión, selección y series históricas. Las tablas mantienen encabezados y primera columna fijos, contenedores con desplazamiento y formatos consistentes.

Las vistas de 12 meses y cinco años comparan fechas exactas. Los rangos de series son 12M, 24M, 5A y máximo disponible. Las estadísticas incluyen máximo/mínimo con fecha y CAGR únicamente para series monetarias con condiciones matemáticas válidas.

Los colores de mejora/deterioro se aplican a indicadores con dirección económica definida; el aumento de un saldo no se presenta automáticamente como mejora.

## Antes y después

| Dimensión | Antes | Después |
|---|---|---|
| JSON necesario en la apertura | 10,927,313 bytes | Aproximadamente 1.60 MB: manifiesto, panorama, financiero y salud |
| Reducción de JSON inicial | — | Aproximadamente 85% sin compresión HTTP |
| Dependencias externas del frontend | ECharts, Google Fonts y Font Awesome | Ninguna dependencia de producción |
| Navegación principal | 13 módulos con estructuras repetidas | 6 vistas con fuentes regulatorias agrupadas |
| JavaScript | Embebido en `index.html` | 7 módulos con responsabilidades separadas |
| CSS cargado | 2 hojas y 132 `!important`; otra hoja sin uso | 1 hoja con tokens y cero `!important` |
| Último balance | Julio 2026 disponible | Julio 2026 llega a todas las vistas financieras |
| Fecha de indicador | Frecuentemente heredada del módulo o archivo | Fecha por observación; rezagos y desfases visibles |
| Identidad de cuentas | Etiqueta, posición y fuzzy matching | Estado, referencia, padre y ruta |
| Calidad | Estado de descarga | Validación de estructura, ecuaciones y paridad frontend |

No se presenta una cifra de mejora en segundos: **no se midió el tiempo de carga en un navegador real**. La reducción anterior corresponde al volumen de JSON solicitado, medido en archivos. El objetivo no fue minimizar líneas: se añadieron metadatos, pruebas y documentación a cambio de retirar decisiones implícitas y código antiguo.

## Pruebas ejecutadas y segunda revisión

- **17 pruebas Python:** límites entre bancos, fila FX escasa, escala/reconciliación RFNE, periodo RCL, unidades, bancos finales, fechas, estructura, tipos, faltantes y compilación idempotente.
- **8 pruebas JavaScript de cálculos/tablas:** meses exactos, pb, YTD/enero, valores nulos, jerarquía, materialidad, huecos de serie y CSV.
- **3 pruebas de integración DOM:** las seis vistas, ocho opciones regulatorias, filtros, historia, selección de periodos, tema, caché y errores de carga, usando datos reales.
- Gate de entrega: sintaxis JavaScript, IDs HTML, imports, referencias, JSON, catálogo, versiones y fechas fuente–frontend.
- Reconciliación de MN/ME/Total, activo–pasivo–patrimonio y total de sistema en todo el histórico financiero.
- Se ejecutó la descarga y el reprocesamiento de las ocho fuentes; el resultado contiene 416 periodos fuente y **cero errores de datos**.

La segunda revisión corrigió: formatos antiguos de capital, notas que alteraban nombres de banco, valores nulos convertidos inadvertidamente a cero, unidades de APR, diferencias entre porcentaje y proporción, y limpieza de recursos sin uso. Los tests incluyen datos adversos que deben fallar; esos fallos inducidos no son errores del dataset entregado.

Las pruebas DOM **no renderizan píxeles ni demuestran que el CSS se vea correctamente**. Se implementaron layouts para monitor/laptop/tablet/móvil y se revisaron sus reglas, pero queda pendiente la comprobación visual en navegador real porque esa capacidad no estuvo disponible. Tampoco se ejecutó este nuevo workflow dentro de GitHub; sí se ejecutaron localmente sus scripts y gates.

## Archivos retirados y nuevos

Retirados, tras comprobar ausencia de dependencias: `hub.css`, `assets/hub.css`, `assets/treasuryhub.css`, `WORKFLOW_BACKUP_sync-hub.yml`, `data/ratings_reference.json` y caché `.pyc` versionada. Se reemplazaron el HTML y el sincronizador, preservando lectores válidos de formatos en un módulo separado.

Nuevos: `assets/app.css`, siete módulos JS, tres archivos de configuración, lectores/parsers/compilador/validador Python, datasets compactos y manifiesto, DATA HEALTH, tests y ocho fixtures, workflow de validación, `package.json`/lockfile y documentación de auditoría/fuentes/cambios. El ZIP no incluye `.git`, entornos, cachés ni `node_modules`.

## Limitaciones reales

1. **Revisión visual pendiente en navegador real**, incluyendo dimensiones, scroll sticky y accesibilidad con lector de pantalla. Las pruebas automatizadas realizadas son de datos, código y DOM.
2. **RCL:** el último archivo bajo junio 2026 declara enero–marzo 2026. Se informa marzo como periodo del dato y junio como periodo de archivo; no se afirma que sea un ratio de cierre de junio.
3. **Rezagos de publicación:** capital, liquidez detallada y posición ME llegan a junio; balance, indicadores, sectores y RFNE llegan a julio de 2026. Los cambios de catálogo históricos quedan visibles como advertencias, no se rellenan con series incompatibles.
4. **Códigos detallados y BCRP:** B-2201 no publica el plan de cuentas 1101 ni desagregaciones no contenidas en el archivo. Se documenta la limitación del buscador.
5. **Nuevo formato SBS:** se requiere actualizar el parser y sus pruebas cuando cambie una estructura no reconocida; la degradación conserva el último dato validado y registra el error.
6. **Publicación:** los permisos y protección de `main` pertenecen al repositorio del usuario. No se desplegó ni se alteró esa configuración.
