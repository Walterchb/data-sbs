# Actualización: rentabilidad SBS, mora real y participación

Copia el contenido del ZIP sobre tu repositorio actualizado con Pull. Haz Commit y Push; después recarga la web con Ctrl+F5. Incluye código y la fuente nueva B-2369, sin reemplazar los estados financieros ni los otros reportes existentes.

## Dónde consultar

- Indicadores → Ratios de análisis: ROAE, ROAA, mora real, morosidad con castigos y castigos acumulados 12M. Hay fórmulas, histórico, variaciones y enlaces SBS.
- Indicadores → Indicadores: nombres ROAE/ROAA aclarados, ratios calculados identificados y cobertura del ámbito local explicada.
- Indicadores → Castigos: flujos mensuales por tipo. Historial incorporado: enero 2021 a julio 2026.
- Comparar → Datos y estadísticas: % BM local y % BM + exterior, también en CSV. Solo para activos, créditos, depósitos, patrimonio y utilidad. Los ratios no tienen cuota de mercado. Una serie que incluye exterior no se divide entre el total local.
- Preparar Informe: nuevos cálculos predeterminados con cuentas, meses, fórmulas editables y referencias. Excel mantiene fórmulas nativas y PDF identifica B-2369 correctamente.

## Metodología y conciliación

ROAE = utilidad neta 12M / patrimonio promedio de los últimos 12 cierres × 100.
ROAA = utilidad neta 12M / activo promedio de los últimos 12 cierres × 100.
Utilidad 12M = utilidad YTD del mes + utilidad de diciembre anterior − utilidad YTD del mismo mes anterior. En diciembre se usa el resultado anual. No se multiplica la utilidad semestral por dos y no se usa un promedio de trece cierres.

Fuente: [Glosario SBS, rentabilidad](https://www.sbs.gob.pe/app/web_doc/Paginas/documentos.aspx?cod=SF-0002), EEFF B-2201 y contraste con B-2401. Los cálculos coinciden con los indicadores oficiales de BanBif en todos los meses con historia suficiente.

Mora real = (CAR + castigos 12M) / (créditos brutos + castigos 12M) × 100. CAR = atrasados + refinanciados y reestructurados. Castigos 12M = suma de doce flujos mensuales de [B-2369](https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2369). Se conservan los ajustes negativos publicados por SBS; no se convierten a cero. Un mes ausente no se considera cero.

La mora ajustada oficial B-2401 incluye también transferencias de cartera, por lo que se conserva separada. El saldo de créditos castigados de cuentas de orden no sustituye al flujo mensual.

BanBif, junio 2026:

| Concepto | Valor |
|---|---:|
| Utilidad neta 12M, S/ miles | 305,162.33 |
| Patrimonio promedio 12 cierres, S/ miles | 2,196,224.39 |
| Activo promedio 12 cierres, S/ miles | 23,201,193.94 |
| ROAE SBS | 13.89% |
| ROAA SBS | 1.32% |
| Castigos 12M, S/ miles | 152,349.81 |
| Mora real: CAR + castigos | 5.33% |
| Morosidad: atrasados + castigos | 4.05% |

## Banca múltiple local

B-2401 publica un agregado con sucursales en el exterior. El selector local no debe tomarlo como si fuera local. Ahora se reconstruyen con B-2201 local: ROAE, ROAA, morosidad total/MN/ME, refinanciados, cobertura, pasivo/capital y reservas, y eficiencia operativa. Capital y liquidez se obtienen de B-2402 y B-2340 con su fecha declarada.

Los restantes indicadores se mantienen sin dato cuando faltan componentes del ámbito local. B-2369 también incluye bancos con sucursales exteriores; no permite obtener el flujo del sistema local por resta sin un desglose adicional. BCP e Interbank conservan su cobertura publicada en esta fuente.

## Actualización automática y validación

La fuente nueva está registrada en la sincronización habitual. El archivo suplementario inicia B-2369 sin sobrescribir el hub existente; las siguientes sincronizaciones actualizan la fuente y reconstruyen los archivos compactos.

80 pruebas JavaScript y 25 Python. Se conciliaron ROAE/ROAA con todo el histórico oficial disponible, los doce flujos de castigos, las participaciones y las referencias de las exportaciones. Revisión en navegador de escritorio y móvil, PDF y Excel. La compilación sobre los datos existentes completó sin errores; se mantienen los avisos previos de publicación y periodicidad.
