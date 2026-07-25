// Mock completed POS transactions, shaped close to what a real
// `transactions` table will look like — used for the Return/Exchange
// receipt lookup. `maxReturnable` per line item is how many units are
// still eligible to be returned (starts equal to qty purchased, decreases
// if partially returned already).
export type TransactionLineItem = {
  productId: string;
  name: string;
  unitPrice: number;
  qty: number;
  maxReturnable: number;
};

export type Transaction = {
  id: string; // receipt number, e.g. "TXN-UF19VE"
  timestamp: string;
  lineItems: TransactionLineItem[];
  subtotal: number;
  vat: number;
  total: number;
};

export const transactions: Transaction[] = [
  {
    id: "TXN-UF19VE",
    timestamp: "01:18 AM",
    lineItems: [
      { productId: "whiskas-jr", name: "WHISKAS (JR)", unitPrice: 45, qty: 4, maxReturnable: 4 },
      { productId: "mondex", name: "MONDEX", unitPrice: 145, qty: 4, maxReturnable: 4 },
      { productId: "brit-canned-food", name: "BRIT CANNED FOOD", unitPrice: 125, qty: 4, maxReturnable: 4 },
    ],
    subtotal: 1100,
    vat: 132,
    total: 1232,
  },
  {
    id: "TXN-KP3M2Q",
    timestamp: "10:42 AM",
    lineItems: [
      { productId: "pup-cup", name: "PUP CUP", unitPrice: 80, qty: 2, maxReturnable: 2 },
      { productId: "pizza-dawg", name: "PIZZA DAWG", unitPrice: 165, qty: 1, maxReturnable: 1 },
    ],
    subtotal: 325,
    vat: 39,
    total: 364,
  },
];
