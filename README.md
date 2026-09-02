# BanBif Regulatory & Financial Intelligence Hub

Hub estático para GitHub Pages con **frecuencia mensual SBS**.

## Compatibilidad visual con `Walterchb/sbs-tc-contable`

La interfaz fue construida para poder integrarse después con Treasury Hub sin un cambio visual:

- misma familia **Manrope**;
- mismos tokens `--navy`, `--bg`, `--panel`, `--ink`, `--line`, etc.;
- mismo ancho máximo: **1500 px**;
- mismo `--radius: 7px`;
- botones base: **34 px** de alto;
- botones de icono: **34 × 34 px**;
- mismo topbar, logo BIF, status, KPI cards, paneles, tablas y responsive;
- mismo orden de layout principal:
  1. Topbar
  2. Snapshot / Fecha SBS
  3. KPI grid
  4. Tendencia + Variación
  5. Estadísticas + herramienta + tabla
  6. Footer

Los estilos compartidos están aislados en `assets/treasuryhub.css`.  
Los únicos estilos nuevos están en `assets/hub.css`, para que una integración futura pueda compartir el CSS base entre ambos proyectos.

## Módulos

### Financieros — B-2201
- Resumen financiero
- Balance
- Cartera y calidad
- Estado de Resultados
- Peers y market share

### Regulatorios
- **C-1203** — Créditos Directos por Sector Económico
- **B-2401** — Indicadores Financieros
- **B-3302** — Patrimonio Efectivo y Ratio de Capital Global
- **B-2340** — Ratios de Liquidez
- **B-230809** — Ratio de Cobertura de Liquidez
- **B-234021** — Ratio de Financiación Neta Estable
- **B-2368** — Posición Global en Moneda Extranjera

## Data

El seed entregado contiene información B-2201 verificada disponible durante la construcción:
Dic-2021, Dic-2022, Dic-2023, Dic-2024, Dic-2025 y Jun-2026, incluyendo peers.

Al hacer el primer push, GitHub Actions:
- completa B-2201 mensualmente desde 2021;
- carga los módulos regulatorios desde 2024;
- vuelve a revisar los periodos recientes por correcciones SBS;
- no estima ni interpola datos.

Puedes cambiar `REG_START_YEAR=2024` a `2021` en `scripts/sync_hub.py` si quieres backfill regulatorio más largo.

## Publicación

1. Sube **el contenido de esta carpeta** a la raíz de un repositorio GitHub.
2. `Settings → Actions → General → Workflow permissions → Read and write permissions`.
3. `Actions → Sincronizar BanBif Regulatory Hub → Run workflow`.
4. `Settings → Pages → Deploy from a branch → main → / (root)`.

## Metodología

- **Balance:** stock al cierre mensual.
- **P&L:** acumulado YTD; el hub usa el mismo mes del año anterior para comparaciones de resultados.
- **Peers:** B-2201 se extrae para todas las empresas bancarias y el front prioriza BCP, BBVA, Scotiabank, Interbank y BanBif.
- **Módulos regulatorios:** se conservan las etiquetas originales del XLS SBS. El normalizador busca BanBif tanto en orientación por filas como por columnas.

## Estructura

```text
/
├─ index.html
├─ favicon.svg
├─ assets/
│  ├─ treasuryhub.css   # CSS compartido / integración futura
│  └─ hub.css           # solo extensiones del Regulatory Hub
├─ data/
│  └─ hub.json
├─ scripts/
│  └─ sync_hub.py
└─ .github/workflows/
   └─ sync-hub.yml
```
