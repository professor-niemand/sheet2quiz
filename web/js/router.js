/**
 * router.js: a tiny screen switcher.
 *
 * Every screen ("view") registers itself under a name, and any view can open another
 * with go("name", ...args). Views therefore never import each other, which avoids
 * circular imports and keeps each view file self-contained.
 *
 * Screen names in use: "home", "setup", "quiz", "results", "history".
 *
 * Exports: register, go
 */

const views = {}; // name -> function that renders that screen

/** Called once at the bottom of each view file. */
export function register(name, fn) {
  views[name] = fn;
}

/** Open a screen. Extra arguments are passed to the view (for example the library). */
export function go(name, ...args) {
  if (!views[name]) throw new Error(`Unknown screen: ${name}`);
  return views[name](...args);
}
