# Contributing to Sheet2Quiz

Thanks for helping. This project is a small, dependency-light app, and the main goal of the code is that **a new contributor can read any file and understand it in a minute**. These rules keep it that way.

## Getting started

```bash
python3 -m http.server 8080 -d web   # run the app at http://localhost:8080 (no install, no build)
npm install                          # only needed for tests and the Android build
npm test                             # unit tests for the quiz logic
npm run test:e2e                     # browser test of the whole user journey (needs Playwright)
```

There is no build step. What is in `web/` is what ships.

## Where things live

| Want to change... | Look in |
|---|---|
| How questions, options or scores are made | `web/js/engine.js` (pure functions, has tests) |
| Reading CSV / XLSX files | `web/js/parse.js` |
| Saving, loading, backup, storage protection | `web/js/db.js` |
| A screen's layout or behaviour | `web/js/views/<screen>.js` |
| Colours or spacing | `web/css/style.css` (colours are variables at the top) |
| Shared DOM helpers, icons, screen switching | `web/js/ui.js`, `icons.js`, `router.js` |

Screens never import each other. A screen opens another with `go("name", ...args)` from `router.js`, and registers itself with `register("name", fn)` at the bottom of its file.

## Code standard

1. **Every file starts with a header comment**: what the file is for, what it depends on or opens, and its exports. Someone reading only the header should know whether this is the right file.
2. **Every function has a short doc comment** saying what it does and, if not obvious, what it receives and returns. One or two lines is fine.
3. **Comment the "why", not the "what".** `i++` needs no comment; "loop instead of Math.max(...rows): spreading 100k items overflows the stack" does. If you fixed a bug or avoided a trap, leave a comment for the next person.
4. **Group long files with section comments** (`// ---------- Quiz history ----------`), and the same in CSS (`/* ---------- 8. Quiz ---------- */`).
5. **Use plain, descriptive names.** `filterValues`, not `fv`, unless it is a tiny local variable in a short scope.
6. **Keep functions small.** If a function needs more than a screenful, split it and name the parts.

## Rules that protect users

- **Never put imported text into the page as HTML.** Build elements with `h()` from `ui.js`, which only adds text. Do not use `innerHTML` with spreadsheet content. A shared library from a stranger must not be able to run code.
- **No network calls, trackers, analytics, web fonts or CDN scripts.** Everything the app needs is bundled so it stays private and works offline. Third-party code goes in `web/vendor/` with its licence file next to it.
- **No hard-coded colours** outside the theme section of `style.css`. Use `var(--name)`, so all four themes (Auto, Light, Dim, Dark) keep working.
- **Right and wrong must never rely on colour alone.** Keep the text tags ("Correct answer", "Your pick").
- **Touch targets at least 44px, visible keyboard focus, and keep working at phone width (360px).**
- **Do not rename the IndexedDB database** (`flashcards` in `db.js`). Doing so would hide existing users' libraries and history.

## When you add or rename files

Update `FILES` in `web/sw.js` and bump `VERSION` there. If you do not, offline users keep seeing the old app. Bump `VERSION` for any change to a cached file.

## Tests

- Logic changes in `engine.js` need a unit test in `tests/engine.test.mjs`.
- Behaviour changes in a screen need a step in `tests/e2e.mjs`.
- Run both before opening a pull request. If you could not run the browser test, say so in the pull request.

## Pull requests

Keep them small and about one thing. Describe what changed and why, and how you checked it. Be kind in reviews and discussions: this is a volunteer project.
