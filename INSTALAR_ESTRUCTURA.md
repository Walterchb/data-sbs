# Actualización 16 · Indicadores / Estructura

Este ZIP es una actualización para el repositorio data-sbs existente. No es un sitio independiente.

## Instalación en GitHub Desktop

1. Abre tu clon actualizado de `data-sbs` y pulsa **Fetch origin / Pull origin**.
2. Descomprime el ZIP fuera del repositorio.
3. Copia su contenido dentro de la carpeta raíz del repositorio, donde está `index.html`. Combina las carpetas y reemplaza los archivos coincidentes. No borres las carpetas existentes ni subas el ZIP como archivo a GitHub.
4. En GitHub Desktop, crea el commit `Agregar Estructura de créditos y depósitos` y pulsa **Push origin**.
5. Cuando termine la publicación de tu web, recarga con **Ctrl + F5**. Entra en **Indicadores → Estructura**.

El paquete conserva el diseño existente y la selección global de entidad y mes. No reemplaza `data/hub.json`, el manifiesto, los estados financieros, el resumen ni los archivos de entidades. Los nuevos datos se cargan al abrir Estructura y se reutilizan durante la sesión. El botón Actualizar comprueba también estas fuentes.

## Contenido

- **Créditos · B-2334:** corporativos, grandes, medianas, pequeñas y microempresas, consumo y sus dos componentes, e hipotecarios. Filtro de situación: total, vigentes, refinanciados y reestructurados, o atrasados.
- **Depósitos · B-2344:** vista, ahorro, plazo, restringidos y depósitos del sistema financiero y organismos internacionales.
- Total, participación y variaciones **YoY, YTD y MoM**; serie histórica al seleccionar un componente; valores de la serie en el modal y copia a Excel. La exportación de la tabla incluye la fuente y el origen del monto.
- Histórico inicial: **enero de 2021 a julio de 2026**, 67 meses por fuente. La disponibilidad por entidad depende de su presencia en el reporte de cada mes.

## Fuentes y cálculos

[SBS B-2334 — Créditos Directos según Tipo de Crédito y Situación](https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2334)

[SBS B-2344 — Estructura de los Depósitos por Tipo y Empresa Bancaria](https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2344)

Los montos se muestran en S/ millones; el archivo fuente monetario está en miles de soles, por lo que se divide entre 1,000 para mostrarlo.

- B-2334: se conserva el total publicado. Cada tipo se agrega desde sus situaciones. Consumo es un subtotal: no se debe sumar otra vez con revolvente y no revolvente.
- B-2344: SBS publica el total monetario y las participaciones. El monto de cada componente se calcula como **total × porcentaje / 100**, sin redondeos intermedios. Los tipos del público y los depósitos del sistema financiero suman el total.
- Peso de créditos: saldo del componente / total de la situación seleccionada × 100.
- Variación: (saldo actual / saldo base − 1) × 100. MoM usa el mes anterior; YTD, diciembre del año anterior; YoY, el mismo mes del año anterior. Sin base exacta o con base no positiva se muestra un guion.
- Desde octubre de 2024 cambia la tipificación de los créditos empresariales. Sus variaciones que cruzan ese corte se omiten; las estadísticas del gráfico usan el tramo comparable más reciente. Los valores originales siguen disponibles.
- Estos reportes incluyen las sucursales del exterior de BCP. Para el total del sistema o BCP debe elegirse su variante con sucursales del exterior; no se sustituye silenciosamente el ámbito local.
- En abril de 2024 se conserva una discrepancia del archivo B-2334 entre la suma de tipos y el total publicado para Pichincha y el agregado afectado. La pestaña muestra la advertencia al consultar ese corte y entidad.

## Actualización automática

Se agregan ambas fuentes a la configuración y al lector de Excel existente. Los dos archivos `data/supplemental/` contienen únicamente el histórico inicial de las fuentes nuevas y permiten validar la instalación sin reemplazar el histórico principal. Solo se usan si la fuente aún no existe en ese histórico. La siguiente sincronización incorpora esas fuentes al proceso habitual; los datos existentes permanecen como referencia principal.

Si el workflow de sincronización existente está habilitado, el cambio en scripts/configuración dispara la actualización. También puede ejecutarse desde **Actions → Sincronizar BanBif Regulatory Hub → Run workflow**. El botón Actualizar de la web consulta la publicación disponible; las descargas SBS se ejecutan en Actions.

## Actualización 17 · Copiar fechas a Excel

El botón Copiar del modal de valores de la serie exporta las columnas Periodo y Periodo declarado en formato `dd/mm/aaaa`, usando el último día de cada mes. Por ejemplo: `31/07/2025`, `30/04/2026` y `29/02/2024` para un año bisiesto. Se mantienen los valores numéricos y las columnas existentes.

## Actualización 18 · Nombres SBS en exportaciones

Las descargas CSV incorporan `entidad_seleccionada_sbs`. En Comparar y Concentración también se agrega `banco_sbs` para cada banco de la fila. La copia de series a Excel incluye `Entidad SBS`. Se recupera el nombre del reporte correspondiente al periodo, conservando la distinción entre ámbito local y sucursales del exterior. Los grupos calculados no se presentan como bancos oficiales. Los nombres cortos de la interfaz se mantienen.

## Actualización 19 · Nombres de archivos sin tildes

Las descargas de gráficos convierten las letras acentuadas a letras sin tilde y agrupan los separadores. Ejemplo: `Provisiones / Créditos Atrasados` se descarga como `SBS_Provisiones_Creditos_Atrasados.png`. Las etiquetas en pantalla conservan sus tildes.
