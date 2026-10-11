// POS sales ledger. One row per INVOICE for reporting, with nested items.
// recordSale is retained unchanged for existing POS code compatibility.
import { createClient } from "./client";
import type { SalesReportRow, SalesInvoiceItem } from "@/lib/data/sales-reports-mock";

export type SaleLineInput = { productId: string; quantity: number; unitPrice: number };

export async function recordSale(
  lines: SaleLineInput[],
  payment: { method: string; amountPaid: number }
) {
  if (lines.length === 0) return { error: "No items to record." };
  const supabase = createClient();
  const totalAmount = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({ total_amount: totalAmount, payment_method: payment.method, amount_paid: payment.amountPaid })
    .select()
    .single();
  if (saleError || !sale) return { error: saleError?.message ?? "Couldn't create the sale record." };

  const { error: itemsError } = await supabase.from("sale_items").insert(
    lines.map((l) => ({
      sale_id: sale.id,
      product_id: l.productId,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      line_amount: l.quantity * l.unitPrice,
    }))
  );
  if (itemsError) return { error: itemsError.message };
  return { error: null, invoiceNumber: sale.invoice_number as string };
}

type RawSaleItem = {
  quantity: number;
  unit_price: number;
  line_amount: number | null;
  products: { name: string; category: string } | null;
};
type RawSale = {
  id: string;
  invoice_number: string;
  sold_at: string;
  total_amount: number;
  amount_paid: number | null;
  payment_method: string;
  sale_items: RawSaleItem[] | null;
};

function displayDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export async function fetchSalesReportRows(): Promise<{ rows: SalesReportRow[]; error: string | null }> {
  const supabase = createClient();
  // Query invoice headers, not sale_items, otherwise every product line
  // repeats the same cash received and change given amounts.
  const { data, error } = await supabase
    .from("sales")
    .select(`id, invoice_number, sold_at, total_amount, amount_paid, payment_method,
      sale_items(quantity, unit_price, line_amount, products(name, category))`)
    .order("sold_at", { ascending: false });

  if (error) return { rows: [], error: error.message };

  const rows: SalesReportRow[] = ((data ?? []) as unknown as RawSale[]).map((sale) => {
    const items: SalesInvoiceItem[] = (sale.sale_items ?? []).map((item) => ({
      name: item.products?.name ?? "Unknown product",
      category: item.products?.category ?? "Unknown",
      quantity: item.quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_amount ?? item.quantity * item.unit_price,
    }));
    const cashReceived = sale.amount_paid == null ? null : Number(sale.amount_paid);
    const totalPrice = Number(sale.total_amount ?? 0);
    const date = sale.sold_at.slice(0, 10);
    return {
      id: sale.id,
      invoiceNumber: sale.invoice_number,
      items,
      itemName: items.map((item) => item.name).join(", ") || "—",
      quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice,
      cashReceived,
      changeGiven: cashReceived == null ? null : Math.max(0, Math.round((cashReceived - totalPrice) * 100) / 100),
      paymentMethod: sale.payment_method ?? "—",
      date,
      displayDate: displayDate(date),
    };
  });

  return { rows, error: null };
}
