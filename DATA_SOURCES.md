# Fuentes y recorrido de datos

Todas las descargas pasan por `sync_hub.py` y los lectores `sbs_workbook.py`. La extracción específica se realiza en `strict_parsers.py`; `build_data.py` valida y compila.

| Fuente SBS | Periodos | Observaciones BanBif | Último archivo | Unidad | Archivo frontend | Destino |
|---|---:|---:|---|---|---|---|
| [B-2201 · Balance y P&L](https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2201) | 67 | 9983 | 2026-07 | Miles de PEN | overview.json + financial.json | Panorama / Cuentas / Movimientos / Peers |
| [B-2336 · Créditos a Actividades Empresariales por Sector Económico](https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2336) | 67 | 1239 | 2026-07 | Mixta, explícita por métrica | reports/B-2336.json | Indicadores y riesgos / Peers |
| [B-2401 · Indicadores Financieros](https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2401) | 67 | 1354 | 2026-07 | Mixta, explícita por métrica | reports/B-2401.json | Indicadores y riesgos / Peers |
| [B-2402 · Patrimonio Efectivo y Ratio de Capital Global](https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2402) | 66 | 648 | 2026-06 | Mixta, explícita por métrica | reports/B-2402.json | Indicadores y riesgos / Peers |
| [B-2340 · Ratios de Liquidez](https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2340) | 66 | 396 | 2026-06 | Mixta, explícita por métrica | reports/B-2340.json | Indicadores y riesgos / Peers |
| [B-230809 · Ratio de Cobertura de Liquidez](https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-230809) | 9 | 1215 | 2026-06 | Mixta, explícita por métrica | reports/B-230809.json | Indicadores y riesgos / Peers |
| [B-234021 · Ratio de Financiación Neta Estable](https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-234021) | 8 | 816 | 2026-07 | Mixta, explícita por métrica | reports/B-234021.json | Indicadores y riesgos / Peers |
| [B-2368 · Posición Global en Moneda Extranjera](https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2368) | 66 | 264 | 2026-06 | Mixta, explícita por métrica | reports/B-2368.json | Indicadores y riesgos / Peers |

## Trazabilidad

`data/hub.json` conserva URL, nombre y SHA-256 del archivo, versión del parser y periodo. Cada métrica regulatoria incluye hoja, fila, columna, unidad y fecha efectiva. El balance conserva las filas del reporte y un catálogo de rutas padre/hijo.

En RCL, el último archivo está bajo junio 2026, pero su encabezado declara enero–marzo 2026. La fecha efectiva es marzo 2026. El frontend muestra ambas y advierte el desfase. No equivale a información de cierre de junio.

B-2201 es mensual y las cifras son miles de soles, incluidas MN y ME. B-230809 es trimestral y usa promedios diarios. B-234021 es mensual y su ratio está almacenado en proporción en el XLS, normalizada a %.

## Fixtures reproducibles

`tests/fixtures/*.json` contiene celdas no vacías de los últimos ocho archivos SBS inspeccionados. Permite reproducir las regresiones sin acceso a la red; no se trata de datos sintéticos. Los XLS completos de descarga se excluyen del paquete por ser caché reproducible.

## No incluidos

No hay conexión a tipo de cambio diario ni a fuentes de clasificadoras externas en el repositorio funcional recibido. No se añadieron datos o fechas inventados para esos módulos.
