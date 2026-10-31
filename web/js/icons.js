/**
 * icons.js: a small set of inline SVG icons.
 *
 * Each icon is just the path data of a 24x24 stroke drawing. Icons take the colour of the
 * surrounding text (stroke="currentColor"), so they follow every theme automatically and
 * need no image files. To add an icon, add a line to PATHS and use icon("name").
 *
 * Exports: icon
 */
import { svgEl } from "./ui.js";

// name -> SVG path data (drawn for this project)
const PATHS = {
  upload: "M12 15V4M7 9l5-5 5 5M4 15v4h16v-4",
  download: "M12 4v11M7 10l5 5 5-5M4 19h16",
  restore: "M5 12a7 7 0 1 0 2-5M5 4v4h4",
  play: "M7 5l12 7-12 7z",
  chart: "M5 20v-8M12 20V5M19 20v-5",
  trash: "M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v6M14 11v6",
  back: "M19 12H5M11 6l-6 6 6 6",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  theme: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v18",
};

/** Return an <svg> element for the named icon. `size` is in pixels. */
export function icon(name, size = 20) {
  return svgEl("svg", {
    viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor",
    "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round",
    "aria-hidden": "true", focusable: "false", // decorative: the button text names the action
  }, svgEl("path", { d: PATHS[name] }));
}
