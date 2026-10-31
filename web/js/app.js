/**
 * app.js: entry point. Loaded by index.html as a module.
 *
 * Project map (web/js):
 *   engine.js   quiz logic, pure functions (tested in Node)
 *   parse.js    reads CSV / XLSX files
 *   db.js       saving and loading (IndexedDB), backup, storage protection
 *   ui.js       DOM helpers, toast, file download
 *   icons.js    inline SVG icons
 *   router.js   opens screens by name
 *   theme.js    colour theme (plain script in <head>)
 *   views/      one file per screen: home, setup, quiz, results, history
 *
 * This file only wires things together: it loads the views (each registers itself with
 * the router), connects the app bar, opens the home screen and registers the offline cache.
 */
import { h } from "./ui.js";
import { icon } from "./icons.js";
import { go } from "./router.js";

// Importing a view file registers its screen with the router (see the end of each file).
import "./views/home.js";
import "./views/setup.js";
import "./views/quiz.js";
import "./views/results.js";
import "./views/history.js";

// ----- App bar -----
// The brand button always returns to the home screen.
document.getElementById("brand").addEventListener("click", () => {
  go("home");
});

// The theme button cycles Auto, Light, Dim, Dark. It sits in the app bar so the theme
// can be changed from any screen, including mid-quiz (handy for reading at night).
const themeBtn = document.getElementById("themeBtn");
function showTheme() {
  const name = window.appTheme.label();
  themeBtn.replaceChildren(icon("theme", 18), h("span", {}, name));
  themeBtn.setAttribute("aria-label", `Theme: ${name}. Press to change.`);
}
themeBtn.addEventListener("click", () => { window.appTheme.next(); showTheme(); });
showTheme();

// ----- Start -----
go("home");

// Offline support: the service worker caches the app so it opens without a connection.
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => { /* offline mode unavailable, app still works online */ });
