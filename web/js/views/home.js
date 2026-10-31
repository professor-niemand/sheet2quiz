/**
 * views/home.js: the first screen.
 *
 * Shows, top to bottom:
 *   1. three data actions, each with a one-line hint saying what it does
 *        Import library  add a spreadsheet as a new library
 *        Back up         save all libraries and history to one file
 *        Restore         load such a file again
 *   2. whether the browser has promised not to clear the app's data
 *   3. the list of imported libraries (Study, History, Delete), or a short how-it-works
 *      guide when there are none yet
 *
 * Opens: "setup" (Study) and "history" (History). Registered as "home".
 */
import { h, mount, toast, download, plural } from "../ui.js";
import { icon } from "../icons.js";
import { go, register } from "../router.js";
import * as db from "../db.js";
import { parseFile } from "../parse.js";

// What to tell the user about the browser's storage promise (see db.protectStorage).
const STORAGE_TEXT = {
  protected: "Your browser will not clear this data automatically. Back up now and then anyway.",
  unprotected: "Your browser may clear this data if the device runs low on space. Back up regularly to keep your history safe.",
  unknown: "Back up regularly to keep your libraries and history safe.",
};

/**
 * One row of the actions panel: icon, bold title, and a hint line under it.
 * `primary` highlights the main action (importing).
 */
function actionRow(iconName, title, hint, onclick, primary = false) {
  return h("button", { type: "button", class: "action" + (primary ? " primary-action" : ""), onclick },
    h("span", { class: "action-icon" }, icon(iconName)),
    h("span", { class: "action-text" }, h("strong", {}, title), h("span", { class: "hint" }, hint)));
}

/** Map of libraryId -> percent score of that library's most recent quiz. */
function latestScores(sessions) {
  const latest = new Map();
  for (const s of sessions) {
    const cur = latest.get(s.libraryId);
    if (!cur || s.date > cur.date) latest.set(s.libraryId, s);
  }
  return new Map([...latest].map(([id, s]) => [id, s.percent]));
}

/** Render the home screen. */
async function home() {
  const [libs, sessions, storage] = await Promise.all([db.listLibraries(), db.allSessions(), db.storageStatus()]);
  libs.sort((a, b) => b.createdAt - a.createdAt); // newest first
  const scores = latestScores(sessions);

  // Hidden file pickers; the action rows below open them.
  const importInput = h("input", { type: "file", accept: ".csv,.tsv,.txt,.xlsx", hidden: true, onchange: async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const { headers, rows } = await parseFile(f);
      const lib = { id: db.uid(), name: f.name.replace(/\.[^.]+$/, ""), headers, rows, createdAt: Date.now() };
      await db.saveLibrary(lib);
      await db.protectStorage(); // a good moment to ask: the user now has something worth keeping
      toast(`Imported ${lib.name}: ${plural(rows.length, "card")}`);
      home();
    } catch (err) { toast(err.message); }
  } });

  const restoreInput = h("input", { type: "file", accept: ".json", hidden: true, onchange: async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { await db.importAll(await f.text()); toast("Backup restored"); home(); } catch (err) { toast(err.message); }
  } });

  // Status line, with a button to ask again when the browser has not agreed yet.
  const storageLine = h("div", { class: "status" }, icon("shield", 16),
    h("p", {}, STORAGE_TEXT[storage]),
    storage === "unprotected"
      ? h("button", { type: "button", class: "quiet small", onclick: async () => {
          const r = await db.protectStorage();
          toast(r === "protected" ? "Storage protected" : "Your browser did not agree. Use Back up instead.");
          home();
        } }, "Ask browser to protect it")
      : null);

  // Library list, or the how-it-works guide when empty.
  const body = libs.length === 0
    ? h("div", { class: "panel" },
        h("h2", {}, "How it works"),
        // A real sequence, so a numbered list is the right element.
        h("ol", { class: "steps" },
          h("li", {}, "Import a spreadsheet. The first row must hold your column names."),
          h("li", {}, "Choose which column is the question and which is the answer."),
          h("li", {}, "Answer multiple-choice questions and see the full card after each one.")))
    : h("ul", { class: "cards" }, libs.map((l) => h("li", { class: "lib" },
        h("div", { class: "lib-head" },
          h("strong", { class: "lib-name" }, l.name),
          scores.has(l.id) ? h("span", { class: "pill", title: "Score of your most recent quiz" }, `Last quiz ${scores.get(l.id)}%`) : null),
        h("p", { class: "muted" }, `${plural(l.rows.length, "card")}, ${plural(l.headers.length, "column")}`),
        h("div", { class: "lib-actions" },
          h("button", { type: "button", class: "primary", onclick: () => go("setup", l) }, icon("play", 18), "Study"),
          h("button", { type: "button", onclick: () => go("history", l) }, icon("chart", 18), "History"),
          h("button", { type: "button", class: "icon-only danger", title: "Delete this library and its history", "aria-label": `Delete ${l.name}`,
            onclick: async () => {
              if (confirm(`Delete "${l.name}" and its history? This cannot be undone. Back up first if you are unsure.`)) { await db.deleteLibrary(l.id); home(); }
            } }, icon("trash", 18)))
      )));

  mount(
    h("h1", {}, "Your libraries"),
    h("p", { class: "lead" }, "Turn a spreadsheet into a quiz. Everything stays on this device."),
    h("section", { "aria-label": "Files" },
      h("div", { class: "actions" },
        actionRow("upload", "Import library", "Add a CSV or XLSX spreadsheet as a new library.", () => importInput.click(), true),
        actionRow("download", "Back up", "Save all libraries and your history to one file.",
          async () => { await download(`sheet2quiz-backup-${new Date().toISOString().slice(0, 10)}.json`, await db.exportAll(), "application/json"); toast("Backup ready"); }),
        actionRow("restore", "Restore", "Load a backup file to bring libraries and history back.", () => restoreInput.click())),
      storageLine),
    importInput, restoreInput,
    body,
    h("p", { class: "footnote muted" }, "Open source, MIT licence. No accounts, no tracking.")
  );
}

register("home", home);
