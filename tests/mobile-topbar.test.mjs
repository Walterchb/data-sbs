import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { initMobileTopbar } from "../assets/js/mobile-topbar.js";
test("mobile header hides down, reveals up, ignores jitter and stays visible on desktop or near top", () => {
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
  const hidden = () =>
    document.documentElement.classList.contains("topbar-hidden");
  scroll(400);
  assert.equal(hidden(), true);
  scroll(397);
  assert.equal(hidden(), true);
  scroll(382);
  assert.equal(hidden(), false);
  scroll(410);
  assert.equal(hidden(), true);
  scroll(20);
  assert.equal(hidden(), false);
  matches = false;
  scroll(500);
  assert.equal(hidden(), false);
  matches = true;
  scroll(600);
  assert.equal(hidden(), true);
  header.querySelector("button").focus();
  assert.equal(hidden(), false);
});
