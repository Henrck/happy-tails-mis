// POS returns: damaged or expired products are replaced with the same
// product (no cash refunds). Both calls go through database functions that
// check staff access, the 7-day window and the quantities still returnable.
import { createClient } from "./client";

export type ReturnReason = "damaged" | "expired" | "other";
export const RETURN_REASONS: { value: ReturnReason; label: string }[] = [
  { value: "damaged", label: "Damaged" },
  { value: "expired", label: "Expired" },
  { value: "other", label: "Other" },
];
export const RETURN_WINDOW_DAYS = 7;

export type ReturnableItem = {
  saleItemId: string;
  productId: string;
  name: string;
  productCode: string | null;
  quantity: number;
  unitPrice: number;
  returned: number;
  productActive: boolean;
  stockAvailable: number;
};

export type SaleForReturn = {
  saleId: string;
  invoiceNumber: string;
  soldAt: string;
  totalAmount: number;
  daysSinceSale: number;
  withinWindow: boolean;
  items: ReturnableItem[];
  previousReturns: { returnNumber: string; createdAt: string; reason: ReturnReason }[];
};

export type ReturnResult = {
  returnNumber: string;
  invoiceNumber: string;
  soldAt: string;
  reason: ReturnReason;
  note: string | null;
  items: { name: string; quantity: number; unitPrice: number }[];
  createdAt: string;
};

/** "Invoice #INV-23", "invoice no. inv-23" → "INV-23". */
export function cleanInvoiceInput(value: string): string {
  return value.trim().replace(/^(invoice|receipt)\s*(no\.?|number)?\s*[:#]?\s*/i, "").replace(/^#\s*/, "").trim().toUpperCase();
}

export async function lookupSaleForReturn(invoice: string): Promise<{ sale: SaleForReturn | null; error: string | null }> {
  const cleaned = cleanInvoiceInput(invoice);
  if (!cleaned) return { sale: null, error: "Enter the invoice number from the receipt." };
  const { data, error } = await createClient().rpc("happytails_lookup_sale_for_return", { p_invoice: cleaned });
  if (error) return { sale: null, error: error.message };
  const result = data as ({ found: false } | ({ found: true } & SaleForReturn)) | null;
  if (!result || !result.found) return { sale: null, error: `No sale found for "${cleaned}". Check the Invoice # on the receipt, or find the sale in the Sales report.` };
  return {
    error: null,
    sale: {
      ...result,
      totalAmount: Number(result.totalAmount),
      items: result.items.map((item) => ({
        ...item, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice),
        returned: Number(item.returned), stockAvailable: Number(item.stockAvailable),
      })),
    },
  };
}

export async function processSaleReturn(request: {
  requestId: string;
  invoice: string;
  items: { saleItemId: string; quantity: number }[];
  reason: ReturnReason;
  note: string;
  lateOverride: boolean;
}): Promise<{ result: ReturnResult | null; error: string | null }> {
  const { data, error } = await createClient().rpc("happytails_process_sale_return", {
    p_request_id: request.requestId,
    p_invoice: request.invoice,
    p_items: request.items,
    p_reason: request.reason,
    p_note: request.note.trim() || null,
    p_late_override: request.lateOverride,
  });
  if (error) return { result: null, error: error.message };
  const result = data as ReturnResult | null;
  if (!result?.returnNumber) return { result: null, error: "The return finished without a return number. Check the sale before trying again." };
  return { result: { ...result, items: result.items.map((item) => ({ ...item, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })) }, error: null };
}
