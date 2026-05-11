// ─── Supabase Table Types ──────────────────────────────────────────────────

export type Gender = 'homme' | 'femme' | 'unisex';

export interface Category {
  id: string;
  name: string | null;
}

export interface QuantityBreak {
  min_qty: number;
  total_price: number;
  label?: string;
}

export interface ColorOption {
  id: string;
  name: string;
  hex1: string;
  hex2?: string | null;
  image_url: string;
  image_url2?: string | null;
}

export interface Product {
  id: string;
  title: string | null;
  description: string | null;
  price: number | null;
  cost_price: number | null;        // purchase/original price
  stock: number | null;             // inventory count
  discount: number | null;          // percentage e.g. 20 = 20% off
  badge: string | null;             // e.g. "#1 Meilleure vente"
  features: string | null;          // newline-separated bullet points
  specs: Record<string, string> | null; // {"Matière": "TR90", ...}
  rating: number | null;            // 1–5
  review_count: number | null;
  image_url: string | null;
  created_at: string | null;
  category_id: string | null;
  gender: Gender | null;
  color_options?: ColorOption[] | null;
  quantity_breaks?: QuantityBreak[] | null;
  // joined
  categories?: Category | null;
}

export interface Order {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  phone: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  total_price: number | null;
  status?: string | null;
  created_at: string | null;
  // Cosmos delivery fields
  cosmos_barcode?: string | null;
  cosmos_label_url?: string | null;
  cosmos_label_pdf_url?: string | null;
  cosmos_status?: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string | null;
  product_id: string | null;
  quantity: number | null;
}

// ─── Cart Types ────────────────────────────────────────────────────────────

export interface CartItem {
  product: Product;
  quantity: number;
  selected_color?: ColorOption;
  applied_break?: QuantityBreak;
}

export interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}

// ─── Wishlist Types ────────────────────────────────────────────────────────

export interface WishlistState {
  items: Product[];
}

// ─── Order Payload ─────────────────────────────────────────────────────────

export interface CreateOrderPayload {
  customer_name: string;
  customer_email: string;
  phone: string;
  city: string;
  postal_code?: string;
  country: string;
  items: { product_id: string; quantity: number; selected_color?: ColorOption; quantity_break_price?: number }[];
}

// ─── Forum Types (future table) ────────────────────────────────────────────

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: string;
  created_at: string;
  tags?: string[];
}

// ─── Filter / Sort ────────────────────────────────────────────────────────

export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

export interface ProductFilters {
  category_id?: string;
  gender?: Gender | 'all';
  min_price?: number;
  max_price?: number;
  search?: string;
}
