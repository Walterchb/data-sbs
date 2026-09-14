import test from "node:test";
import assert from "node:assert/strict";
import {
  frameChartSvg,
  presentationGeometry,
} from "../assets/js/chart-presentation.js";
const base =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><rect fill="#fff" width="1600" height="900"/><g data-chart-content="true"><text>Créditos</text></g><g data-chart-drawings="labels"><text>Dic 2026</text></g></svg>';
test("presentation fits the complete chart proportionally while preserving final dimensions and label layers", () => {
  const settings = {
    frameType: "gradient",
    frameMargin: 80,
    frameRadius: 36,
    frameShadow: 25,
    frameStart: "#ede6ff",
    frameEnd: "#c1b9f2",
    frameAngle: 135,
  };
  const g = presentationGeometry(1600, 900, settings);
  assert.equal(g.h, 740);
  assert.ok(Math.abs(g.w / g.h - 1600 / 900) < 1e-12);
  assert.equal(g.y, 80);
  assert.ok(g.x >= 80);
  const svg = frameChartSvg(base, 1600, 900, settings);
  assert.match(svg, /width="1600" height="900" viewBox="0 0 1600 900"/);
  assert.ok(
    svg.indexOf("data-presentation-background") <
      svg.indexOf("data-editor-artboard"),
  );
  assert.ok(
    svg.indexOf("data-editor-artboard") < svg.indexOf("data-chart-content"),
  );
  assert.match(svg, /Créditos/);
  assert.match(svg, /Dic 2026/);
  assert.match(svg, /filter="url\(#export-frame-shadow\)"/);
  assert.equal(frameChartSvg(base, 1600, 900, { frameType: "none" }), base);
});
test("solid/radial styles, transparent cards, no-shadow and extreme inputs remain valid", () => {
  const radial = frameChartSvg(base, 1600, 900, {
    frameType: "radial",
    frameShadow: 0,
    frameStart: "<script>",
    frameEnd: "#112233",
  });
  assert.match(radial, /<radialGradient/);
  assert.doesNotMatch(radial, /<script>|filter="url/);
  const solid = frameChartSvg(base, 1600, 900, {
    frameType: "solid",
    frameStart: "#224466",
    background: "transparent",
    frameShadow: 60,
  });
  assert.match(solid, /data-presentation-background="true"[^>]*fill="#224466"/);
  assert.doesNotMatch(solid, /filter="url/);
  const g = presentationGeometry(640, 360, {
    frameMargin: 99999,
    frameRadius: -30,
    frameShadow: 900,
  });
  assert.ok(g.scale >= 0.5);
  assert.equal(g.radius, 0);
  assert.equal(g.shadow, 100);
});
