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
window.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
window.HTMLDialogElement.prototype.close = function () {
  this.open = false;
  this.dispatchEvent(new window.Event("close"));
};
window.matchMedia = () => ({ matches: true });
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
  el.value =
    id === "period" && value.length === 7
      ? new Date(
          Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)), 0),
        )
          .toISOString()
          .slice(0, 10)
      : value;
  el.dispatchEvent(new window.Event("change", { bubbles: true }));
  await ready();
}
await ready();

test("all views and controls render with real data and no JS errors", async () => {
  assert.equal(document.getElementById("period").value, "2026-07-31");
  assert.ok(document.body.textContent.includes("23,316.79"));
  assert.ok(document.body.textContent.includes("3.09%"));
  assert.ok(
    !requests.some((p) => p.includes("hub.json")),
    "Large raw hub must not load in browser",
  );
  await click('[data-nav="movements"]');
  await change("move-sort", "percent");
  await click('[data-nav="balance"]');
  assert.equal(document.getElementById("table-sort").value, "hierarchy");
  assert.ok(
    [...document.querySelectorAll(".account-table tbody tr")].every(
      (row) => row.dataset.depth === "0",
    ),
  );
  assert.equal(document.querySelectorAll(".row-reference").length, 0);
  await click("#expand-all");
  assert.match(
    document.getElementById("expand-all").textContent,
    /Plegar todo/,
  );
  assert.ok(document.querySelector('.account-table [data-row="balance:41"]'));
  await click("#show-references");
  assert.ok(document.querySelectorAll(".row-reference").length > 0);
  await click("#show-references");
  assert.equal(document.querySelectorAll(".row-reference").length, 0);
  await change("table-sort", "value");
  const ids = [...document.querySelectorAll(".account-table tbody tr")].map(
    (row) => row.dataset.row,
  );
  for (const row of document.querySelectorAll(".account-table tbody tr"))
    if (row.dataset.parent)
      assert.ok(
        ids.indexOf(row.dataset.parent) < ids.indexOf(row.dataset.row),
        "Parent precedes child in sorted hierarchy",
      );
  await click("#expand-all");
  assert.ok(
    [...document.querySelectorAll(".account-table tbody tr")].every(
      (row) => row.dataset.depth === "0",
    ),
  );
  assert.match(
    document.getElementById("expand-all").textContent,
    /Expandir todo/,
  );
  await change("table-sort", "hierarchy");
  await click("#expand-all");
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
    if (code === "B-2402") {
      await change("period", "2026-06");
      const composition = document.querySelector(".capital-composition");
      assert.ok(composition.textContent.includes("72.50%"));
      assert.ok(composition.textContent.includes("76.76%"));
      await click(
        '.capital-composition [data-report-metric="calc:capital-tier1"]',
      );
      await click("[data-series]");
      assert.ok(
        document.getElementById("detail-body").textContent.includes("2,227.47"),
      );
      await click("#detail-close");
      await click("#last");
    }
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
  assert.equal(document.querySelector('#navigation [data-nav="health"]'), null);
  await click("#info");
  await click('#detail-body [data-nav="health"]');
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

test("compact cards reveal details, date bounds hold, and refresh is direct", async () => {
  await click('[data-nav="overview"]');
  await click("#last");
  await click('[data-range="24"]');
  const card = document.querySelector('[data-popup="assets"]');
  assert.ok(
    !card.textContent.includes("YTD"),
    "Detailed comparisons belong in the popup",
  );
  card.dispatchEvent(new window.MouseEvent("pointerover", { bubbles: true }));
  assert.equal(document.getElementById("hover-detail").hidden, false);
  assert.ok(
    document.getElementById("hover-detail").textContent.includes("YTD"),
  );
  await click('[data-popup="assets"]');
  assert.equal(document.getElementById("detail-dialog").open, true);
  assert.ok(
    document
      .getElementById("detail-body")
      .textContent.includes("S/ 23,316.79 MM"),
  );
  assert.equal(document.getElementById("detail-title").textContent, "ACTIVOS");
  await click("#detail-close");
  assert.ok(!document.querySelector(".chart-caption"));
  assert.ok(
    document.querySelector(".chart-legend").textContent.includes("Selección"),
  );
  assert.ok(document.querySelectorAll(".stat-card").length >= 3);
  const seriesButton = document.querySelector("[data-series]");
  assert.equal(seriesButton.previousElementSibling.dataset.range, "0");
  assert.equal(seriesButton.parentElement.className, "range");
  assert.ok(!document.querySelector(".stats").textContent.includes("Mínimo"));
  assert.ok(
    document.querySelector(".stats").textContent.includes("Cambio del rango"),
  );
  const seriesId = seriesButton.dataset.series;
  await click(`[data-series="${seriesId}"]`);
  assert.equal(document.getElementById("detail-dialog").open, true);
  assert.equal(
    document.getElementById("detail-title").textContent,
    "VALORES DE LA SERIE",
  );
  assert.ok(document.querySelector("#detail-body table"));
  assert.equal(document.querySelectorAll("#detail-body tbody tr").length, 24);
  assert.ok(
    document.getElementById("detail-body").textContent.includes("Jul 2026"),
  );
  let copied = "";
  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (value) => {
        copied = value;
      },
    },
  });
  assert.equal(document.getElementById("series-copy").hidden, false);
  await click("#series-copy");
  assert.equal(copied.split("\r\n").length, 25);
  assert.match(copied, /Periodo\tIndicador\tValor \(S\/ MM\)/);
  assert.match(copied, /2026-07\tCréditos brutos\t15692\.39\t2026-07/);
  assert.ok(!copied.includes("15,692"));
  assert.match(
    document.getElementById("series-copy-status").textContent,
    /Copiado/,
  );
  await click("#detail-close");
  assert.equal(document.activeElement, seriesButton);
  const info = document.getElementById("info");
  info.dispatchEvent(new window.MouseEvent("pointerover", { bubbles: true }));
  assert.equal(
    document.getElementById("hover-detail").hidden,
    true,
    "Info opens only on click",
  );
  await click("#info");
  assert.ok(
    !document
      .getElementById("detail-body")
      .textContent.includes("Cómo se actualiza"),
  );
  assert.ok(
    document.getElementById("detail-body").textContent.includes("julio 2026"),
  );
  assert.ok(
    document
      .getElementById("detail-body")
      .textContent.includes("variaciones de ratios en pb"),
  );
  await click('#detail-body [data-nav="health"]');
  assert.equal(document.getElementById("detail-dialog").open, false);
  await change("period", "2030-01");
  assert.equal(document.getElementById("period").value, "2026-07-31");
  await change("period", "2021-01");
  assert.equal(document.getElementById("prev").disabled, true);
  const before = requests.filter((p) => p === "./data/manifest.json").length;
  await click("#refresh");
  for (let i = 0; i < 100 && document.getElementById("refresh").disabled; i++)
    await new Promise((r) => setTimeout(r, 10));
  assert.equal(document.getElementById("refresh").disabled, false);
  assert.equal(document.getElementById("detail-dialog").open, false);
  assert.equal(
    document.getElementById("period").value,
    "2021-01-31",
    "Refresh preserves historical selection",
  );
  assert.equal(
    requests.filter((p) => p === "./data/manifest.json").length,
    before + 1,
  );
  assert.match(document.getElementById("toast").textContent, /sin novedades/);
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
