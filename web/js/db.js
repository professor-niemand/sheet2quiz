/**
 * db.js: all saving and loading. Data never leaves the device.
 *
 * Storage is the browser's IndexedDB (inside the Android app, the WebView's).
 * Two stores:
 *   libraries  one record per imported spreadsheet   { id, name, headers, rows, createdAt }
 *   sessions   one record per finished quiz           { id, libraryId, date, total, correct, percent, missed, ... }
 *
 * The database keeps its original internal name "flashcards" (from an early build) so
 * libraries saved by older versions still load. Do not rename it.
 *
 * Exports: uid, saveLibrary, listLibraries, getLibrary, deleteLibrary, saveSession,
 *          listSessions, allSessions, exportAll, importAll, protectStorage, storageStatus
 */
const DB_NAME = "flashcards";
const VERSION = 1; // bump only together with a migration in onupgradeneeded below

/** Open the database, creating the two stores the first time. */
function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore("libraries", { keyPath: "id" });
      const s = db.createObjectStore("sessions", { keyPath: "id" });
      s.createIndex("libraryId", "libraryId"); // lets us list one library's history quickly
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Run `fn(store)` inside one transaction and resolve with the request's result.
 * `fn` must return the IDBRequest it made (for example store.put(...)).
 */
async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const out = fn(t.objectStore(store));
    t.oncomplete = () => resolve(out.result);
    t.onerror = () => reject(t.error);
  });
}

/** New unique id. crypto.randomUUID needs https or localhost, which the app requires anyway. */
export const uid = () => crypto.randomUUID();

// ---------- Libraries ----------
export const saveLibrary = (lib) => tx("libraries", "readwrite", (s) => s.put(lib));
export const listLibraries = () => tx("libraries", "readonly", (s) => s.getAll());
export const getLibrary = (id) => tx("libraries", "readonly", (s) => s.get(id));

/** Delete a library together with all of its quiz history. */
export async function deleteLibrary(id) {
  await tx("libraries", "readwrite", (s) => s.delete(id));
  const sessions = await listSessions(id);
  for (const x of sessions) await tx("sessions", "readwrite", (s) => s.delete(x.id));
}

// ---------- Quiz history ----------
export const saveSession = (sess) => tx("sessions", "readwrite", (s) => s.put(sess));
export const listSessions = (libraryId) => tx("sessions", "readonly", (s) => s.index("libraryId").getAll(libraryId));
export const allSessions = () => tx("sessions", "readonly", (s) => s.getAll());

// ---------- Backup and restore ----------

/** Everything (libraries and history) as one JSON string, ready to save as a file. */
export async function exportAll() {
  return JSON.stringify({ version: 1, libraries: await listLibraries(), sessions: await allSessions() });
}

/**
 * Load a backup made by exportAll(). Records with the same id are overwritten,
 * everything else is kept, so restoring never deletes existing libraries.
 */
export async function importAll(json) {
  const data = JSON.parse(json);
  if (data.version !== 1 || !Array.isArray(data.libraries)) throw new Error("This is not a Sheet2Quiz backup file.");
  for (const l of data.libraries) await saveLibrary(l);
  for (const s of data.sessions || []) await saveSession(s);
}

// ---------- Protection against automatic cleanup ----------
// Browsers may delete a site's data when the device runs low on space. "Persistent
// storage" asks the browser not to. It is a request, not a guarantee, so backups still matter.

/**
 * Ask the browser to keep our data. Resolves to "protected", "unprotected" (the browser
 * said no) or "unknown" (not supported). Call it after a user action: some browsers
 * (Firefox) show a permission prompt, others decide silently.
 */
export async function protectStorage() {
  if (!navigator.storage?.persist) return "unknown";
  try { return (await navigator.storage.persist()) ? "protected" : "unprotected"; } catch { return "unknown"; }
}

/** Current protection state, same three values as protectStorage(), without asking. */
export async function storageStatus() {
  if (!navigator.storage?.persisted) return "unknown";
  try { return (await navigator.storage.persisted()) ? "protected" : "unprotected"; } catch { return "unknown"; }
}
