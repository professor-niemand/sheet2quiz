/**
 * views/history.js: every past quiz on one library, newest first.
 *
 * Top: number of quizzes, average and best score, and a small trend line of the latest
 * quizzes. Below: one row per quiz with its date, score and the settings that were used.
 * Stats live only on this device (see db.js); use Back up on the home screen to keep them.
 *
 * Receives: lib. Opens: "home". Registered as "history".
 */
import { h, svgEl, mount, fmtDate, plural } from "../ui.js";
import { icon } from "../icons.js";
import { go, register } from "../router.js";
import * as db from "../db.js";

const TREND_POINTS = 30; // how many of the latest quizzes the trend line covers

/**
 * A simple line of score over time. `oldestFirst` is the sessions in date order.
 * Returns null when there are fewer than two quizzes (a single point is not a trend).
 */
function trend(oldestFirst) {
  const pts = oldestFirst.slice(-TREND_POINTS);
  if (pts.length < 2) return null;
  const W = 300, H = 64, pad = 8;
  const x = (i) => pad + (i * (W - 2 * pad)) / (pts.length - 1);          // spread evenly across the width
  const y = (p) => H - pad - (p / 100) * (H - 2 * pad);                    // 0% at the bottom, 100% at the top
  const line = pts.map((s, i) => `${x(i).toFixed(1)},${y(s.percent).toFixed(1)}`).join(" ");
  return svgEl("svg", { class: "trend", viewBox: `0 0 ${W} ${H}`, role: "img",
    "aria-label": `Score trend over your last ${pts.length} quizzes, from ${pts[0].percent}% to ${pts[pts.length - 1].percent}%` },
    svgEl("polyline", { points: line, fill: "none", "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round" }),
    svgEl("circle", { cx: x(pts.length - 1), cy: y(pts[pts.length - 1].percent), r: 4 })); // mark the latest quiz
}

async function history(lib) {
  const list = (await db.listSessions(lib.id)).sort((a, b) => b.date - a.date); // newest first
  const avg = list.length ? Math.round(list.reduce((n, x) => n + x.percent, 0) / list.length) : 0;
  const best = list.length ? Math.max(...list.map((x) => x.percent)) : 0;

  mount(
    h("button", { type: "button", class: "quiet back", onclick: () => go("home") }, icon("back", 18), "Libraries"),
    h("h1", {}, lib.name),
    list.length === 0
      ? h("div", { class: "panel" }, h("h2", {}, "No quizzes yet"), h("p", { class: "muted" }, "Finish a quiz and its score will appear here."),
          h("button", { type: "button", class: "primary", onclick: () => go("setup", lib) }, icon("play", 18), "Start a quiz"))
      : [
          h("dl", { class: "stats" },
            h("div", {}, h("dt", {}, "Quizzes"), h("dd", {}, list.length)),
            h("div", {}, h("dt", {}, "Average"), h("dd", {}, `${avg}%`)),
            h("div", {}, h("dt", {}, "Best"), h("dd", {}, `${best}%`))),
          // The trend needs oldest first. It is null (and skipped by mount) with fewer than two quizzes.
          list.length > 1 ? h("p", { class: "muted caption" }, `Score of your last ${Math.min(list.length, TREND_POINTS)} quizzes`) : null,
          trend([...list].reverse()),
          h("ul", { class: "cards" }, list.map((x) => h("li", { class: "session" },
            h("div", { class: "lib-head" },
              h("strong", {}, `${x.correct} of ${plural(x.total, "question")}`),
              h("span", { class: "pill" }, `${x.percent}%`)),
            h("p", { class: "muted" }, fmtDate(x.date)),
            h("p", { class: "muted" }, `Question: ${x.qName}. Answer: ${x.aName}.${x.filter ? ` Categories in ${x.filter.col}: ${x.filter.values.join(", ")}.` : ""}`),
            h("div", { class: "bar", "aria-hidden": "true" }, h("span", { style: `width:${x.percent}%` })))))
        ]
  );
}

register("history", history);
