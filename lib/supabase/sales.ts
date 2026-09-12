// Real sales ledger — pairs with supabase/041_sales_ledger.sql.
// recordSale() is called from POS checkout right after stock is
// deducted. fetchSalesReportRows() is what powers the Sales Reports tab.
import { createClient } from "./client";
import type { SalesReportRow } from "@/lib/data/sales-reports-mock";

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

type SaleItemJoinRow = {
  quantity: number;
  unit_price: number;
  sales: { invoice_number: string; sold_at: string } | null;
  products: { name: string; category: string } | null;
};

function displayDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export async function fetchSalesReportRows() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sale_items")
    .select("quantity, unit_price, sales ( invoice_number, sold_at ), products ( name, category )")
    .order("created_at", { ascending: false });
  if (error) return { rows: [] as SalesReportRow[], error: error.message };

  const rows: SalesReportRow[] = ((data ?? []) as unknown as SaleItemJoinRow[]).map((item) => {
    const soldAt = item.sales?.sold_at ?? new Date().toISOString();
    const dateOnly = soldAt.slice(0, 10);
    return {
      invoiceNumber: item.sales?.invoice_number ?? "—",
      itemName: item.products?.name ?? "—",
      category: item.products?.category ?? "—",
      quantity: item.quantity,
      unitPrice: item.unit_price,
      date: dateOnly,
      displayDate: displayDate(dateOnly),
    };
  });

  return { rows, error: null };
}
