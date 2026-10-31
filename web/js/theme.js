/**
 * theme.js: remembers and applies the colour theme.
 *
 * This is a plain script (not a module) loaded in <head>, so the saved theme is applied
 * before the first paint and the page never flashes the wrong colours.
 *
 * Themes: "auto" (follow the system light/dark setting), "light", "dim", "dark".
 * The colours themselves live in css/style.css as variables; this file only sets
 * a data-theme attribute on <html>. "auto" removes the attribute.
 *
 * Exposes window.appTheme with: get(), set(name), next(), label(name).
 */
(function () {
  var ORDER = ["auto", "light", "dim", "dark"];
  var LABEL = { auto: "Auto", light: "Light", dim: "Dim", dark: "Dark" };
  // Browser toolbar colour for each theme (matches --bg in style.css)
  var BAR = { light: "#F7F7F5", dim: "#1E2430", dark: "#0F1115" };

  /** Saved choice, or "auto". localStorage can throw (private mode), so it is wrapped. */
  function get() {
    try {
      var t = localStorage.getItem("theme");
      return ORDER.indexOf(t) >= 0 ? t : "auto";
    } catch (e) { return "auto"; }
  }

  /** Apply a theme to the page without saving it. */
  function apply(t) {
    var root = document.documentElement;
    if (t === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      meta.setAttribute("content", BAR[t] || (systemDark ? BAR.dark : BAR.light));
    }
  }

  window.appTheme = {
    get: get,
    label: function (t) { return LABEL[t || get()]; },
    /** Save and apply a theme. */
    set: function (t) {
      try { localStorage.setItem("theme", t); } catch (e) { /* not saved, still applied */ }
      apply(t);
    },
    /** Switch to the next theme in the order Auto, Light, Dim, Dark. Returns the new name. */
    next: function () {
      var n = ORDER[(ORDER.indexOf(get()) + 1) % ORDER.length];
      window.appTheme.set(n);
      return n;
    },
  };

  apply(get());
})();
