# Actualización: garantías y ayudas de lectura

## Instalación

1. En GitHub Desktop, haz Fetch/Pull antes de copiar los archivos.
2. Descomprime este paquete y copia su contenido sobre la carpeta del repositorio, respetando las rutas. Incluye la carpeta `.github` si aparece en tu explorador.
3. Haz Commit y Push. Tras la publicación, recarga con Ctrl+F5.

El paquete conserva los cambios anteriores e incorpora B-2366. No reemplaza `data/hub.json`, los estados financieros ni los demás reportes existentes, salvo B-2369 que se conserva del paquete anterior. No reemplaces la carpeta completa del repositorio: copia y combina los archivos incluidos.

## Indicadores → Garantías

- Histórico de enero de 2021 a julio de 2026, conectado con entidad y fecha.
- Total de créditos directos, participación por garantía, monto por componente y variaciones MoM, YTD y YoY del monto.
- Selecciona una fila para ver su histórico. Las categorías muestran el porcentaje publicado; la fila Total muestra el saldo monetario.
- Garantías preferidas se presenta como subtotal, con cuatro componentes indentados. No se suma el subtotal con sus hijos.
- La descarga incorpora el nombre oficial de la entidad, unidades, origen del monto, definición y URL de la fuente. También funcionan la copia de series y Preparar imagen.

B-2366 publica participaciones porcentuales y el total de créditos directos en miles de soles. El monto por componente se calcula como `total × participación / 100`, conservando la precisión antes de mostrar dos decimales. No es una tasación de las garantías ni una nueva cartera que deba sumarse a los créditos. Pueden existir pequeñas diferencias por redondeo en la fuente.

El agregado publicado incluye sucursales del exterior. No se presenta como Banca Múltiple local ni se sustituye BCP local por BCP con exterior. Si el ámbito solicitado no está publicado, se indica en pantalla.

Se conservan las correcciones publicadas fuera del intervalo 0–100%, con un aviso para la entidad y periodo afectados. Por ejemplo, el archivo de julio de 2026 contiene un ajuste negativo en primera hipoteca de Falabella. No se elimina ni se convierte en cero.

La fuente queda incorporada a la actualización automática y a la construcción de los datos. Hasta la siguiente ejecución del proceso, el manifiesto anterior puede seguir mostrando las fuentes de su última publicación; la nueva pestaña carga B-2366 de forma independiente.

## Ayudas

Las ayudas de los rubros de B-2201 ahora distinguen qué representa la cifra y cómo se relaciona con otras cuentas: activo o pasivo, ingreso o gasto, saldo o flujo, provisión o exposición. También se ampliaron las ayudas de indicadores, ratios calculados, capital, liquidez, RCL, RFNE, estructura y posición ME.

Las explicaciones son resúmenes de lectura, no citas textuales ni sustitutos de las normas. Cuando se usa una definición del glosario, se identifica su base; los ejemplos y la interpretación bancaria se presentan como explicaciones prácticas. Los agregados “Otros” no reciben una composición inventada.

Ejemplo: al buscar “créditos indirectos”, tanto el buscador global como Cuentas SBS permiten relacionar:

- Avales, cartas fianza, cartas de crédito y aceptaciones bancarias: compromisos.
- Líneas no utilizadas y créditos no desembolsados: compromisos todavía no utilizados.
- Balance → Provisiones → Créditos indirectos: saldo provisionado.
- Resultados → servicios de créditos indirectos: ingresos o gastos de servicios.
- Resultados → Provisiones para créditos indirectos: gasto del periodo.

El total de Contingentes también contiene derivados y otros compromisos: no debe confundirse íntegramente con créditos indirectos. Las referencias de filas se conservan como referencias de B-2201; no se inventan códigos contables.

Las ayudas tienen fondo oscuro, enlace a la fuente y botón accesible para abrirlas en móvil. No modifican el alto de las filas; se cierran con Escape o al pulsar fuera.

## Fuentes

- [B-2366: Créditos por tipo de garantía](https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2366). Archivos originales mensuales, con fecha, entidad y celda de origen conservadas en la extracción.
- [Glosario de términos e indicadores SBS](https://www.sbs.gob.pe/app/web_doc/Paginas/documentos.aspx?cod=SF-0002). Crédito directo e indirecto, CAR, provisiones, patrimonio, rentabilidad y liquidez.
- [Manual de Contabilidad SBS](https://www.sbs.gob.pe/regulacion/plan-de-cuentas/sistema-financiero/bancos-financieras-y-otros). Referencia de consulta para descripción y dinámica contable. Las ayudas prácticas no asignan códigos que no aparecen en B-2201.
- [Información complementaria y Anexo 2 SBS](https://www.sbs.gob.pe/normativa-y-estandares/normativa/normativa-sbs/plan-de-cuentas/planes-de-cuenta-del-sistema-financiero/informacion-complementaria-de-manual-de-contabilidad).

## Verificación

82 pruebas JavaScript y 27 Python. Conciliación del total BanBif de B-2366 con la suma de créditos vigentes, refinanciados/reestructurados y atrasados de B-2201 en los 67 meses. Validación de subtotales, porcentajes ponderados y suma de entidades durante la extracción. Comprobación en navegador de PC y móvil, cambio de ámbito, selección de serie, tooltips con enlaces, búsqueda y CSV. Construcción integrada sin errores; conserva los avisos preexistentes de otras fuentes.
