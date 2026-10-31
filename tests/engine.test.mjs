// Unit tests for web/js/engine.js (the pure quiz logic). Run with: npm test
// These need no browser: engine.js has no DOM or storage code. Add a test here for every
// change to the logic. The sample table below has a blank header, a short row, a blank
// line and a row with a missing answer, because real spreadsheets look like that.
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTable, selectCards, buildQuestion, isCorrect, summarise, columnValues, columnsToShow } from "../web/js/engine.js";

const grid = [
  ["Country", "Capital", "Continent", ""],
  ["France", "Paris", "Europe", "x"],
  ["Japan", "Tokyo", "Asia"],
  ["", "", ""],
  ["Peru", "Lima", "South America"],
  ["Spain", "Madrid", "Europe"],
  ["Kenya", "", "Africa"],
];
const lib = normalizeTable(grid);

test("normalizeTable handles blank header, ragged rows, blank lines", () => {
  assert.deepEqual(lib.headers, ["Country", "Capital", "Continent", "Column 4"]);
  assert.equal(lib.rows.length, 5);
  assert.equal(lib.rows[1][3], "");
});

test("normalizeTable de-duplicates header names", () => {
  const t = normalizeTable([["A", "A"], ["1", "2"]]);
  assert.deepEqual(t.headers, ["A", "A (2)"]);
});

test("normalizeTable rejects empty files", () => {
  assert.throws(() => normalizeTable([["A"]]));
});

test("selectCards skips empty answers and respects count", () => {
  const ids = selectCards(lib, { qCol: 0, aCol: 1, count: 10 });
  assert.equal(ids.length, 4); // Kenya has no capital
  assert.equal(selectCards(lib, { qCol: 0, aCol: 1, count: 2 }).length, 2);
});

test("selectCards filters by category values", () => {
  const ids = selectCards(lib, { qCol: 0, aCol: 1, count: 10, filterCol: 2, filterValues: ["europe"] });
  assert.deepEqual(ids.map((i) => lib.rows[i][0]).sort(), ["France", "Spain"]);
});

test("question can use any column pair", () => {
  const q = buildQuestion(lib, 0, { qCol: 1, aCol: 0 });
  assert.equal(q.question, "Paris");
  assert.equal(q.correct, "France");
});

test("buildQuestion: correct answer present once, options unique, max 4", () => {
  for (let i = 0; i < 50; i++) {
    const q = buildQuestion(lib, 0, { qCol: 0, aCol: 1, choices: 4 });
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options.map((o) => o.toLowerCase())).size, 4);
    assert.equal(q.options.filter((o) => o === q.correct).length, 1);
  }
});

test("buildQuestion degrades gracefully with few distinct answers", () => {
  const small = normalizeTable([["Q", "A"], ["1", "yes"], ["2", "YES"], ["3", "no"]]);
  const q = buildQuestion(small, 0, { qCol: 0, aCol: 1, choices: 4 });
  assert.equal(q.options.length, 2);
});

test("isCorrect is case/space insensitive; summarise counts", () => {
  const q = { correct: "Paris" };
  assert.ok(isCorrect(q, " paris "));
  const s = summarise([{ ok: true, rowIdx: 0 }, { ok: false, rowIdx: 3 }, { ok: true, rowIdx: 4 }]);
  assert.deepEqual(s, { total: 3, correct: 2, percent: 67, missed: [3] });
});

test("columnValues returns distinct values", () => {
  assert.deepEqual(columnValues(lib, 2), ["Europe", "Asia", "South America", "Africa"]);
});

test("columnsToShow: null means all columns", () => {
  assert.deepEqual(columnsToShow(4, null, 0, 1), [0, 1, 2, 3]);
});

test("columnsToShow: question and answer columns are always included, order kept", () => {
  assert.deepEqual(columnsToShow(5, [3], 1, 0), [0, 1, 3]);
  assert.deepEqual(columnsToShow(5, [], 2, 4), [2, 4]);
});

test("columnsToShow: ignores stale or invalid indexes and duplicates", () => {
  assert.deepEqual(columnsToShow(3, [0, 0, 9, -1, 1.5, "2"], 0, 1), [0, 1]);
});
