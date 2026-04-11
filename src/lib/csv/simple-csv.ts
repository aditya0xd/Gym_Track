/** Minimal RFC4180-style CSV field escaping. */
export function escapeCsvField(value: string): string {
  if (value === "") return "";
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowToCsvLine(fields: string[]): string {
  return fields.map(escapeCsvField).join(",");
}

/**
 * Parse CSV text into rows of string fields. Handles quoted fields and doubled quotes.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const len = text.length;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  while (i < len) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (c === "\r") {
      i += 1;
      continue;
    }
    if (c === "\n") {
      pushField();
      rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  pushField();
  rows.push(row);

  return rows;
}

export function normalizeHeaderKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}
