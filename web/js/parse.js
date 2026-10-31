/**
 * parse.js: reads an imported spreadsheet file into a library table.
 *
 * Two third-party libraries do the file parsing. Both are committed in web/vendor/ and
 * loaded by index.html as plain scripts, so import works offline:
 *   window.Papa          Papa Parse, for .csv / .tsv / .txt
 *   window.readXlsxFile  read-excel-file, for .xlsx
 * This file only chooses between them and hands a plain 2D grid to normalizeTable()
 * in engine.js, which does the cleaning.
 *
 * Exports: parseFile
 */
import { normalizeTable } from "./engine.js";

/**
 * Read a File chosen by the user. Resolves to { headers, rows }.
 * Rejects with a readable Error for unsupported or empty files (the caller shows it).
 */
export async function parseFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();

  if (ext === "xlsx") {
    // read-excel-file v9 returns every sheet as [{ sheet, data }]. Only the first sheet is used.
    // Legacy .xls is not supported by this reader.
    const sheets = await window.readXlsxFile(file);
    const grid = sheets[0]?.data ?? [];
    // Dates arrive as Date objects; store them as plain YYYY-MM-DD text.
    return normalizeTable(grid.map((r) => r.map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : c))));
  }

  if (ext === "csv" || ext === "tsv" || ext === "txt") {
    const text = await file.text();
    // Drop a leading byte-order mark (Excel adds one) and let Papa guess the delimiter.
    const res = window.Papa.parse(text.replace(/^﻿/, ""), { skipEmptyLines: "greedy" });
    return normalizeTable(res.data);
  }

  throw new Error("Unsupported file type. Use .csv, .tsv or .xlsx. For an old .xls file, save it as .xlsx first.");
}
