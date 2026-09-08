# Control de calidad de información

`python scripts/build_data.py` genera `data/data_health.json`. El frontend lo muestra en **Fuentes y calidad** y los workflows lo adjuntan al resumen de ejecución.

## Controles

| Control | Comportamiento |
|---|---|
| Dataset/periodo vacío, valores no numéricos, formato no validado | ERROR; no sustituye los datasets del frontend |
| Columnas, moneda, entidad o fecha de encabezado inesperadas | El parser rechaza el archivo y conserva el periodo previo |
| Fechas duplicadas/futuras/desordenadas | ERROR |
| Periodos faltantes | WARNING, con lista de periodos |
| Actualización y rezago relativo | WARNING según frecuencia y fecha máxima real |
| MN + ME = Total | Tolerancia máx. de 0.02 miles de PEN o 1 ppm |
| Activo = Pasivo + Patrimonio | Misma tolerancia |
| Sistema = suma de bancos, sin agregados duplicados | Validación de activos, créditos y obligaciones con el público |
| RFNE | Proporción original × 100; reconciliación con financiación disponible/requerida |
| RCL | Conserva trimestre del encabezado y mes del archivo; advierte diferencias |
| Cambios de catálogo | WARNING; no empalma series por similitud textual |
| Periodos perdidos entre fuente y frontend | `validate_project.py` bloquea la entrega |
| Versiones mezcladas durante publicación | El frontend exige coincidencia con el manifiesto |

## Significado del estado

- `OK`: pasó los controles implementados.
- `WARNING`: información utilizable que exige revisar fechas, cobertura o catálogo.
- `ERROR`: validación fallida; el workflow no debe publicar.

`OK` no certifica exactitud absoluta ni reemplaza la validación regulatoria institucional. Las cifras se contrastaron con las fuentes disponibles y con ecuaciones comprobables.

Los cambios extremos de saldo se presentan en **Qué cambió**, después del filtro de materialidad; no se consideran errores por magnitud solamente.

Los umbrales están en `config/analytics.json`. La materialidad de los movimientos aplica S/ 10 MM de cambio, 0.25% de peso sobre activo y 1% de variación, con excepción para cambios absolutos ≥ S/ 50 MM.

Las escrituras son atómicas por archivo. La compilación produce un identificador común para todas las salidas; GitHub Actions las publica en el mismo commit. La reconstrucción con los mismos datos y la misma fecha de control produce bytes idénticos. `as_of` cambia al validar en un día diferente; no representa nueva información SBS.
