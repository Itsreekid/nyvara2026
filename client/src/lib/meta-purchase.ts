import type { CartItem } from '@/types';

/** Per-unit price for Meta Purchase `contents[].item_price` (matches cart totals). */
export function getCartItemUnitPrice(item: CartItem, items: CartItem[]): number {
  const productTotals: Record<string, number> = {};
  for (const cartItem of items) {
    productTotals[cartItem.product.id] = (productTotals[cartItem.product.id] ?? 0) + cartItem.quantity;
  }

  const totalQty = productTotals[item.product.id] ?? item.quantity;
  const breaks = item.product.quantity_breaks ?? [];
  const applicableBreak = [...breaks]
    .sort((a, b) => b.min_qty - a.min_qty)
    .find(qb => totalQty >= qb.min_qty);

  if (applicableBreak) {
    return applicableBreak.total_price / totalQty;
  }

  const hasDiscount = item.product.discount != null && item.product.discount > 0;
  if (hasDiscount) {
    return Math.round((item.product.price ?? 0) * (1 - item.product.discount! / 100));
  }

  return item.product.final_price ?? item.product.price ?? 0;
}

export function buildPurchaseContents(items: CartItem[]) {
  return items.map(item => ({
    id: String(item.product.id),
    quantity: item.quantity,
    item_price: getCartItemUnitPrice(item, items),
  }));
}
