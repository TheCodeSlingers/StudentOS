import { BadRequestError } from "../common/errors";

export interface CSVRow {
  rowNumber: number;
  email: string;
  name: string;
  phone?: string;
  courseName?: string;
  specialization?: string;
  skills?: string[];
}

export function parseCSV(buffer: Buffer): CSVRow[] {
  const content = buffer.toString("utf8");
  if (!content.trim()) {
    throw new BadRequestError("CSV file is empty", "EMPTY_FILE");
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentVal);
      currentVal = "";
    } else if (char === "\n" && !inQuotes) {
      currentRow.push(currentVal);
      rows.push(currentRow);
      currentRow = [];
      currentVal = "";
    } else if (char === "\r" && !inQuotes) {
      if (nextChar === "\n") {
        i++;
      }
      currentRow.push(currentVal);
      rows.push(currentRow);
      currentRow = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal);
    rows.push(currentRow);
  }

  const cleanRows = rows.filter((r) =>
    r.some((cell) => cell.trim().length > 0),
  );
  if (cleanRows.length === 0) {
    throw new BadRequestError("CSV file is empty", "EMPTY_FILE");
  }

  const headers = cleanRows[0].map((h) => h.trim().toLowerCase());
  const emailIdx = headers.indexOf("email");
  const nameIdx = headers.indexOf("name");

  if (emailIdx === -1 || nameIdx === -1) {
    throw new BadRequestError(
      "CSV is missing required headers: email, name",
      "MISSING_HEADERS",
    );
  }

  const phoneIdx = headers.indexOf("phone");
  const courseIdx = headers.indexOf("coursename");
  const specIdx = headers.indexOf("specialization");
  const skillsIdx = headers.indexOf("skills");

  const results: CSVRow[] = [];

  for (let i = 1; i < cleanRows.length; i++) {
    const values = cleanRows[i];
    const email = values[emailIdx]?.trim();
    const name = values[nameIdx]?.trim();

    if (!email || !name) {
      continue;
    }

    const row: CSVRow = {
      rowNumber: i,
      email,
      name,
    };

    if (phoneIdx !== -1 && values[phoneIdx]?.trim()) {
      row.phone = values[phoneIdx].trim();
    }
    if (courseIdx !== -1 && values[courseIdx]?.trim()) {
      row.courseName = values[courseIdx].trim();
    }
    if (specIdx !== -1 && values[specIdx]?.trim()) {
      row.specialization = values[specIdx].trim();
    }
    if (skillsIdx !== -1 && values[skillsIdx]?.trim()) {
      const skillsStr = values[skillsIdx].trim();
      row.skills = skillsStr
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    results.push(row);
  }

  return results;
}
