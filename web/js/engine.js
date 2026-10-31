/**
 * engine.js: the quiz logic. Pure functions only.
 *
 * No DOM, no storage, no network. Because of that, this file runs unchanged in the
 * browser and in Node, and it is covered by tests/engine.test.mjs. Keep it that way:
 * anything that touches the page belongs in a view, anything that saves data in db.js.
 *
 * Vocabulary used across the project:
 *   library  = { id, name, headers: string[], rows: string[][], createdAt }
 *              one imported spreadsheet. rows[r][c] is the cell in row r, column c.
 *   card     = one row of a library (referred to by its row index, "rowIdx").
 *   qCol/aCol = the column indexes chosen as question and answer.
 *
 * Exports: norm, shuffle, normalizeTable, columnValues, selectCards, buildQuestion,
 *          columnsToShow, isCorrect, summarise
 */

/** Cell value to trimmed text. Numbers, dates and blanks all become strings. */
export const norm = (v) => String(v ?? "").trim();

/** Comparison key: answers match regardless of case and surrounding spaces. */
const key = (v) => norm(v).toLowerCase();

/**
 * Fisher-Yates shuffle. Returns a new array and leaves the input alone.
 * `rng` is injectable (default Math.random) so tests can use a fixed sequence.
 */
export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Turn a raw 2D grid (first row = column names) into a library table.
 * Copes with real-world spreadsheets: blank lines are dropped, short rows are padded,
 * blank headings become "Column N" and repeated headings become "Name (2)".
 * Throws a readable Error when there is nothing usable to import.
 */
export function normalizeTable(grid) {
  const rows2d = (grid || []).filter((r) => r.some((c) => norm(c) !== ""));
  if (rows2d.length < 2) throw new Error("The file needs a row of column names and at least one row of data.");

  // Widest row decides the column count. A loop is used instead of Math.max(...rows):
  // spreading 100k+ items overflows the call stack.
  let width = 0;
  for (const r of rows2d) if (r.length > width) width = r.length;

  const seen = new Map(); // heading -> how many times we have used it
  const headers = Array.from({ length: width }, (_, i) => {
    const h = norm(rows2d[0][i]) || `Column ${i + 1}`;
    const n = (seen.get(h) || 0) + 1;
    seen.set(h, n);
    return n > 1 ? `${h} (${n})` : h;
  });
  const rows = rows2d.slice(1).map((r) => headers.map((_, i) => norm(r[i])));
  return { headers, rows };
}

// Distinct values per column, cached per library object. Without the cache every
// question would rescan every row, which is slow for libraries with 100k+ rows.
// Libraries are never changed after import, so the cache never goes stale.
const valueCache = new WeakMap();

/** Distinct, non-empty values of one column in first-seen order (case-insensitive). */
export function columnValues(lib, col) {
  let perLib = valueCache.get(lib);
  if (!perLib) valueCache.set(lib, (perLib = new Map()));
  if (perLib.has(col)) return perLib.get(col);

  const seen = new Set();
  const out = [];
  for (const r of lib.rows) {
    const v = r[col];
    if (v !== "" && !seen.has(key(v))) {
      seen.add(key(v));
      out.push(v);
    }
  }
  perLib.set(col, out);
  return out;
}

/**
 * Choose which cards (row indexes) a quiz will ask about, in random order.
 * opts: { qCol, aCol, count, filterCol?, filterValues? }
 *  - rows with an empty question or empty answer are skipped
 *  - when filterCol and filterValues are given, only rows whose filterCol value is
 *    in filterValues are used (this is the "limit to categories" setting)
 *  - at most `count` cards are returned (fewer if the library has fewer)
 */
export function selectCards(lib, opts, rng = Math.random) {
  const { qCol, aCol, count, filterCol, filterValues } = opts;
  const allowed = filterCol != null && filterValues?.length ? new Set(filterValues.map(key)) : null;
  const pool = [];
  lib.rows.forEach((r, idx) => {
    if (norm(r[qCol]) === "" || norm(r[aCol]) === "") return;
    if (allowed && !allowed.has(key(r[filterCol]))) return;
    pool.push(idx);
  });
  return shuffle(pool, rng).slice(0, Math.max(0, count));
}

/**
 * Build one multiple-choice question for the card at `rowIdx`.
 * Wrong options ("distractors") are other distinct values from the same answer column,
 * never equal to the correct answer. Small libraries may give fewer than `choices`
 * options. Returns { rowIdx, question, correct, options }.
 */
export function buildQuestion(lib, rowIdx, opts, rng = Math.random) {
  const { qCol, aCol, choices = 4 } = opts;
  const row = lib.rows[rowIdx];
  const correct = norm(row[aCol]);
  const all = columnValues(lib, aCol);
  const ck = key(correct);

  let distractors;
  if (all.length <= 50) {
    // Small column: shuffle all other values and take what we need.
    distractors = shuffle(all.filter((v) => key(v) !== ck), rng).slice(0, choices - 1);
  } else {
    // Big column: sample at random instead of shuffling every value for every question.
    // The Map keeps the picks unique; 200 tries is far more than ever needed.
    const picked = new Map();
    for (let tries = 0; picked.size < choices - 1 && tries < 200; tries++) {
      const v = all[Math.floor(rng() * all.length)];
      if (key(v) !== ck) picked.set(key(v), v);
    }
    distractors = [...picked.values()];
  }
  const options = shuffle([correct, ...distractors], rng);
  return { rowIdx, question: norm(row[qCol]), correct, options };
}

/**
 * Which columns to show on the card after an answer.
 * `show` is the user's saved choice (array of column indexes), or null for "all".
 * The question and answer columns are always included, indexes outside the library
 * (for example from an older save) are ignored, and spreadsheet column order is kept.
 */
export function columnsToShow(nCols, show, qCol, aCol) {
  const set = new Set(Array.isArray(show) ? show : Array.from({ length: nCols }, (_, i) => i));
  set.add(qCol);
  set.add(aCol);
  return [...set].filter((i) => Number.isInteger(i) && i >= 0 && i < nCols).sort((a, b) => a - b);
}

/** Is the picked option the right answer? Case and spacing are ignored. */
export const isCorrect = (q, picked) => key(q.correct) === key(picked);

/**
 * Summarise a finished quiz. `answers` is [{ rowIdx, ok }, ...].
 * Returns { total, correct, percent, missed } where `missed` lists the row indexes
 * answered wrongly (used by "Retry missed").
 */
export function summarise(answers) {
  const total = answers.length;
  const correct = answers.filter((a) => a.ok).length;
  return {
    total,
    correct,
    percent: total ? Math.round((correct / total) * 100) : 0,
    missed: answers.filter((a) => !a.ok).map((a) => a.rowIdx),
  };
}
