/**
 * ui.js: small shared helpers used by every view.
 *
 * Nothing here knows about quizzes or libraries. It only builds DOM, shows messages
 * and saves files, so views stay short and readable.
 *
 * Exports: h, svgEl, mount, toast, download, fmtDate, plural
 */

const root = document.getElementById("app"); // every view renders into this element

/**
 * Build a DOM element, hyperscript style.
 *   h("button", { class: "primary", onclick: fn }, "Save")
 * - `class` sets className, `on<event>` props add listeners, `true` sets a boolean attribute,
 *   `false`/`null` skip the attribute, anything else becomes a plain attribute.
 * - Children can be strings, DOM nodes, null (skipped) or nested arrays.
 * Strings are always added as text nodes, never as HTML, so imported spreadsheet
 * content cannot inject markup. Do not add an innerHTML shortcut here.
 */
export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}

/** Build an SVG element (SVG needs its own namespace, so h() cannot be used). */
export function svgEl(tag, attrs = {}, ...kids) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...kids);
  return el;
}

/**
 * Replace the current screen with new content.
 * Also scrolls to the top and moves keyboard/screen-reader focus to the page heading,
 * so a new screen is announced instead of leaving focus on a button that no longer exists.
 */
export function mount(...nodes) {
  // Views may pass nested arrays or null (for example an optional chart): flatten and skip those.
  root.replaceChildren(...nodes.flat().filter(Boolean));
  window.scrollTo(0, 0);
  const title = root.querySelector("h1");
  if (title) {
    title.tabIndex = -1; // focusable by script only, not part of the Tab order
    title.focus({ preventScroll: true });
  }
}

/** Show a short message at the bottom of the screen for a few seconds. */
export function toast(msg) {
  const t = h("div", { class: "toast", role: "status" }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 3500);
}

/**
 * Save text as a file.
 * Browsers: a temporary link with the `download` attribute.
 * Android app (Capacitor): the WebView ignores those downloads, so the file is written
 * to the app cache and the system share sheet opens instead.
 */
export async function download(name, text, type) {
  const cap = window.Capacitor;
  if (cap?.isNativePlatform?.()) {
    try {
      const { Filesystem, Share } = cap.Plugins;
      const f = await Filesystem.writeFile({ path: name, data: text, directory: "CACHE", encoding: "utf8" });
      await Share.share({ title: name, url: f.uri });
    } catch (err) {
      // Closing the share sheet counts as an error on some devices; stay quiet in that case.
      if (!/cancel/i.test(String(err))) toast("Could not share the file: " + err.message);
    }
    return;
  }
  const a = h("a", { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000); // free the temporary URL
}

/** Format a timestamp for display, in the user's own locale. */
export const fmtDate = (ts) => new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** "1 card", "3 cards". Only handles regular English plurals, which is all the UI needs. */
export const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
