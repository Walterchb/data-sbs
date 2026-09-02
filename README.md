# BanBif Regulatory & Financial Intelligence Hub · v3

## Qué se corrigió

1. **Data regulatoria**
   - El sincronizador ahora soporta archivos SBS OOXML y archivos `.xls` binarios reales mediante `xlrd`.
   - RCL usa el reporte público vigente **B-230811**.
   - RFNE usa el reporte público vigente **R-0010**.
   - Cada fuente guarda su estado de sincronización y errores en `data/hub.json`.

2. **Móvil**
   - Topbar y acciones siguen la lógica responsive del TC Hub.
   - Módulos regulatorios se desplazan horizontalmente.
   - KPIs quedan 2×N.
   - Gráficos pasan a una columna.
   - La matriz de datos se transforma en tarjetas móviles con MN / ME / Total / Variación.

3. **Fecha**
   - Se eliminó el texto redundante que aparecía debajo del selector de fecha.

4. **Actualizar**
   - Ya no recarga la web.
   - Abre un popup de sincronización.
   - El popup abre el workflow de GitHub Actions y monitorea `hub.json` cada 15 segundos para detectar el nuevo commit sin recargar la página.

   > GitHub Pages es estático: disparar `workflow_dispatch` directamente desde JavaScript requeriría exponer una credencial. Por seguridad el botón abre Actions y el Hub monitorea el resultado.

5. **Gráficos**
   - Ejes y tooltips quedan con máximo **1 decimal**.

6. **Consultas rápidas**
   - Eliminadas.

7. **Datos y cuentas**
   - Panel de ancho completo.
   - Desktop: matriz con encabezado y primera columna sticky.
   - Columnas: **MN · ME · Total · Comparativo · Δ · Δ% · Fuente**.
   - Búsqueda.
   - Filtro Todas / Principales / Con variación.
   - Orden por impacto.
   - Toggle de decimales.
   - Toggle de barras de proporción.
   - Vista móvil mediante tarjetas agrupadas.

## Archivos que debes reemplazar en `Walterchb/data-sbs`

Sube/reemplaza:

- `index.html`
- `assets/treasuryhub.css`
- `assets/hub.css`
- `data/hub.json`
- `scripts/sync_hub.py`
- `requirements.txt`
- `.github/workflows/sync-hub.yml`

El ZIP incluye además `WORKFLOW_BACKUP_sync-hub.yml` como copia visible del workflow.

## Primera ejecución

Después de subir los archivos:

1. `Settings → Actions → General → Workflow permissions → Read and write permissions`
2. `Actions → Sincronizar BanBif Regulatory Hub`
3. `Run workflow`

La primera ejecución hará el backfill; luego el cron corre diariamente a las **12:35 UTC / 07:35 Perú**.

## Fuentes regulatorias

- B-2201 — Balance y P&L
- C-1203 — Créditos Directos por Sector Económico
- B-2401 — Indicadores Financieros
- B-3302 — Patrimonio Efectivo y Ratio de Capital Global
- B-2340 — Ratios de Liquidez
- B-230811 — Ratio de Cobertura de Liquidez
- R-0010 — Ratio de Financiación Neta Estable
- B-2368 — Posición Global en Moneda Extranjera


## v3.2 — Ajuste solicitado

- La sección **Datos y cuentas SBS** volvió al diseño de la v3.
- Se mantiene el encabezado fijo al hacer scroll.
- Todos los importes, porcentajes, KPIs, estadísticas y tooltips se muestran con **2 decimales**.
- Se agregó la columna **Rubro**.
- El buscador ahora busca tanto por **cuenta** como por **rubro**.
- Esto permite distinguir, por ejemplo, `Fondos Interbancarios` bajo `Ingresos Financieros` de `Fondos Interbancarios` bajo `Gastos Financieros`.
- Se mantiene el orden original SBS salvo que el usuario active manualmente el botón de ordenar por impacto.


## v3.3

- Se eliminó la columna **Rubro**.
- Al buscar, el rubro principal se mantiene visible en la misma columna de Cuenta/Indicador.
  Esto permite distinguir líneas repetidas como `Fondos Interbancarios` bajo `Ingresos Financieros`
  y `Gastos Financieros`.
- Se mantienen **2 decimales**.
- Se agregó selector de vista en **Datos y cuentas SBS**:
  - **ACTUAL**: MN / ME / Total / Comparativo / Δ / Δ%.
  - **5 AÑOS**: mismo mes del periodo seleccionado en los últimos cinco años. Esto evita comparar
    acumulados YTD de meses diferentes.
  - **12 MESES**: evolución mensual de Total durante los últimos doce meses.
- En móvil, las vistas históricas se muestran como tarjetas con scroll horizontal por periodo.
- Se hizo un nuevo pase responsive completo para topbar, fecha, módulos, KPIs, gráficos,
  paneles, toolbar de datos y fuentes.


## v3.4 — Ratings Lens + jerarquía + señales de tendencia

### Datos y cuentas SBS
- Jerarquía reforzada: rubros principales destacados y subcuentas indentadas.
- El rubro sigue apareciendo cuando una búsqueda encuentra una subcuenta.
- Se eliminó `dataSummary`.
- En **5 AÑOS** y **12 MESES** cada valor incluye:
  - ▲ verde: aumentó frente al periodo previo.
  - ▼ rojo: cayó frente al periodo previo.
  - ● gris: sin cambio.
- El color en esta tabla indica **dirección**, no si el movimiento es bueno o malo.

### Clasificadoras / Ratings Lens
Nuevo módulo basado en los informes PCR y Moody's Local auditados a diciembre de 2025.

Organiza las métricas que las clasificadoras monitorean en:
- Calidad de activos
- Cobertura
- Liquidez y fondeo
- Solvencia
- Rentabilidad
- Eficiencia
- Riesgo de mercado

Vistas:
- **Comparar**: SBS actual vs valor usado por las clasificadoras, benchmark y lectura.
- **Histórico 5Y**: serie anual 2021-2025 usada en los anexos / análisis.
- **Watchlist**: indicadores del informe que no pueden reconstruirse directamente desde B-2201, como concentración Top 20, provisiones voluntarias o garantías.

La capa de referencias queda en `data/hub.json` bajo `ratings` y no se elimina cuando el workflow actualiza SBS.


## v3.5 — Intelligence cockpit

- Se corrige una decisión de arquitectura de v3.4: la referencia de clasificadoras vive ahora en `data/ratings_reference.json`, separada de `data/hub.json`. Así una mejora visual nunca vuelve a borrar data sincronizada SBS.
- El ZIP de reemplazo de v3.5 **no incluye `data/hub.json`**.
- `scripts/sync_hub.py` incorpora fallback a las rutas XLS mensuales canónicas de SBS cuando la página de estadísticas no expone enlaces en HTML.
- Se corrige el cálculo de provisiones de cartera: B-2201 contiene varias filas llamadas `Provisiones`; para cobertura se usa la de mayor magnitud, que corresponde a cartera de créditos, evitando tomar la provisión de inversiones.
- El módulo Clasificadoras se rediseñó como un observatorio visual: Panel, Histórico 5Y y Evidencia. No usa una tabla plana.
- Las métricas sin fuente regulatoria cargada muestran `Ref. dic-25 / Pendiente <código SBS>` explícitamente en lugar de celdas vacías.


## v3.7 — corrección integral

Esta versión se reconstruyó desde la última base estable y no desde la v3.6 defectuosa.

### Corrección crítica
La v3.6 llamaba `setupTrendMetric()`, `renderCharts()`, `renderStats()` y `renderRadar()` pero esas funciones habían sido eliminadas accidentalmente del JavaScript. Eso detenía `renderAll()` y dejaba la interfaz en estado `Consultando`.

v3.7 restaura toda la cadena:
`setupTrendMetric → trendSeries → renderCharts → renderStats → renderRadar`.

Además, cada bloque se ejecuta mediante `safeCall`, por lo que un fallo de un gráfico ya no impide que se muestren KPIs, Datos y cuentas o Fuentes SBS.

### Datos y cuentas
- Encabezado de columnas fijo.
- `group-row` exactamente `#0b3654`.
- Jerarquía fija mediante un overlay estable:
  - ACTIVO/PASIVO/etc.
  - rubro activo: DISPONIBLE, INVERSIONES NETAS..., etc.
- Los renglones reales ya no usan múltiples `position:sticky`; esto elimina los encabezados que quedaban pegados/solapados.
- ACTUAL / 5 AÑOS / 12 MESES funcionan con delegación de eventos.
- Búsqueda conserva el rubro padre.
- 2 decimales.

### Clasificadoras
100% SBS. No se cargan ni se leen archivos con cifras PCR/Moody's.
Los reportes usados son B-2201, B-2401, B-3302, B-2340, B-230811, R-0010 y B-2368.
Cuando un reporte regulatorio tiene rezago, la tarjeta muestra el periodo SBS real utilizado.

### Robustez
- Los reportes regulatorios usan el último periodo disponible <= a la fecha seleccionada.
- Si ECharts/CDN falla, la tabla continúa funcionando.
- Se muestra un error visible si una sección no puede renderizar.
- `setupDate` valida que existan periodos.


## v3.8 — sincronización SBS corregida

El run del workflow permitió identificar cuatro fallas independientes:

1. El repo tenía `requirements.txt` con `xlrd`, pero el workflow publicado no ejecutaba `pip install -r requirements.txt`.
   Por eso fallaban C-1203, B-3302 y B-2368 con `No module named 'xlrd'`.

2. Algunos B-230811 son OOXML con un relationship target absoluto (`/xl/worksheets/...`).
   El parser anterior lo convertía en `xl//xl/worksheets/...`. Se normalizan ahora todas las rutas OOXML.

3. El parser genérico exigía al menos tres números en la misma fila del banco.
   RCL y RFNE pueden tener una sola métrica; ahora una fila con una única cifra válida se procesa.

4. Si la página SBS exponía exactamente tres enlaces, el código no activaba el fallback de URLs mensuales.
   Esto dejó B-2401 y B-2340 con solo tres meses. Ahora se combinan SIEMPRE enlaces descubiertos + URLs canónicas.

Adicionalmente:
- se soportan `Setiembre` y `Septiembre`;
- se amplía el backfill a 2021 para series con histórico disponible;
- 404 de meses aún no publicados se registran como `miss`, no como error del parser;
- al final del workflow se imprime una tabla `SBS SOURCE HEALTH`;
- `hub.json` guarda `meta.source_health` y `meta.sync_version = 3.8`.


## v3.9 — parser universal para XLS SBS

El run de v3.8 confirma que `xlrd` ya funciona: B-2201, B-2401 y B-2340 cargan. Los reportes restantes fallan sistemáticamente por estructura/formato.

v3.9 agrega soporte para BIFF8, OOXML, Excel 2003 XML/SpreadsheetML, HTML disfrazado de XLS y texto delimitado. También amplía la detección de BanBif a `Banco Interamericano`, `Interamericano`, `BanBif`, `BIF`, `B. Interamericano` y RUC `20101036813`.

Si todavía queda un formato excepcional, el error del workflow mostrará formato físico, dimensiones de hojas y celdas cercanas con `INTERAM/BANBIF/BIF`, para que el siguiente ajuste sea determinístico.
