/**
 * views/results.js: the summary shown after the last question.
 *
 * Shows the score as a ring, a small strip with correct / missed / last time, and the
 * cards that were answered wrongly so they can be read again straight away.
 *
 * Receives: lib, session (the saved result), opts (the settings the quiz used)
 * Opens: "setup" (another round), "quiz" (retry only the missed cards), "history", "home".
 * Registered as "results".
 */
import { h, svgEl, mount, plural } from "../ui.js";
import { go, register } from "../router.js";
import * as db from "../db.js";

/** A circular score meter. `percent` is 0 to 100. The numbers are overlaid by the caller. */
function ring(percent) {
  const r = 52;                    // radius of the circle in the 120x120 drawing
  const c = 2 * Math.PI * r;       // circumference: the dash length that fills the whole ring
  return svgEl("svg", { viewBox: "0 0 120 120", "aria-hidden": "true" },
    svgEl("circle", { class: "ring-track", cx: 60, cy: 60, r, fill: "none", "stroke-width": 10 }),
    svgEl("circle", { class: "ring-value", cx: 60, cy: 60, r, fill: "none", "stroke-width": 10, "stroke-linecap": "round",
      "stroke-dasharray": `${(c * percent) / 100} ${c}`, transform: "rotate(-90 60 60)" })); // start at the top
}

/** One cell of the stats strip: small label, big number. */
const stat = (label, value) => h("div", {}, h("dt", {}, label), h("dd", {}, value));

async function results(lib, s, opts) {
  // Previous quiz on this library, for the "Last time" figure.
  const past = (await db.listSessions(lib.id)).filter((x) => x.id !== s.id).sort((a, b) => b.date - a.date);
  const prev = past[0];

  mount(
    h("h1", {}, "Results"),
    h("div", { class: "ring" }, ring(s.percent),
      h("div", { class: "ring-label" }, h("span", { class: "score" }, `${s.correct} / ${s.total}`), h("span", { class: "muted" }, `${s.percent}%`))),
    h("dl", { class: "stats" },
      stat("Correct", s.correct),
      stat("Missed", s.missed.length),
      stat("Last time", prev ? `${prev.percent}%` : "First quiz")),
    s.missed.length
      ? h("section", {}, h("h2", { class: "section-title" }, `To review (${plural(s.missed.length, "card")})`),
          h("ul", { class: "plain" }, s.missed.map((idx) => h("li", {},
            h("strong", {}, lib.rows[idx][s.qCol]),
            h("span", { class: "muted" }, `Answer: ${lib.rows[idx][s.aCol]}`)))))
      : h("p", { class: "verdict ok" }, "Perfect score."),
    // Secondary actions sit in the page; only the main action is in the sticky bar below.
    h("div", { class: "row" },
      s.missed.length ? h("button", { type: "button", onclick: () => go("quiz", lib, opts, s.missed) }, "Retry missed") : null,
      h("button", { type: "button", onclick: () => go("history", lib) }, "History"),
      h("button", { type: "button", onclick: () => go("home") }, "Home")),
    h("div", { class: "actionbar" }, h("button", { type: "button", class: "primary big", onclick: () => go("setup", lib) }, "Another round"))
  );
}

register("results", results);
