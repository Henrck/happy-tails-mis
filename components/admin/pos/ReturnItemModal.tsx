"use client";
// Return a damaged or expired product: find the sale by invoice number,
// choose items and quantities, and hand over the same product as a
// replacement. No cash refunds.
import { useState, type FormEvent } from "react";
import { CheckCircle2, Minus, Plus, Printer, Search, X } from "lucide-react";
import { useStaffRole } from "@/lib/hooks/useStaffRole";
import { formatPeso } from "@/lib/utils/currency";
import { printReturnSlip } from "@/lib/utils/receipt";
import {
  lookupSaleForReturn, processSaleReturn, RETURN_REASONS, RETURN_WINDOW_DAYS,
  type ReturnReason, type ReturnResult, type SaleForReturn,
} from "@/lib/supabase/pos-returns";

const dateTime = (value: string) => new Date(value).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });

export default function ReturnItemModal({ onClose, onCompleted }: { onClose: () => void; onCompleted: () => void }) {
  const isSuperAdmin = useStaffRole() === "superadmin";
  const [invoice, setInvoice] = useState("");
  const [sale, setSale] = useState<SaleForReturn | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<ReturnReason | null>(null);
  const [note, setNote] = useState("");
  const [lateOverride, setLateOverride] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<ReturnResult | null>(null);
  // One ID per attempt so a retried click can't create a second return.
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());

  async function find(event: FormEvent) {
    event.preventDefault();
    if (!invoice.trim() || busy) return;
    setBusy(true); setError(""); setSale(null); setQuantities({}); setLateOverride(false);
    const { sale: found, error: lookupError } = await lookupSaleForReturn(invoice);
    setBusy(false);
    if (lookupError || !found) { setError(lookupError ?? "Sale not found."); return; }
    setSale(found);
  }

  const chosen = sale ? sale.items.filter((item) => (quantities[item.saleItemId] ?? 0) > 0) : [];
  const late = sale ? !sale.withinWindow : false;
  const blockedByWindow = late && !(isSuperAdmin && lateOverride);
  const canSubmit = !!sale && chosen.length > 0 && !!reason && (reason !== "other" || note.trim().length >= 5) && !blockedByWindow && !busy;

  function setQty(id: string, value: number, max: number) {
    setQuantities((old) => ({ ...old, [id]: Math.max(0, Math.min(max, value)) }));
  }

  async function submit() {
    if (!sale || !reason || !canSubmit) return;
    setBusy(true); setError("");
    const { result, error: returnError } = await processSaleReturn({
      requestId, invoice: sale.invoiceNumber, reason, note, lateOverride: late && lateOverride,
      items: chosen.map((item) => ({ saleItemId: item.saleItemId, quantity: quantities[item.saleItemId] })),
    });
    setBusy(false);
    if (returnError || !result) {
      setError(returnError ?? "Unable to process the return.");
      setRequestId(crypto.randomUUID());
      return;
    }
    setDone(result);
    onCompleted();
  }

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-3 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="return-title" className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <header className="flex items-center justify-between gap-3 bg-brand-pink px-6 py-4 text-white">
        <div>
          <h2 id="return-title" className="text-lg font-bold">Return item</h2>
          <p className="text-xs text-white/85">Damaged or expired products are replaced with the same item. No cash refunds.</p>
        </div>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-full p-1.5 hover:bg-white/15"><X size={20} /></button>
      </header>

      {done ? <div className="overflow-y-auto p-6 text-center">
        <CheckCircle2 size={52} className="mx-auto text-emerald-500" />
        <h3 className="mt-3 text-xl font-bold text-zinc-900">Return recorded</h3>
        <p className="mt-1 text-sm text-zinc-500">{done.returnNumber} · for invoice {done.invoiceNumber}</p>
        <ul className="mx-auto mt-5 max-w-sm divide-y divide-zinc-100 rounded-2xl border border-zinc-100 text-left text-sm">
          {done.items.map((item) => <li key={item.name} className="flex justify-between gap-3 px-4 py-2.5"><span>{item.name}</span><span className="font-semibold">× {item.quantity}</span></li>)}
        </ul>
        <p className="mx-auto mt-4 max-w-sm text-sm text-zinc-600">Give the customer the same product as a replacement. It has been taken from stock; the returned unit was not added back.</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button type="button" onClick={() => printReturnSlip(done)} className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-brand-pink px-5 py-2.5 text-sm font-bold text-brand-pink hover:bg-brand-tint"><Printer size={16} />Print return slip</button>
          <button type="button" onClick={onClose} className="rounded-full bg-brand-pink px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-pink-dark">Done</button>
        </div>
      </div> : <div className="overflow-y-auto p-6">
        <form onSubmit={find} className="flex gap-2">
          <label className="sr-only" htmlFor="return-invoice">Invoice number</label>
          <input id="return-invoice" value={invoice} onChange={(event) => setInvoice(event.target.value)} autoFocus autoComplete="off" spellCheck={false}
            placeholder="Invoice # from the receipt, e.g. INV-23" className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm uppercase outline-none focus:border-brand-pink" />
          <button type="submit" disabled={busy || !invoice.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-pink px-5 text-sm font-bold text-white disabled:opacity-50"><Search size={16} />Find</button>
        </form>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {sale && <div className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-zinc-50 px-4 py-3 text-sm">
            <span><strong className="text-zinc-900">Invoice {sale.invoiceNumber}</strong> · {dateTime(sale.soldAt)}</span>
            <span className="text-zinc-500">{sale.daysSinceSale === 0 ? "Today" : `${sale.daysSinceSale} day${sale.daysSinceSale === 1 ? "" : "s"} ago`} · {formatPeso(sale.totalAmount)}</span>
          </div>

          {late && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            This sale is older than {RETURN_WINDOW_DAYS} days, so it is outside the return period.
            {isSuperAdmin
              ? <label className="mt-2 flex items-center gap-2 font-semibold"><input type="checkbox" checked={lateOverride} onChange={(event) => setLateOverride(event.target.checked)} className="h-4 w-4 accent-brand-pink" />Accept this return anyway (Super Admin)</label>
              : <span className="mt-1 block">Only a Super Admin can accept it.</span>}
          </div>}

          {sale.previousReturns.length > 0 && <p className="text-xs text-zinc-500">Earlier returns on this invoice: {sale.previousReturns.map((r) => r.returnNumber).join(", ")}</p>}

          <div>
            <h3 className="text-sm font-bold text-zinc-800">Items to return</h3>
            <ul className="mt-2 divide-y divide-zinc-100 rounded-2xl border border-zinc-100">
              {sale.items.map((item) => {
                const left = item.quantity - item.returned;
                const max = Math.min(left, item.productActive ? item.stockAvailable : 0);
                const qty = quantities[item.saleItemId] ?? 0;
                const reasonBlocked = left <= 0 ? "Already returned" : !item.productActive ? "No longer sold" : item.stockAvailable <= 0 ? "Out of stock" : null;
                return <li key={item.saleItemId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900">{item.name}</p>
                    <p className="text-xs text-zinc-500">Bought {item.quantity} × {formatPeso(item.unitPrice)}{item.returned > 0 ? ` · ${item.returned} already returned` : ""}{!reasonBlocked ? ` · ${item.stockAvailable} in stock` : ""}</p>
                  </div>
                  {reasonBlocked
                    ? <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-500">{reasonBlocked}</span>
                    : <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setQty(item.saleItemId, qty - 1, max)} disabled={qty <= 0} aria-label={`Fewer ${item.name}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 disabled:opacity-40"><Minus size={15} /></button>
                        <span className="w-6 text-center font-bold tabular-nums">{qty}</span>
                        <button type="button" onClick={() => setQty(item.saleItemId, qty + 1, max)} disabled={qty >= max} aria-label={`More ${item.name}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-pink text-white disabled:opacity-40"><Plus size={15} /></button>
                      </div>}
                </li>;
              })}
            </ul>
          </div>

          <fieldset>
            <legend className="text-sm font-bold text-zinc-800">Reason</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {RETURN_REASONS.map((option) => <button key={option.value} type="button" aria-pressed={reason === option.value} onClick={() => setReason(option.value)}
                className={`rounded-full border-2 px-4 py-2 text-sm font-semibold ${reason === option.value ? "border-brand-pink bg-brand-pink text-white" : "border-pink-100 text-zinc-700 hover:border-brand-pink"}`}>{option.label}</button>)}
            </div>
          </fieldset>
          <label className="block text-sm font-bold text-zinc-800">Note {reason === "other" ? <span className="text-red-500">*</span> : <span className="font-normal text-zinc-500">(optional)</span>}
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={300} placeholder="e.g. Torn packaging, expired 3 days ago" className="mt-1.5 w-full rounded-xl border border-zinc-300 p-3 text-sm font-normal outline-none focus:border-brand-pink" />
          </label>
        </div>}
      </div>}

      {!done && sale && <footer className="flex flex-col-reverse gap-2 border-t border-zinc-100 px-6 py-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} disabled={busy} className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold">Cancel</button>
        <button type="button" onClick={() => void submit()} disabled={!canSubmit} className="rounded-full bg-brand-pink px-6 py-2.5 text-sm font-bold text-white disabled:opacity-40">{busy ? "Processing…" : `Replace ${chosen.reduce((sum, item) => sum + (quantities[item.saleItemId] ?? 0), 0) || ""} item${chosen.reduce((sum, item) => sum + (quantities[item.saleItemId] ?? 0), 0) === 1 ? "" : "s"}`}</button>
      </footer>}
    </section>
  </div>;
}
