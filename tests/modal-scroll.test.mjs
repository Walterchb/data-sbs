import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { lockPageScroll } from "../assets/js/modal-scroll.js";
test("modal locks the underlying page and restores its exact scroll position and styles", () => {
  const dom = new JSDOM('<body style="padding-right:4px"><main></main></body>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  window.scrollX = 0;
  window.scrollY = 480;
  window.scrollTo = (x, y) => {
    window.scrollX = x;
    window.scrollY = y;
  };
  const before = document.body.style.cssText;
  const release = lockPageScroll();
  assert.equal(document.body.style.position, "fixed");
  assert.equal(document.body.style.top, "-480px");
  window.scrollY = 0;
  release();
  release();
  assert.equal(window.scrollY, 480);
  assert.equal(document.body.style.cssText, before);
  assert.equal(
    document.documentElement.classList.contains("chart-export-open"),
    false,
  );
  dom.window.close();
});
