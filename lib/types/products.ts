export type ProductCategory =
  | "Food"
  | "Treats"
  | "Grooming"
  | "Accessories"
  | "Hygiene";

export type ProductStatus = "active" | "discontinued";

export type Product = {
  id: string;
  product_code: string;
  name: string;
  category: ProductCategory;
  unit: string;
  package_size: string | null;
  price: number;
  min_stock: number;
  image_url: string | null;
  status: ProductStatus;
  created_at: string;

  // Current quantity calculated from product_batches.
  // This is used by POS to prevent adding an out-of-stock product.
  stock?: number;
};

export type ProductBatch = {
  id: string;
  product_id: string;
  batch_number: string;
  quantity: number;
  expiration_date: string | null;
  received_date: string;
  is_adjustment: boolean;
  created_at: string;
};
