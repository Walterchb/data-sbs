# BanBif · Inteligencia financiera SBS

Dashboard estático para analizar balance, resultados, cambios materiales, indicadores regulatorios y comparación bancaria. Versión 5.0. Compatible con GitHub Pages; no requiere servidor de aplicaciones ni claves API.

## Abrir localmente

Descomprime el ZIP, entra a la carpeta `data-sbs` y ejecuta:

```bash
python -m http.server 8000
```

Abre **http://localhost:8000**. En Windows también puedes ejecutar `py -m http.server 8000`. No abras `index.html` con doble clic: los módulos y JSON requieren HTTP.

El ZIP ya incluye datos procesados. No necesitas instalar Node ni Python adicional para ver los datos incluidos si ya dispones de un servidor HTTP. Node se utiliza únicamente para las pruebas.

## Qué encontrarás

- **Panorama:** seis KPI, tendencia, movimientos relevantes, indicadores de riesgo y composición de cartera/fondeo.
- **Qué cambió:** variaciones MoM, YoY o contra diciembre, con umbrales de materialidad y navegación al rubro.
- **Cuentas SBS:** árbol contable, búsqueda por nombre/padre/referencia, expansión, ordenamiento, MN/ME/Total, historia de 12 meses y cinco años.
- **Indicadores y riesgos:** ratios calculados sobre B-2201 y siete reportes regulatorios, incluyendo sectores, capital, liquidez, RCL, RFNE y posición ME.
- **Comparar bancos:** cifras homogéneas, total oficial de sistema y grupo configurable de bancos.
- **Fuentes y calidad:** fecha por dataset, diferencias de periodo, rezagos y cambios de catálogo.

Cada vista exporta su propia información a CSV. Las series incluyen una tabla de valores accesible. El tema claro/oscuro persiste en el navegador.

## Arquitectura y flujo

```text
SBS XLS → sbs_workbook.py → strict_parsers.py → hub.json
        → build_data.py → data_health.json + manifest.json
        → overview.json / financial.json / reports/*.json
        → assets/js/data.js → cálculos → vistas, tablas y SVG
```

| Carpeta / archivo | Responsabilidad |
|---|---|
| `index.html`, `assets/app.css` | Estructura semántica y sistema visual responsive |
| `assets/js/app.js` | Estado, navegación y composición de vistas |
| `assets/js/data.js` | Carga diferida, caché y consistencia de versión |
| `assets/js/analytics.js` | Fechas exactas, cambios, materialidad, jerarquía y estadísticas |
| `assets/js/charts.js`, `tables.js`, `format.js` | Gráficos SVG, tablas y formato financiero |
| `assets/js/config.js` | Catálogo de KPI y etiquetas |
| `scripts/sync_hub.py` | Descargas, reintentos y preservación del último periodo válido |
| `scripts/strict_parsers.py` | Extracción específica por reporte, banco, moneda y periodo |
| `scripts/build_data.py` | Validaciones y compilación de datasets para frontend |
| `scripts/validate_project.py` | Referencias, sintaxis y paridad de periodos fuente/frontend |
| `config/` | Fuentes, esquema contable y umbrales configurables |
| `tests/fixtures/` | Celdas extraídas de ocho archivos SBS para pruebas reproducibles |

## Actualizar datos

Python 3.12+:

```bash
python -m pip install -r requirements.txt
python scripts/sync_hub.py
```

Por defecto revisa periodos faltantes, formatos pendientes de reprocesar y los últimos meses susceptibles de revisión. Hasta cuatro descargas concurrentes. Conserva datos válidos si falla una descarga, informa errores y bloquea la publicación si la validación falla.

```bash
python scripts/sync_hub.py --refresh-all
python scripts/sync_hub.py --reports B-2401 B-2402
python scripts/sync_hub.py --offline --refresh-all
python scripts/build_data.py
```

`--offline` requiere XLS previamente descargados en `.cache/sbs`; esa caché se excluye del ZIP. `build_data.py` funciona sin red y con los datos incluidos. No utilices `--skip-build` para publicar; sirve únicamente para recuperación de parsers.

## GitHub Actions y Pages

Sustituye los archivos del repositorio por el contenido de `data-sbs`, incluyendo `.github/`. Mantén Pages apuntando a la raíz de `main`. El botón **Actualizar** abre el workflow existente y permite comprobar la publicación sin exponer credenciales.

- `sync-hub.yml`: ejecución manual y diaria a las 12:35 UTC; descarga, procesa, valida, ejecuta pruebas, muestra DATA HEALTH y publica todos los outputs de una misma versión.
- `validate.yml`: comprueba cambios de frontend/pipeline y pull requests sin descargar fuentes SBS.
- Si `main` cambia durante una sincronización, se detiene el push; vuelve a ejecutar el workflow. Nunca sobrescribe código remoto con `reset --hard`.
- La protección de rama o restricciones de Actions pueden exigir permisos/configuración del propietario. No se modificaron desde esta entrega.

## Pruebas

Node 20+ y Python 3.12+:

```bash
npm ci --ignore-scripts
npm test
python -m unittest discover -s tests -p 'test_*.py'
python scripts/validate_project.py
```

Las pruebas DOM usan jsdom: ejecutan las vistas y controles con datos reales, pero **no sustituyen una revisión visual en Chrome/Edge ni prueban dimensiones de pantalla**. En esta entrega no estuvo disponible una sesión de navegador real.

## Reglas financieras

- Importes fuente en miles: se presentan en millones, siempre con dos decimales. Se conserva una escala uniforme para comparación bancaria.
- En B-2201, tanto MN como ME están expresadas en soles. ME no significa US$.
- Liquidez y RCL mantienen importes en USD donde lo indica la fuente.
- Ratios: variación en puntos básicos; múltiplos: diferencia en veces.
- Resultados: acumulados YTD, comparados con el mismo mes del año anterior. El flujo mensual se obtiene por diferencia de acumulados; enero reinicia.
- No se rellenan periodos faltantes, no se toma el periodo anterior como si fuera un MoM/YoY exacto y no se calcula crecimiento con una base cero o negativa.
- Provisiones crediticias: cuenta dentro del bloque de créditos, no la primera cuenta llamada “Provisiones”.
- Sistema B-2201: total oficial local. Las variantes con sucursales del exterior se mantienen separadas. En reportes que usan ámbito exterior, se muestra explícitamente.
- El grupo de bancos suma importes; mora y cobertura se calculan con numeradores/denominadores agregados. Otros ratios oficiales muestran una **media simple**, identificada como tal.
- B-2201 no contiene códigos detallados del plan contable como 1101. Se utilizan referencias de fila y rutas, sin inventar códigos.
- RCL: los archivos disponibles tienen un encabezado trimestral distinto del mes de archivo. Ambos periodos se conservan; la advertencia es visible y se suspenden alertas/comparaciones automáticas de ese indicador.

## Extender el proyecto

**Nueva fuente:** agrega el registro a `config/sources.json`, implementa un parser específico con unidad/celda/fecha, añade una fixture y pruebas, incorpora su salida en `build_data.py` y su pestaña en el frontend. No uses proximidad a una entidad para atribuir valores.

**Nuevo indicador:** define una fórmula en `build_data.py` o un patrón exacto en `KEY_METRICS`; añade su etiqueta/unidad a `assets/js/config.js` y una prueba de numerador, denominador y periodo. Las métricas genéricas de cada reporte se incorporan automáticamente.

**Cambio de estructura SBS:** actualiza el parser y, si corresponde, `config/statement_schema.json` después de comprobar el XLS. Incrementa la versión de parser y fuerza el reprocesamiento; nunca aceptes silenciosamente un cambio de columnas.

Consulta `AUDIT_REPORT.md`, `DATA_SOURCES.md`, `DATA_HEALTH.md` y `CHANGELOG.md` para la evidencia de esta revisión.
