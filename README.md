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
