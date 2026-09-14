import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { initMobileTopbar } from "../assets/js/mobile-topbar.js";
test("mobile header moves proportionally, clamps at its height and resets on desktop or at page top", () => {
  const dom = new JSDOM("<header><button>Theme</button></header><main></main>");
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  let matches = true,
    frame;
  window.matchMedia = () => ({
    get matches() {
      return matches;
    },
  });
  window.requestAnimationFrame = (fn) => {
    frame = fn;
    return 1;
  };
  Object.defineProperty(document.documentElement, "scrollHeight", {
    value: 3000,
  });
  Object.defineProperty(window, "innerHeight", { value: 800 });
  const header = document.querySelector("header");
  Object.defineProperty(header, "offsetHeight", { value: 120 });
  initMobileTopbar(header);
  const scroll = (y) => {
    window.scrollY = y;
    window.dispatchEvent(new window.Event("scroll"));
    frame();
  };
  const offset = () =>
    parseFloat(
      document.documentElement.style.getPropertyValue("--topbar-offset"),
    );
  scroll(40);
  assert.equal(offset(), 40);
  scroll(55);
  assert.equal(offset(), 55);
  scroll(50);
  assert.equal(offset(), 50);
  scroll(400);
  assert.equal(offset(), 120);
  scroll(380);
  assert.equal(offset(), 100);
  scroll(375);
  assert.equal(offset(), 95);
  scroll(20);
  assert.equal(offset(), 0);
  scroll(50);
  assert.equal(offset(), 30);
  matches = false;
  scroll(500);
  assert.equal(offset(), 0);
  matches = true;
  scroll(600);
  assert.equal(offset(), 100);
  header.querySelector("button").focus();
  assert.equal(offset(), 0);
});
