/**
 * Minimal RFC-4180 CSV reader for partner exports.
 *
 * Partners hand us CSV far more often than JSON, so this lives next to the
 * builders rather than inside any one of them. It is deliberately tiny: no
 * streaming, no type coercion, no header remapping — a builder reads the columns
 * it wants by name and does its own parsing.
 *
 * Handles: quoted fields, `""` escapes, embedded newlines and semicolons inside
 * quotes, CRLF, and a leading UTF-8 BOM (Equipe Trading's exports have one).
 */

export type CsvRow = Record<string, string>;

/** Split CSV text into raw rows of raw fields. */
function splitRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'; // escaped quote
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // ignore — handled by the \n that follows
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  // Trailing row without a final newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Parse CSV text into objects keyed by the header row. Values are trimmed;
 * missing trailing columns read as "". Blank lines are skipped.
 */
export function parseCsv(text: string, delimiter = ";"): CsvRow[] {
  const rows = splitRows(text.replace(/^﻿/, ""), delimiter);
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim());

  return rows.slice(1).flatMap((raw) => {
    // Skip blank lines (a single empty field).
    if (raw.length <= 1 && !raw[0]?.trim()) return [];
    const row: CsvRow = {};
    header.forEach((key, i) => {
      row[key] = (raw[i] ?? "").trim();
    });
    return [row];
  });
}
