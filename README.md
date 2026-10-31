# Sheet2Quiz

Open-source quizzes and flashcards built from your own spreadsheets. Works offline in the browser (PWA) and as an Android app (Capacitor). No accounts, no tracking, no server: your libraries and stats stay on your device.

## Features

- Import `.csv`, `.tsv` or `.xlsx` (first row = column names, any number of columns).
- Per quiz, choose which column is the **question** and which is the **answer**.
- Optional **category filter**: pick any column and tick the values to include.
- Choose how many questions you want up front.
- Multiple choice: wrong options are drawn from other answers in the same column.
- After each answer you see the card with the columns you chose (all by default), after right and wrong answers alike. You pick the columns on the setup screen before each quiz; the choice is remembered per library and can be changed any time before you start. The question and answer columns are always shown. Right and wrong are marked with text as well as colour.
- End-of-quiz score, a "Retry missed" round, and **history per library by date** with a trend line.
- **Themes:** Auto (follows your system), Light, Dim (a softer dark for reading in a dim room) and Dark. One button in the top bar cycles through them on any screen, and your choice is remembered.
- No external fonts, scripts or network calls: the system font is used and everything is bundled.

## The buttons on the home screen

| Button | What it does |
|---|---|
| **Import library** | Adds a CSV or XLSX spreadsheet as a new library. |
| **Back up** | Saves all libraries **and your history** to one `.json` file. |
| **Restore** | Loads a backup file again (existing libraries are kept; same ones are overwritten). |

Cards can always be rebuilt from your original spreadsheets, but your quiz history exists only in the app, so back up now and then. The home screen also tells you whether your browser has promised not to clear the app's data automatically, and lets you ask it to.

## Library format

A library is just a spreadsheet. See `samples/world-capitals.csv`.

```csv
Country,Capital,Continent,Language,Fun fact
France,Paris,Europe,French,The Eiffel Tower was built for the 1889 World's Fair
```

Notes: XLSX imports use the first sheet only. Rows missing the chosen question or answer are skipped. Legacy `.xls` is not supported (save as `.xlsx` or `.csv`). Multiple choice needs at least 2 distinct values in the answer column.

## Size limits

There is no hard-coded cap on rows or columns. What is known:

- The quiz engine was stress-tested on a development machine with up to 200,000 rows x 20 columns (about 70 MB of CSV) and 5,000 rows x 200 columns: importing, picking questions and building answer options each take well under a second to a few seconds.
- Not tested: how a given phone, the browser tab or the XLSX reader copes with files that large. XLSX files are unpacked in memory and are the slowest to import; for big libraries use CSV.
- The category filter lists the distinct values of a column, so it is only offered for columns with 60 or fewer distinct values.
- Storage is the browser's IndexedDB (the Android WebView's on Android). Quotas depend on the device and free disk space.
- Practical advice: libraries of a few thousand rows are comfortable anywhere. Split very large libraries by topic.

## Sharing libraries

Share the original CSV/XLSX file, or keep a public GitHub repo of library files and link to the raw file. Recipients import it. Nothing is uploaded anywhere by the app.

## Run the web app

```bash
python3 -m http.server 8080 -d web      # no install needed; open http://localhost:8080
# or, with Node installed:
npm install && npm start
```

Any static host works (GitHub Pages, Netlify, your own server): publish the `web/` folder. Service workers need HTTPS or `localhost`.

## Build the Android app

Requires Node 22+, and Android Studio (or the Android SDK + JDK 21).

```bash
npm install
npx cap sync android     # copies ./web and the plugins into ./android
npx cap open android     # open in Android Studio, then Run
# or from the command line:
npm run android:debug    # produces android/app/build/outputs/apk/debug/app-debug.apk
```

Back up on Android uses the share sheet (Capacitor Filesystem + Share plugins). A release build needs your own signing key; keep it out of the repo. The app id is `org.sheet2quiz.app`; change it in `capacitor.config.json` before publishing anywhere if you want your own.

## Tests

```bash
npm test            # quiz-engine unit tests (Node, no browser)
npm run test:e2e    # browser test: import, quiz, column choice, themes, history, offline (needs Playwright + a browser)
```

## Project layout

```
web/index.html       page shell: app bar, script loading
web/css/style.css    all styles; themes are CSS variables at the top
web/js/app.js        entry point, wires the app bar and starts the home screen
web/js/engine.js     pure quiz logic: selection, answer options, scoring (unit-tested)
web/js/parse.js      CSV/XLSX import
web/js/db.js         IndexedDB storage, backup/restore, storage protection
web/js/ui.js         DOM helpers, toast, file download
web/js/icons.js      inline SVG icons
web/js/router.js     opens screens by name
web/js/theme.js      theme choice, applied before first paint
web/js/views/        one file per screen: home, setup, quiz, results, history
web/sw.js            offline cache (update FILES and VERSION when you change files)
web/vendor/          Papa Parse and read-excel-file (both MIT), committed so it works offline
android/             Capacitor Android project
tests/               unit tests and browser test
```

Contributors: please read [CONTRIBUTING.md](CONTRIBUTING.md). Every file starts with a header comment explaining its role, and the same standard is expected for new code. The IndexedDB database keeps its original internal name (`flashcards`) so libraries saved by earlier builds still load.

## Privacy

All data is stored in the browser's IndexedDB (or the Android WebView's). The only network use is loading the app itself. Imported cell contents are rendered as text, never as HTML.

## Licence

MIT. Third-party licences are in `web/vendor/`.
