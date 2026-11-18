// Formats and prints a POS receipt. This is the "browser print" version
// discussed with Josh — works with any printer today via the normal OS
// print dialog. Sized for an 80mm thermal roll (a printer that width is
// what's commonly sold as an ESC/POS thermal receipt printer, so this
// same layout should still look right if/when direct thermal printing
// gets added later).
//
import { BUSINESS_NAME, BUSINESS_ADDRESS, BUSINESS_PHONE } from "@/lib/constants/business";

export type ReceiptItem = {
  name: string;
  qty: number;
  unitPrice: number;
};

export type ReceiptData = {
  invoiceNumber: string;
  items: ReceiptItem[];
  total: number;
  amountPaid: number;
  change: number;
  method: string;
};

// Note for later: if this ever moves to raw ESC/POS thermal printing,
// the ₱ symbol may need a codepage fallback (e.g. "P") depending on the
// printer's supported character set. Not a concern for browser printing.
function peso(n: number) {
  return `₱${n.toFixed(2)}`;
}

export function printReceipt(data: ReceiptData) {
  const receiptWindow = window.open("", "_blank", "width=420,height=650");
  if (!receiptWindow) return; // popup blocked — nothing more we can do here

  const itemRows = data.items
    .map(
      (item) => `
        <div class="item-row">
          <span class="item-name">${item.name}</span>
        </div>
        <div class="item-row">
          <span>${item.qty} x ${peso(item.unitPrice)}</span>
          <span>${peso(item.qty * item.unitPrice)}</span>
        </div>`
    )
    .join("");

  const now = new Date();

  receiptWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt ${data.invoiceNumber}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          * { box-sizing: border-box; }
          body {
            font-family: "Courier New", monospace;
            font-size: 12px;
            color: #000;
            width: 72mm;
            margin: 0 auto;
          }
          .center { text-align: center; }
          .shop-name { font-size: 15px; font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; }
          .item-row { display: flex; justify-content: space-between; }
          .item-name { font-weight: bold; }
          .totals .row { padding: 1px 0; }
          .grand-total { font-weight: bold; font-size: 13px; }
          .policy { font-size: 10.5px; margin-top: 10px; line-height: 1.4; }
          .footer { margin-top: 12px; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="shop-name">${BUSINESS_NAME}</div>
          <div>${BUSINESS_ADDRESS}</div>
          <div>${BUSINESS_PHONE}</div>
        </div>

        <div class="divider"></div>

        <div class="row"><span>Invoice #</span><span>${data.invoiceNumber}</span></div>
        <div class="row"><span>Date</span><span>${now.toLocaleDateString("en-US", { dateStyle: "medium" })}</span></div>
        <div class="row"><span>Time</span><span>${now.toLocaleTimeString("en-US", { timeStyle: "short" })}</span></div>

        <div class="divider"></div>

        ${itemRows}

        <div class="divider"></div>

        <div class="totals">
          <div class="row grand-total"><span>TOTAL</span><span>${peso(data.total)}</span></div>
          <div class="row"><span>${data.method}</span><span>${peso(data.amountPaid)}</span></div>
          <div class="row"><span>CHANGE</span><span>${peso(data.change)}</span></div>
        </div>

        <div class="divider"></div>

        <div class="policy">
          <strong>Return Policy:</strong><br />
          Damaged or expired items may be returned within 7 days of purchase
          and are replaced with the same item. Please keep this slip: the
          invoice number is required for any return. No cash refunds.
        </div>

        <div class="center footer">Thank you for shopping with us!</div>

        <script>
          window.onload = function () { window.print(); };
        </script>
      </body>
    </html>
  `);
  receiptWindow.document.close();
}

// ---------------------------------------------------------------------------
// Return slip: printed after a damaged/expired item is replaced.
// ---------------------------------------------------------------------------
export type ReturnSlipData = {
  returnNumber: string;
  invoiceNumber: string;
  soldAt: string;
  reason: string;
  note: string | null;
  items: { name: string; quantity: number }[];
  createdAt: string;
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const REASON_LABEL: Record<string, string> = { damaged: "Damaged", expired: "Expired", other: "Other" };

export function printReturnSlip(data: ReturnSlipData) {
  const slip = window.open("", "_blank", "width=420,height=650");
  if (!slip) return;
  const manila = (value: string) => new Date(value).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
  const rows = data.items.map((item) => `<div class="row"><span class="name">${escapeHtml(item.name)}</span><span>x${item.quantity}</span></div>`).join("");
  slip.document.write(`<!DOCTYPE html>
    <html><head><title>Return ${escapeHtml(data.returnNumber)}</title><meta charset="utf-8" />
      <style>
        @page { size: 80mm auto; margin: 4mm; }
        * { box-sizing: border-box; }
        body { font-family: "Courier New", monospace; font-size: 12px; color: #000; width: 72mm; margin: 0 auto; }
        .center { text-align: center; }
        .shop-name { font-size: 15px; font-weight: bold; }
        .title { font-size: 14px; font-weight: bold; margin-top: 6px; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; gap: 8px; }
        .name { font-weight: bold; }
        .small { font-size: 10.5px; line-height: 1.4; }
        .sign { margin-top: 22px; border-top: 1px solid #000; padding-top: 2px; text-align: center; font-size: 10.5px; }
      </style></head>
      <body>
        <div class="center">
          <div class="shop-name">${BUSINESS_NAME}</div>
          <div>${BUSINESS_ADDRESS}</div>
          <div>${BUSINESS_PHONE}</div>
          <div class="title">RETURN SLIP: REPLACEMENT</div>
        </div>
        <div class="divider"></div>
        <div class="row"><span>Return #</span><span>${escapeHtml(data.returnNumber)}</span></div>
        <div class="row"><span>Original invoice</span><span>${escapeHtml(data.invoiceNumber)}</span></div>
        <div class="row"><span>Purchased</span><span>${manila(data.soldAt)}</span></div>
        <div class="row"><span>Returned</span><span>${manila(data.createdAt)}</span></div>
        <div class="row"><span>Reason</span><span>${REASON_LABEL[data.reason] ?? escapeHtml(data.reason)}</span></div>
        ${data.note ? `<div class="small">Note: ${escapeHtml(data.note)}</div>` : ""}
        <div class="divider"></div>
        <div class="small"><strong>Replaced with the same item:</strong></div>
        ${rows}
        <div class="divider"></div>
        <div class="small">The returned item(s) were exchanged for the same product. No cash was refunded.</div>
        <div class="sign">Customer signature</div>
        <script>window.onload = function () { window.print(); };</script>
      </body></html>`);
  slip.document.close();
}
