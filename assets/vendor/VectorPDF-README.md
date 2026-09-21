# Exportación PDF vectorial

Dependencias locales, cargadas solo al exportar un PDF con gráficos:

- PDFKit 0.17.2 — https://github.com/foliojs/pdfkit — licencia MIT.
- SVG-to-PDFKit 0.1.8 — https://github.com/alafr/SVG-to-PDFKit — licencia MIT.

Los archivos minificados se generaron con esbuild 0.25.10 (`transformSync`, minify, keepNames: true, target es2020) a partir de `pdfkit/js/pdfkit.standalone.js` y `svg-to-pdfkit/source.js` de los paquetes npm indicados. Se conservan sus respectivas licencias en esta carpeta. No se consulta un CDN durante la exportación. Es imprescindible conservar nombres de funciones: SVG-to-PDFKit reconoce los patrones por `constructor.name`.

El conversor conserva texto, trazos, rellenos y patrones vectoriales. Solo las sombras con desenfoque usan una capa PNG transparente. El contenido del gráfico permanece vectorial. Las tipografías de chart-fonts se comparten con el SVG para conservar sus métricas; se normalizan las líneas base según mediciones del navegador.

SHA-256:

- `pdfkit.min.js`: `a358a588ffd19a4f4acd5baec1eb9e6aa595804f5194b0fccb39ab08a45e1938`
- `svg-to-pdfkit.min.js`: `25d94de2387938fcc96d2950f09506c56a93cd61e65b80a3bc40be2077ad63f6`
