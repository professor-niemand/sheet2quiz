/**
 * views/quiz.js: asks the questions one at a time.
 *
 * For each card: show the question, four options (one right), and after the user picks
 * one, mark right and wrong with text as well as colour and show the card with the
 * columns chosen on the setup screen. The settings cannot change during a quiz.
 *
 * When the last card is answered the result is saved as a session (see db.js) and
 * the "results" screen opens.
 *
 * Receives: lib, opts, ids
 *   opts = { qCol, aCol, filterCol, filterValues, showCols }   (from the setup screen)
 *   ids  = row indexes of the cards to ask, already shuffled
 * Opens: "results" at the end, "home" if the user quits. Registered as "quiz".
 */
import { h, mount } from "../ui.js";
import { go, register } from "../router.js";
import * as db from "../db.js";
import { buildQuestion, isCorrect, summarise } from "../engine.js";

function quiz(lib, opts, ids) {
  const answers = []; // [{ rowIdx, picked, ok }] filled in as the user answers
  let i = 0;          // position of the current question in `ids`

  /** Show question number i, or finish when there are no more. */
  const next = () => {
    if (i >= ids.length) return finish();

    const q = buildQuestion(lib, ids[i], { ...opts, choices: 4 });
    const feedback = h("div", { class: "feedback", "aria-live": "polite" }); // filled after the user answers
    const actions = h("div", { class: "actionbar" });                         // the Next button appears here

    // One button per option. The option text is kept in data-v because the button's own
    // text changes when a tag such as "Correct answer" is added after answering.
    const buttons = q.options.map((o) => h("button", { type: "button", class: "option", "data-v": o, onclick: () => pick(o) }, h("span", {}, o)));

    /** Handle the user's choice. */
    const pick = (o) => {
      const ok = isCorrect(q, o);
      answers.push({ rowIdx: q.rowIdx, picked: o, ok });

      buttons.forEach((b) => {
        b.disabled = true; // one answer per question
        // Text tags as well as colour, so right and wrong never depend on colour alone.
        if (isCorrect(q, b.dataset.v)) { b.classList.add("right"); b.append(h("span", { class: "tag" }, "Correct answer")); }
        else if (b.dataset.v === o) { b.classList.add("wrong"); b.append(h("span", { class: "tag" }, "Your pick")); }
      });

      // The card: the chosen columns of this row. The question and answer rows get a class
      // so the stylesheet can emphasise them. Empty cells are skipped.
      const row = lib.rows[q.rowIdx];
      const cols = opts.showCols ?? lib.headers.map((_, c) => c); // default: every column
      feedback.replaceChildren(
        h("p", { class: "verdict " + (ok ? "ok" : "bad") }, ok ? "Correct" : `Not quite. The answer is ${q.correct}.`),
        h("table", { class: "flashcard" }, cols.map((c) => row[c] === "" ? null :
          h("tr", { class: c === opts.aCol ? "is-answer" : c === opts.qCol ? "is-question" : "" },
            h("th", { scope: "row" }, lib.headers[c]), h("td", {}, row[c]))))
      );
      actions.append(h("button", { type: "button", class: "primary big", id: "nextBtn", onclick: () => { i++; next(); } },
        i + 1 === ids.length ? "See results" : "Next question"));
      document.getElementById("nextBtn").focus(); // keyboard users can press Enter straight away
    };

    mount(
      h("div", { class: "quiz-head" },
        h("span", { class: "muted" }, `Question ${i + 1} of ${ids.length}`),
        h("button", { type: "button", class: "quiet small", onclick: () => { if (confirm("Quit this quiz? Your answers so far will not be saved.")) go("home"); } }, "Quit")),
      h("progress", { max: ids.length, value: i, "aria-label": "Quiz progress" }),
      h("span", { class: "qlabel" }, lib.headers[opts.qCol]),
      h("h1", { class: "question" }, q.question),
      h("div", { class: "options" }, buttons),
      feedback,
      actions
    );
  };

  /** Save the finished quiz as a session and open the results. */
  const finish = async () => {
    const s = summarise(answers);
    const session = {
      id: db.uid(), libraryId: lib.id, date: Date.now(),
      qCol: opts.qCol, aCol: opts.aCol, qName: lib.headers[opts.qCol], aName: lib.headers[opts.aCol],
      filter: opts.filterCol == null ? null : { col: lib.headers[opts.filterCol], values: opts.filterValues },
      ...s, // total, correct, percent, missed
    };
    await db.saveSession(session);
    go("results", lib, session, opts);
  };

  next();
}

register("quiz", quiz);
