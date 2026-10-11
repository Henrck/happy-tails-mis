// HappyTails Issue #2: one authenticated RPC replaces the old client-side
// sequence of deduct_stock_fefo + sales INSERT + sale_items INSERT.
// The SQL migration MUST be applied before deploying this frontend.
import { createClient } from "./client";

export type PosCheckoutLine = { productId: string; quantity: number };
export type PosCheckoutReceiptLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
};
export type PosCheckoutResult = {
  invoiceNumber: string;
  totalAmount: number;
  amountPaid: number;
  changeAmount: number;
  items: PosCheckoutReceiptLine[];
};

export async function checkoutPosSale(request: {
  requestId: string;
  items: PosCheckoutLine[];
  amountPaid: number;
  method: "Cash";
}): Promise<{ sale: PosCheckoutResult | null; error: string | null }> {
  if (!request.items.length || request.items.some(
    (item) => !Number.isSafeInteger(item.quantity) || item.quantity < 1
  )) {
    return { sale: null, error: "The cart contains an invalid quantity." };
  }
  if (!Number.isFinite(request.amountPaid) || request.amountPaid < 0) {
    return { sale: null, error: "Enter a valid cash amount." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("happytails_checkout_pos", {
    p_request_id: request.requestId,
    p_items: request.items,
    p_amount_paid: request.amountPaid,
    p_payment_method: request.method,
  });
  if (error) return { sale: null, error: error.message };

  // Do not clear the cart if the database returns an incomplete response.
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { sale: null, error: "Checkout returned an invalid response; check the sales report before retrying." };
  }
  const result = data as Record<string, unknown>;
  if (typeof result.invoiceNumber !== "string" || !Array.isArray(result.items) ||
      !Number.isFinite(Number(result.totalAmount)) ||
      !Number.isFinite(Number(result.amountPaid)) ||
      !Number.isFinite(Number(result.changeAmount))) {
    return { sale: null, error: "Checkout result is missing details; check the sales report before retrying." };
  }

  const items: PosCheckoutReceiptLine[] = [];
  for (const item of result.items) {
    if (!item || typeof item !== "object" ||
      typeof item.name !== "string" || typeof item.productId !== "string" ||
      !Number.isFinite(Number(item.quantity)) ||
      !Number.isFinite(Number(item.unitPrice)) ||
      !Number.isFinite(Number(item.lineAmount))) {
      return { sale: null, error: "Checkout receipt has an invalid item; check sales reports before retrying." };
    }
    items.push({
      productId: item.productId,
      name: item.name,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      lineAmount: Number(item.lineAmount),
    });
  }
  return {
    error: null,
    sale: {
      invoiceNumber: result.invoiceNumber,
      totalAmount: Number(result.totalAmount),
      amountPaid: Number(result.amountPaid),
      changeAmount: Number(result.changeAmount),
      items,
    },
  };
}
