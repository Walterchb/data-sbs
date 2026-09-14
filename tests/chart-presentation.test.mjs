import test from "node:test";
import assert from "node:assert/strict";
import {
  frameChartSvg,
  presentationGeometry,
  presentationSize,
  rasterSize,
  PRESENTATION_PATTERNS,
} from "../assets/js/chart-presentation.js";
const base =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><rect fill="#fff" width="1600" height="900"/><g data-chart-content="true"><text>Créditos</text></g><g data-chart-drawings="labels"><text>Dic 2026</text></g></svg>';
test("presentation fits the complete chart proportionally while preserving final dimensions and label layers", () => {
  const settings = {
    frameType: "gradient",
    framePreserveSize: false,
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

test("default framing expands the canvas without shrinking the chart; shadow-only keeps outside transparent", () => {
  const s = { frameType: "shadow", frameMargin: 48, frameShadow: 25 };
  const g = presentationGeometry(1600, 900, s);
  assert.equal(g.scale, 1);
  assert.equal(g.w, 1600);
  assert.equal(g.h, 900);
  assert.deepEqual(presentationSize(1600, 900, s), {
    width: 1696,
    height: 996,
  });
  const svg = frameChartSvg(base, 1600, 900, s);
  assert.match(svg, /width="1696" height="996" viewBox="0 0 1696 996"/);
  assert.match(svg, /translate\(48 48\) scale\(1\)/);
  assert.doesNotMatch(
    svg,
    /data-presentation-background|data-presentation-pattern/,
  );
  assert.match(svg, /filter="url\(#export-frame-shadow\)"/);
  assert.deepEqual(rasterSize(1696, 996, 2), {
    width: 3392,
    height: 1992,
    valid: true,
  });
  assert.equal(rasterSize(4160, 2480, 3).valid, false);
});

test("all six patterns use vector paths with bounded spacing, color, opacity and stroke", () => {
  for (const framePattern of Object.keys(PRESENTATION_PATTERNS).filter(
    (k) => k !== "none",
  )) {
    const svg = frameChartSvg(base, 1600, 900, {
      frameType: "solid",
      framePattern,
      patternSize: 32,
      patternColor: "#123456",
      patternOpacity: 20,
      patternStroke: 2,
    });
    assert.match(svg, /patternUnits="userSpaceOnUse" width="32" height="32"/);
    assert.match(svg, /stroke="#123456" stroke-width="2"/);
    assert.match(svg, /data-presentation-pattern[^>]*opacity="0.2"/);
    assert.doesNotMatch(svg, /<image/);
  }
});
