// Shared export engine for Report Management. Every tab hands this a title,
// a column list and its currently-filtered rows, plus the report period and
// totals, and gets back a downloaded file.
//
// PDF, Print and Excel carry the same report header: letterhead, title,
// report period (From / To, or "As of" for snapshots), date generated, a
// TOTAL row and a summary block. CSV stays plain data so it imports cleanly.
import { BUSINESS_NAME, BUSINESS_ADDRESS, BUSINESS_LOGO_PATH } from "@/lib/constants/business";

export type ExportColumn<T> = {
  header: string;
  accessor: (row: T) => string | number;
  /** "currency" prints 1,234.50 in PDF/Print; spreadsheets keep raw numbers. */
  format?: "currency" | "number";
  /** When set, the column gets a value in the TOTAL row. */
  total?: (rows: T[]) => number;
  /** Keep the value on one line (dates, IDs, short labels). */
  nowrap?: boolean;
};

/** A date range (YYYY-MM-DD) for period reports, or a snapshot taken at export time. */
export type ReportPeriod =
  | { kind: "range"; from: string | null; to: string | null }
  | { kind: "asOf" };

export type ReportSummaryItem = { label: string; value: string };

export type ExportOptions<T> = {
  title: string;
  columns: ExportColumn<T>[];
  rows: T[];
  filename: string;
  period?: ReportPeriod;
  /** Extra totals shown below the table, e.g. "Total sales". */
  summary?: (rows: T[]) => ReportSummaryItem[];
};

const MANILA = "Asia/Manila";

/** "2026-11-01" -> "Nov 1, 2026" (date-only, no timezone shift). */
export function formatReportDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatAmount(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Earliest/latest YYYY-MM-DD among rows, used when no filter date is set. */
export function dateBounds<T>(rows: T[], dateOf: (row: T) => string | null | undefined): { from: string | null; to: string | null } {
  const dates = rows.map(dateOf).filter((d): d is string => !!d).map(d => d.slice(0, 10)).sort();
  return { from: dates[0] ?? null, to: dates[dates.length - 1] ?? null };
}

function generatedLabel(now: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short", timeZone: MANILA }).format(now);
}

function periodLines(period: ReportPeriod | undefined, now: Date): string[] {
  if (!period) return [];
  if (period.kind === "asOf") return [`As of: ${generatedLabel(now)}`];
  return [`From: ${period.from ? formatReportDate(period.from) : "Earliest record"}`, `To: ${period.to ? formatReportDate(period.to) : "Latest record"}`];
}

function cellText<T>(column: ExportColumn<T>, value: string | number): string {
  if (typeof value === "number" && column.format === "currency") return formatAmount(value);
  if (typeof value === "number" && column.format === "number") return value.toLocaleString("en-US");
  return String(value);
}

function totalRow<T>(columns: ExportColumn<T>[], rows: T[]): string[] | null {
  if (!columns.some(c => c.total)) return null;
  return columns.map((c, i) => {
    if (c.total) return cellText(c, c.total(rows));
    return i === 0 ? `TOTAL (${rows.length} ${rows.length === 1 ? "record" : "records"})` : "";
  });
}

function summaryItems<T>(options: ExportOptions<T>): ReportSummaryItem[] {
  return options.summary ? options.summary(options.rows) : [{ label: "Total records", value: String(options.rows.length) }];
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function htmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function exportReportCSV<T>({ columns, rows, filename }: ExportOptions<T>) {
  const header = columns.map((c) => csvEscape(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => csvEscape(c.accessor(row))).join(","));
  // Leading BOM so Excel opens UTF-8 (e.g. the ₱ sign) correctly instead of mangling it.
  const csv = "﻿" + [header, ...lines].join("\n");
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
}

export async function exportReportExcel<T>(options: ExportOptions<T>) {
  const { title, columns, rows, filename, period } = options;
  const XLSX = await import("xlsx");
  const now = new Date();
  const totals = columns.some(c => c.total)
    ? columns.map((c, i) => c.total ? c.total(rows) : i === 0 ? `TOTAL (${rows.length} records)` : "")
    : null;

  const header: (string | number)[][] = [
    [BUSINESS_NAME],
    [BUSINESS_ADDRESS],
    [title],
    ...periodLines(period, now).map(line => [line]),
    [`Date generated: ${generatedLabel(now)}`],
    [],
  ];
  const aoa: (string | number)[][] = [
    ...header,
    columns.map((c) => c.header),
    ...rows.map((row) => columns.map((c) => c.accessor(row))),
    ...(totals ? [totals] : []),
    [],
    ...summaryItems(options).map(item => [item.label, item.value]),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const lastCol = Math.max(0, columns.length - 1);
  sheet["!merges"] = header.slice(0, -1).map((_, r) => ({ s: { r, c: 0 }, e: { r, c: lastCol } }));
  sheet["!cols"] = columns.map(() => ({ wch: 18 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, title.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Report");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  triggerDownload(new Blob([buffer], { type: "application/octet-stream" }), `${filename}.xlsx`);
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(BUSINESS_LOGO_PATH);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const PINK: [number, number, number] = [255, 95, 158];

export async function exportReportPDF<T>(options: ExportOptions<T>) {
  const { title, columns, rows, filename, period } = options;
  const [{ default: jsPDF }, logoDataUrl] = await Promise.all([
    import("jspdf"),
    loadLogoDataUrl(),
  ]);
  const autoTable = (await import("jspdf-autotable")).default;
  const now = new Date();

  const doc = new jsPDF({ orientation: columns.length > 6 ? "landscape" : "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 14;
  const right = pageWidth - 14;
  let textX = left;

  // Letterhead
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", left, 10, 18, 18);
      textX = 36;
    } catch {
      // Corrupt/unsupported image data — fall back to text-only header.
    }
  }
  doc.setTextColor(39, 39, 42);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(BUSINESS_NAME, textX, 17);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(BUSINESS_ADDRESS, textX, 23);
  doc.setDrawColor(...PINK);
  doc.setLineWidth(0.5);
  doc.line(left, 32, right, 32);

  // Title + report details (period on the left, date generated on the right)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(title, left, 40);
  doc.setFontSize(9);
  let y = 46;
  const lines = periodLines(period, now);
  lines.forEach((line, i) => {
    const [label, ...rest] = line.split(": ");
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, left, y + i * 5);
    const labelWidth = doc.getTextWidth(`${label}:`) + 1.5;
    doc.setFont("helvetica", "normal");
    doc.text(rest.join(": "), left + labelWidth, y + i * 5);
  });
  const dateValue = generatedLabel(now);
  doc.setFont("helvetica", "normal");
  const dateValueWidth = doc.getTextWidth(dateValue);
  doc.text(dateValue, right, y, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text("Date generated:", right - dateValueWidth - 1.5, y, { align: "right" });
  y += Math.max(lines.length, 1) * 5 + 2;

  const foot = totalRow(columns, rows);
  autoTable(doc, {
    startY: y,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => cellText(c, c.accessor(row)))),
    // Column alignment doesn't apply to footer cells, so set it per cell.
    foot: foot ? [foot.map((content, i) => ({ content, styles: { halign: columns[i].format ? "right" as const : "left" as const } }))] : undefined,
    showFoot: "lastPage",
    footStyles: { fillColor: [252, 228, 240], textColor: [39, 39, 42], fontStyle: "bold" },
    styles: { fontSize: 8.5, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }, valign: "middle" },
    headStyles: { fillColor: PINK, textColor: 255, fontStyle: "bold", valign: "middle" },
    columnStyles: Object.fromEntries(columns.map((c, i) => [i, {
      ...(c.format ? { halign: "right" as const } : {}),
      ...(c.nowrap ? { cellWidth: "wrap" as const } : {}),
    }])),
    // Header cells don't inherit column alignment: line number headers up with their values.
    didParseCell: (data) => {
      if (data.section === "head" && columns[data.column.index]?.format) data.cell.styles.halign = "right";
    },
    margin: { left, right: 14, bottom: 18 },
  });

  // Summary block after the table (new page if it doesn't fit)
  const items = summaryItems(options);
  const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  const boxHeight = 8 + items.length * 5.5;
  let boxY = lastY + 8;
  if (boxY + boxHeight > pageHeight - 18) { doc.addPage(); boxY = 20; }
  const boxWidth = 90;
  const boxX = right - boxWidth;
  doc.setDrawColor(...PINK);
  doc.setFillColor(253, 242, 248);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, "FD");
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", boxX + 4, boxY + 6);
  doc.setFontSize(9);
  items.forEach((item, i) => {
    const rowY = boxY + 12 + i * 5.5;
    doc.setFont("helvetica", "normal");
    doc.text(item.label, boxX + 4, rowY);
    doc.setFont("helvetica", "bold");
    doc.text(item.value, boxX + boxWidth - 4, rowY, { align: "right" });
  });

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(113, 113, 122);
    doc.text(`${BUSINESS_NAME} · ${title}`, left, pageHeight - 8);
    doc.text(`Page ${page} of ${pages}`, right, pageHeight - 8, { align: "right" });
  }

  doc.save(`${filename}.pdf`);
}

export async function printReport<T>(options: ExportOptions<T>) {
  const { title, columns, rows, period } = options;
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) return; // popup blocked — nothing more we can do here
  const now = new Date();
  const foot = totalRow(columns, rows);
  const align = (c: ExportColumn<T> | undefined) => {
    const classes = [c?.format ? "num" : "", c?.nowrap ? "nowrap" : ""].filter(Boolean).join(" ");
    return classes ? ` class="${classes}"` : "";
  };

  const tableRows = rows
    .map((row) => `<tr>${columns.map((c) => `<td${align(c)}>${htmlEscape(cellText(c, c.accessor(row)))}</td>`).join("")}</tr>`)
    .join("");
  const footRow = foot ? `<tfoot><tr>${foot.map((v, i) => `<td${align(columns[i])}>${htmlEscape(v)}</td>`).join("")}</tr></tfoot>` : "";
  const details = periodLines(period, now).map(line => {
    const [label, ...rest] = line.split(": ");
    return `<span><strong>${htmlEscape(label)}:</strong> ${htmlEscape(rest.join(": "))}</span>`;
  }).join("");
  const summary = summaryItems(options).map(item => `<tr><td>${htmlEscape(item.label)}</td><td class="num"><strong>${htmlEscape(item.value)}</strong></td></tr>`).join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${htmlEscape(title)}</title>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #27272a; padding: 32px; }
          .letterhead { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #FF5F9E; padding-bottom: 14px; margin-bottom: 18px; }
          .letterhead img { width: 56px; height: 56px; object-fit: contain; }
          .letterhead h1 { font-size: 16px; margin: 0; }
          .letterhead p { font-size: 11px; color: #71717a; margin: 2px 0 0; }
          h2 { font-size: 14px; margin: 0 0 6px; }
          .meta { display: flex; justify-content: space-between; gap: 16px; font-size: 11px; margin: 0 0 14px; }
          .meta .period { display: flex; flex-direction: column; gap: 2px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #E8E8E8; padding: 6px 8px; text-align: left; }
          th { background: #FCE4F0; }
          td.num, th.num { text-align: right; }
          .nowrap { white-space: nowrap; }
          tfoot td { background: #FCE4F0; font-weight: bold; }
          .summary { width: 320px; margin: 16px 0 0 auto; }
          .summary caption { text-align: left; font-weight: bold; padding-bottom: 4px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="letterhead">
          <img src="${BUSINESS_LOGO_PATH}" alt="Logo" />
          <div>
            <h1>${htmlEscape(BUSINESS_NAME)}</h1>
            <p>${htmlEscape(BUSINESS_ADDRESS)}</p>
          </div>
        </div>
        <h2>${htmlEscape(title)}</h2>
        <div class="meta"><div class="period">${details}</div><div><strong>Date generated:</strong> ${htmlEscape(generatedLabel(now))}</div></div>
        <table>
          <thead><tr>${columns.map((c) => `<th${align(c)}>${htmlEscape(c.header)}</th>`).join("")}</tr></thead>
          <tbody>${tableRows}</tbody>
          ${footRow}
        </table>
        <table class="summary"><caption>Summary</caption><tbody>${summary}</tbody></table>
        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
