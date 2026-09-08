# Formato Treasury Hub · actualización de interfaz

Esta actualización se aplica sobre el proyecto conciliado entregado en `data-sbs-ultra.zip` (versión 5.0). No es un proyecto independiente ni contiene nuevamente los datos.

## Instalación

1. Si todavía no instalaste el proyecto anterior, descomprime primero `data-sbs-ultra.zip`.
2. Descomprime este paquete y reemplaza, respetando sus rutas:
   - `index.html`
   - `assets/app.css`
   - `assets/js/app.js`
3. Conserva el resto del proyecto anterior, incluidas las otras seis piezas de JavaScript, `data`, `config`, `scripts`, `favicon.svg` y los workflows.
4. Sube estos tres archivos al repositorio `data-sbs`, en sus carpetas correspondientes. No subas el ZIP como archivo de la web.
5. Recarga la página con Ctrl+F5 después de publicar para descartar la caché del diseño anterior.

Los tres archivos se reemplazan juntos: la nueva estructura HTML y sus estilos requieren el nuevo controlador.

## Relación con tu web TC Contable

El HTML adjunto de TC Contable se usó como referencia visual. Esta entrega es el módulo de Información Financiera SBS; no reemplaza el contenido de TC Contable ni su historial de tipos de cambio.

Mantén el módulo en `data-sbs` y añade en el menú de tu web un enlace a la URL pública donde ya publicas ese repositorio, con el texto «Información financiera SBS». Así cada módulo mantiene su actualización automática y comparte la apariencia Treasury Hub. Usa tu URL real publicada; la configuración del dominio no forma parte de esta actualización.

Si ambos módulos se sirven bajo el mismo origen (mismo protocolo, dominio y puerto), comparten la preferencia de tema mediante la clave que ya utiliza el HTML de TC Contable: `sbs_tc_theme_treasuryhub`. En orígenes distintos cada uno conserva su preferencia local. No pegues el CSS de este módulo dentro del HTML de TC Contable: son páginas independientes con clases comunes.

## Formato aplicado

- Tipografía Manrope con las alternativas del archivo adjunto.
- Colores originales para los temas claro y oscuro: cabecera #051c2c, fondo #eef3f7, paneles blancos, azul #1f5eff y cian #00a3b5.
- Contenido centrado en un máximo de 1500 px, cabecera fija, marca BIF blanca de 38 px y botones superiores de 34 px.
- Tarjetas y paneles con radio de 7 px, sombras del original, líneas laterales de color y títulos compactos con iconos.
- Navegación horizontal para las seis secciones analíticas.
- Tarjetas: seis columnas en escritorio amplio, tres en pantallas intermedias y dos en móvil; tablas extensas con desplazamiento interno.
- Pie azul marino, selector mensual compacto, cifras tabulares y dos decimales.
- Las unidades de las tarjetas monetarias aparecen debajo de la cifra: millones de soles. No cambia la conversión de importes.

Manrope y Font Awesome 6.5.2 se cargan desde los mismos servicios externos que el HTML de referencia (Google Fonts y cdnjs). Requieren acceso a esos dominios. Los gráficos siguen usando SVG local; los cálculos no dependen de esos servicios.

## Verificación

- 11 pruebas existentes de JavaScript aprobadas, incluidas navegación, filtros, búsqueda, periodos y carga con los datos reales.
- Validación del proyecto aprobada: 12 JSON, 67 periodos financieros y 7 reportes, con referencias y sintaxis correctas.
- Comprobación SHA-256: sin diferencias en los 20 archivos de datos, configuración y scripts comparados antes y después.
- Hoja de estilos única, sin reglas `!important` ni selectores de la antigua barra lateral.

Esta entrega adapta los estilos del HTML suministrado; no incluye una comprobación visual en un navegador real ni una publicación en GitHub. Mantiene los avisos de rezagos y del periodo declarado por el RCL.
