# Preparar Informe: actualización

Consulta **INSTALAR_PREPARAR_INFORME.md** para las instrucciones actuales de gráficos, tablas, carátula y exportaciones.

# Calculadora SBS, ayudas y búsqueda exacta

## Instalación

1. En GitHub Desktop: Fetch origin y Pull origin.
2. Copia el contenido del ZIP sobre la carpeta data-sbs, conservando sus rutas, incluida .github.
3. Commit y Push origin. Tras publicarse, recarga con Ctrl+F5 o recarga la web en móvil.

El paquete incluye las mejoras previas y no reemplaza estados financieros ni históricos.

## Correcciones

- Los encabezados sin definición no abren un tooltip vacío.
- La ayuda de cada cuenta permanece en la línea del rubro, sin añadir una fila al texto.
- Tooltips con fondo azul oscuro y explicaciones de significado, cálculo e interpretación cuando corresponde. Se abren al pasar el mouse, enfocar o tocar el icono; se cierran con Escape o al tocar fuera.
- La primera columna fija conserva el fondo de la fila seleccionada.
- El estado actualizado del topbar dice «Actualizado».
- El buscador permite filtrar por tipo y activar «Coincidencia exacta»: busca la frase o sigla completa en nombres y alias, sin coincidencias parciales ni sugerencias. Por ejemplo, CAR abre Cartera de alto riesgo y no coincide con la palabra cartera.

## Calculadora

Abre el botón de calculadora del topbar. Usa la entidad seleccionada en el dashboard.

1. Elige Balance o Resultados y el periodo. Las cuentas mantienen su jerarquía; puedes desplegarla o buscar por rubro.
2. Elige Total, MN o ME. Todos los importes monetarios de la calculadora están en **S/ miles**, incluido ME (equivalente en soles). Se conserva el signo publicado, incluso el signo negativo de provisiones de balance.
3. Toca + o arrastra la cuenta a la fórmula. Cada cuenta recibe una letra: a, b, c… Puedes combinar periodos; cada variable conserva su fecha, entidad, columna y valor capturado.
4. Escribe una fórmula con +, -, *, /, ^ y paréntesis, por ejemplo `(a+b)/c^(1/360)`. Se admiten punto o coma decimal y constantes editables. No uses separadores de miles. El resultado se actualiza al editar.
5. Para mostrar un cociente como porcentaje, usa `a/b` y el formato Porcentaje. Si escribes `a/b*100`, elige Número para no multiplicarlo nuevamente al mostrar.
6. Pon nombre al cálculo y, opcionalmente, un comentario. Pulsa «Agregar al informe». Puedes editar o eliminar los cálculos agregados.
7. Completa nombre, fecha y conclusión de la revisión y descarga Excel o PDF.

El preparador no aparece en móvil. La web de fondo permanece bloqueada mientras está abierto el modal.

**El borrador se conserva al cerrar y abrir el modal durante la sesión. Recargar o cerrar la página lo elimina.** Los archivos incluyen solo los cálculos agregados al informe; no una fórmula que todavía esté en edición.

Los cálculos sin datos, con división entre cero o resultado no finito no pueden añadirse. La calculadora admite hasta 80 variables y 60 cálculos por revisión. Las unidades de entrada son explícitas; verifica que la operación sea financieramente coherente. Resultados contiene acumulados desde enero, mientras que Balance contiene saldos de cierre.

## Archivos generados

- Excel `.xlsx`: hojas Revisión y Datos; resultados con fórmulas nativas vinculadas a celdas numéricas, fechas de cierre como fechas reales, nombre de entidad SBS, moneda/columna, naturaleza y fuente. Al editar los valores de Datos se recalculan las fórmulas. Las descripciones largas continúan en filas adicionales.
- PDF: nombre y fecha de revisión, fórmula, resultado, cuentas utilizadas, periodos, fuentes y comentarios; paginación automática y tipografías incorporadas. Diseño con títulos azul oscuro y bloques claros inspirado en la referencia visual proporcionada; sin logotipos ajenos.
- Los componentes de exportación y tipografías se sirven desde el repositorio y se cargan cuando exportas.

## Verificación

69 pruebas JavaScript y validación del proyecto aprobadas. Pruebas en navegador de tooltips, selección, búsqueda exacta, clic y arrastre, edición, errores, cuentas con distintas fechas, móvil y modo oscuro. Exportaciones reales revisadas visualmente; se verificó la recalculación de Excel al cambiar un dato y la continuidad de un PDF de cinco páginas. No se abrió el archivo en la aplicación de escritorio Microsoft Excel.
