// Shared export engine for Report Management. Every tab (Service,
// Inventory, Transaction, Sales) hands this the same shape — a title,
// a column list, and its currently-filtered rows — and gets back a
// real downloaded file. Previously the Export dropdown in every
// FilterToolbar variant was UI-only (buttons that just closed the
// menu); this is what actually makes it do something.
//
// PDF and Print both carry a letterhead (logo + business name +
// address) per Josh's spec. Excel gets the same name/address as plain
// header rows (SheetJS's base xlsx writer can't place a raster image
// short of a much heavier library, so the letterhead there is
// text-only — flagged to Josh rather than silently skipped). CSV is
// left as plain data only, since a logo/name block would just become
// junk cells in spreadsheet software that don't round-trip cleanly.
import { BUSINESS_NAME, BUSINESS_ADDRESS, BUSINESS_LOGO_PATH } from "@/lib/constants/business";

export type ExportColumn<T> = {
  header: string;
  accessor: (row: T) => string | number;
};

type ExportOptions<T> = {
  title: string;
  columns: ExportColumn<T>[];
  rows: T[];
  filename: string;
};

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

export function exportReportCSV<T>({ columns, rows, filename }: ExportOptions<T>) {
  const header = columns.map((c) => csvEscape(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => csvEscape(c.accessor(row))).join(","));
  // Leading BOM so Excel opens UTF-8 (e.g. the ₱ sign) correctly instead of mangling it.
  const csv = "\uFEFF" + [header, ...lines].join("\n");
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
}

export async function exportReportExcel<T>({ title, columns, rows, filename }: ExportOptions<T>) {
  const XLSX = await import("xlsx");

  const aoa: (string | number)[][] = [
    [BUSINESS_NAME],
    [BUSINESS_ADDRESS],
    [title],
    [],
    columns.map((c) => c.header),
    ...rows.map((row) => columns.map((c) => c.accessor(row))),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(0, columns.length - 1) } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(0, columns.length - 1) } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: Math.max(0, columns.length - 1) } },
  ];
  sheet["!cols"] = columns.map(() => ({ wch: 18 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, title.slice(0, 31) || "Report");
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

export async function exportReportPDF<T>({ title, columns, rows, filename }: ExportOptions<T>) {
  const [{ default: jsPDF }, logoDataUrl] = await Promise.all([
    import("jspdf"),
    loadLogoDataUrl(),
  ]);
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: columns.length > 6 ? "landscape" : "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let textX = 14;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", 14, 10, 18, 18);
      textX = 36;
    } catch {
      // Corrupt/unsupported image data — fall back to text-only header.
    }
  }

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(BUSINESS_NAME, textX, 17);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(BUSINESS_ADDRESS, textX, 23);

  doc.setDrawColor(255, 95, 158); // brand-pink
  doc.setLineWidth(0.5);
  doc.line(14, 32, pageWidth - 14, 32);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 40);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`, 14, 45);

  autoTable(doc, {
    startY: 50,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => c.accessor(row))),
    headStyles: { fillColor: [255, 95, 158] },
    styles: { fontSize: 8.5 },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filename}.pdf`);
}

export async function printReport<T>({ title, columns, rows }: ExportOptions<T>) {
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) return; // popup blocked — nothing more we can do here

  const tableRows = rows
    .map(
      (row) =>
        `<tr>${columns.map((c) => `<td>${String(c.accessor(row))}</td>`).join("")}</tr>`
    )
    .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #27272a; padding: 32px; }
          .letterhead { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #FF5F9E; padding-bottom: 14px; margin-bottom: 18px; }
          .letterhead img { width: 56px; height: 56px; object-fit: contain; }
          .letterhead h1 { font-size: 16px; margin: 0; }
          .letterhead p { font-size: 11px; color: #71717a; margin: 2px 0 0; }
          h2 { font-size: 14px; margin: 0 0 2px; }
          .meta { font-size: 10.5px; color: #71717a; margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #E8E8E8; padding: 6px 8px; text-align: left; }
          th { background: #FCE4F0; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="letterhead">
          <img src="${BUSINESS_LOGO_PATH}" alt="Logo" />
          <div>
            <h1>${BUSINESS_NAME}</h1>
            <p>${BUSINESS_ADDRESS}</p>
          </div>
        </div>
        <h2>${title}</h2>
        <p class="meta">Generated ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
        <table>
          <thead><tr>${columns.map((c) => `<th>${c.header}</th>`).join("")}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
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
