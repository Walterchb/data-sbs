import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const dom = new JSDOM(html, {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
for (const key of ["window", "document", "location", "history", "localStorage"])
  globalThis[key] = dom.window[key];
window.scrollTo = () => {};
const requests = [];
let failPath = "";
globalThis.fetch = async (path) => {
  requests.push(path);
  const relative = path.split("?")[0].replace(/^\.\//, "");
  if (relative === failPath) return new Response("", { status: 503 });
  try {
    return new Response(await readFile(new URL(relative, root), "utf8"), {
      status: 200,
    });
  } catch {
    return new Response("", { status: 404 });
  }
};
const errors = [];
const originalError = console.error;
console.error = (...args) => errors.push(args.join(" "));
await import("../assets/js/app.js");
async function ready() {
  for (let i = 0; i < 100; i++) {
    if (
      document.getElementById("content").getAttribute("aria-busy") === "false"
    )
      return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("Render timeout");
}
async function click(selector) {
  const element = document.querySelector(selector);
  assert.ok(element, "Missing selector " + selector);
  element.click();
  await ready();
}
async function change(id, value) {
  const el = document.getElementById(id);
  assert.ok(el, "Missing control " + id);
  el.value = value;
  el.dispatchEvent(new window.Event("change", { bubbles: true }));
  await ready();
}
await ready();

test("all views and controls render with real data and no JS errors", async () => {
  assert.ok(document.body.textContent.includes("julio 2026"));
  assert.ok(document.body.textContent.includes("23,316.79"));
  assert.ok(document.body.textContent.includes("3.09%"));
  assert.ok(
    !requests.some((p) => p.includes("hub.json")),
    "Large raw hub must not load in browser",
  );
  await click('[data-nav="movements"]');
  await change("move-sort", "percent");
  await click('[data-nav="balance"]');
  await click('[data-account="balance:41"]');
  assert.ok(document.body.textContent.includes("928.86"));
  await change("table-view", "annual");
  assert.ok(document.querySelector(".history-table"));
  await change("table-view", "monthly");
  await change("statement", "income");
  await change("period", "2026-01");
  assert.ok(document.body.textContent.includes("Flujo de este mes"));
  await click("#last");
  await click('[data-nav="reports"]');
  for (const code of [
    "B-2401",
    "B-2336",
    "B-2402",
    "B-2340",
    "B-230809",
    "B-234021",
    "B-2368",
    "derived",
  ]) {
    await click(`[data-report="${code}"]`);
    assert.equal(
      document.getElementById("error").hidden,
      true,
      "Report render error " + code,
    );
    assert.ok(document.querySelector(".line-chart"), "Missing chart " + code);
    if (code === "B-234021")
      assert.ok(document.body.textContent.includes("105.02%"));
    if (code === "B-2368")
      assert.ok(document.body.textContent.includes("10.23 MM"));
    await click('[data-range="60"]');
  }
  await click('[data-nav="peers"]');
  for (const key of ["credits", "npl", "roe", "rcg", "rcl", "rfne"]) {
    await change("peer-metric", key);
    assert.equal(document.getElementById("error").hidden, true);
  }
  await click('[data-peer="bcp"]');
  await click('[data-nav="health"]');
  assert.ok(document.body.textContent.includes("0 errores"));
  assert.equal(
    new Set([...document.querySelectorAll("[id]")].map((n) => n.id)).size,
    document.querySelectorAll("[id]").length,
    "Duplicate IDs",
  );
  await click("#theme");
  assert.equal(document.documentElement.dataset.theme, "dark");
  assert.equal(errors.length, 0, errors.join("\n"));
  // A loaded dataset is reused; navigation must not multiply requests.
  assert.equal(requests.filter((p) => p.includes("financial.json")).length, 1);
});

test("search by parent, empty results, and historical earliest date", async () => {
  await click('[data-nav="balance"]');
  await change("statement", "balance");
  const search = document.getElementById("search");
  search.value = "vigentes otros";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 190));
  await ready();
  assert.ok(document.querySelector('[data-account="balance:36"]'));
  assert.ok(!document.querySelector('[data-account="balance:13"]'));
  const input = document.getElementById("search");
  input.value = "not-a-real-account";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 190));
  await ready();
  assert.ok(document.body.textContent.includes("No hay coincidencias"));
  await change("period", "2021-01");
  await click('[data-nav="overview"]');
  assert.ok(document.body.textContent.includes("Falta el mes anterior"));
  assert.ok(document.getElementById("prev").disabled);
  assert.equal(errors.length, 0, errors.join("\n"));
});

test("failed source request surfaces an explicit error without sample data", async () => {
  // A new module load uses the cache; exercise the public request helper directly.
  const data = await import("../assets/js/data.js");
  failPath = "data/test-missing.json";
  await assert.rejects(
    () => data.request("./data/test-missing.json"),
    /HTTP 503/,
  );
  failPath = "";
  console.error = originalError;
  dom.window.close();
});
