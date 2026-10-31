/**
 * views/setup.js: choose what the next quiz will be.
 *
 * Settings, in three groups:
 *   Question and answer  which column is shown as the question, which one you pick from
 *   Cards                optional category filter (any column) and the number of questions
 *   After you answer     which columns appear on the card once you have answered
 *
 * Every choice is remembered per library (localStorage key "last:<library id>") and is
 * pre-filled next time, but can be changed before every quiz. It cannot change mid-quiz.
 *
 * Opens: "quiz" (Start quiz) and "home" (back). Registered as "setup".
 */
import { h, mount, toast, plural } from "../ui.js";
import { icon } from "../icons.js";
import { go, register } from "../router.js";
import { selectCards, columnValues, columnsToShow } from "../engine.js";

const MAX_FILTER_VALUES = 60; // a filter column with more distinct values is too long to tick through

/** Read this library's remembered choices ({} if none or unreadable). */
function loadLast(id) {
  try { return JSON.parse(localStorage.getItem("last:" + id) || "{}"); } catch { return {}; }
}

/** A labelled <select>. `options` is [[value, text], ...]; `value` is the pre-selected one. */
function selectField(id, label, options, value) {
  return h("label", { class: "field" }, label,
    h("select", { id }, options.map(([v, t]) => h("option", { value: v, ...(String(v) === String(value) ? { selected: true } : {}) }, t))));
}

/** Render the setup screen for one library. */
function setup(lib) {
  const nCols = lib.headers.length;
  const colOpts = lib.headers.map((t, i) => [i, t]);
  const last = loadLast(lib.id);
  const $ = (id) => document.getElementById(id);

  // ----- Section "Cards": category filter and question count -----
  const valuesBox = h("div", { class: "values" }); // tick boxes for the filter column's values
  const countInput = h("input", { id: "count", type: "number", min: 1, max: lib.rows.length, value: Math.min(last.count || 10, lib.rows.length) });
  const available = h("p", { class: "hint", "aria-live": "polite" }); // "N cards available"

  /** Ticked filter values, or null when no filter column is chosen. */
  const filterValues = () => $("filterCol").value === "" ? null : [...valuesBox.querySelectorAll("input:checked")].map((i) => i.value);

  /** Rebuild the tick boxes when the filter column changes. */
  const renderValues = () => {
    const col = $("filterCol").value;
    if (col === "") return valuesBox.replaceChildren();
    const vals = columnValues(lib, Number(col));
    if (vals.length > MAX_FILTER_VALUES) {
      return valuesBox.replaceChildren(h("p", { class: "muted" }, "This column has too many different values to filter on. Pick a column with fewer categories."));
    }
    valuesBox.replaceChildren(...vals.map((v) => h("label", { class: "chip" },
      h("input", { type: "checkbox", value: v, checked: true, onchange: updateAvailable }), v)));
  };

  /** Show how many cards match the current settings, and cap the question count at that number. */
  const updateAvailable = () => {
    const fc = $("filterCol").value === "" ? null : Number($("filterCol").value);
    const n = selectCards(lib, { qCol: Number($("qCol").value), aCol: Number($("aCol").value), count: Infinity, filterCol: fc, filterValues: filterValues() }).length;
    available.textContent = n ? `${plural(n, "card")} match these settings.` : "No cards match. Rows need both a question and an answer.";
    countInput.max = Math.max(1, n);
    if (Number(countInput.value) > n && n > 0) countInput.value = n;
  };

  // ----- Section "After you answer": columns shown on the card -----
  // `shown` holds the ticked column indexes. The question and answer columns are always
  // shown and appear locked; the helper columnsToShow() in engine.js applies that rule.
  const shown = new Set(Array.isArray(last.show) ? last.show.filter((i) => Number.isInteger(i) && i >= 0 && i < nCols) : lib.headers.map((_, i) => i));
  const showSummary = h("summary", {});
  const showBox = h("div", { class: "values show-cols" });
  const forcedCols = () => new Set([Number($("qCol").value), Number($("aCol").value)]);

  const updateSummary = () => {
    const n = columnsToShow(nCols, [...shown], Number($("qCol").value), Number($("aCol").value)).length;
    showSummary.textContent = `Show after answering (${n} of ${nCols} columns)`;
  };

  // Rebuilt only when the question or answer column (or All/None) changes. Ticking a box
  // only updates the summary, so keyboard focus stays on the box.
  const renderShow = () => {
    const forced = forcedCols();
    showBox.replaceChildren(...lib.headers.map((hd, i) => h("label", { class: "chip" },
      h("input", { type: "checkbox", value: String(i), ...(forced.has(i) || shown.has(i) ? { checked: true } : {}), ...(forced.has(i) ? { disabled: true } : {}),
        onchange: (e) => { if (e.target.checked) shown.add(i); else shown.delete(i); updateSummary(); } }), hd)));
    updateSummary();
  };

  const showPanel = h("details", { class: "panel show-panel" }, showSummary,
    h("p", { class: "hint" }, "Applies after right and wrong answers alike. The question and answer columns are always shown."),
    h("div", { class: "row" },
      h("button", { type: "button", onclick: () => { lib.headers.forEach((_, i) => shown.add(i)); renderShow(); } }, "All columns"),
      h("button", { type: "button", onclick: () => { shown.clear(); renderShow(); } }, "Only question and answer")),
    showBox);

  /** Validate, remember the choices and open the quiz. */
  const start = () => {
    const qCol = Number($("qCol").value), aCol = Number($("aCol").value);
    if (qCol === aCol) return toast("Choose two different columns for the question and the answer.");
    const filterCol = $("filterCol").value === "" ? null : Number($("filterCol").value);
    const fv = filterValues();
    if (filterCol != null && !fv.length) return toast("Tick at least one category, or choose no filter.");
    const count = Math.max(1, Number(countInput.value) || 1);
    const ids = selectCards(lib, { qCol, aCol, count, filterCol, filterValues: fv });
    if (!ids.length) return toast("No cards match. Rows need both a question and an answer.");
    localStorage.setItem("last:" + lib.id, JSON.stringify({ qCol, aCol, count, filterCol: filterCol ?? "", show: [...shown] }));
    go("quiz", lib, { qCol, aCol, filterCol, filterValues: fv, showCols: columnsToShow(nCols, [...shown], qCol, aCol) }, ids);
  };

  mount(
    h("button", { type: "button", class: "quiet back", onclick: () => go("home") }, icon("back", 18), "Libraries"),
    h("h1", {}, lib.name),
    h("p", { class: "muted" }, `${plural(lib.rows.length, "card")}, ${plural(nCols, "column")}`),
    h("section", { class: "panel" },
      h("h2", {}, "Question and answer"),
      selectField("qCol", "Question column (what you are asked)", colOpts, last.qCol ?? 0),
      selectField("aCol", "Answer column (what you choose from)", colOpts, last.aCol ?? Math.min(1, nCols - 1))),
    h("section", { class: "panel" },
      h("h2", {}, "Cards"),
      selectField("filterCol", "Only use cards from these categories (optional)", [["", "No filter, use all cards"], ...colOpts], last.filterCol ?? ""),
      valuesBox,
      h("label", { class: "field" }, "Number of questions", countInput),
      available),
    showPanel,
    // Sticky bar so the main action is always reachable on a long page.
    h("div", { class: "actionbar" }, h("button", { type: "button", class: "primary big", onclick: start }, icon("play", 18), "Start quiz"))
  );

  // Wire up changes after the elements are in the page (they are looked up by id).
  $("filterCol").addEventListener("change", () => { renderValues(); updateAvailable(); });
  for (const id of ["qCol", "aCol"]) $(id).addEventListener("change", () => { renderShow(); updateAvailable(); });
  countInput.addEventListener("change", updateAvailable);
  renderValues();
  renderShow();
  updateAvailable();
}

register("setup", setup);
