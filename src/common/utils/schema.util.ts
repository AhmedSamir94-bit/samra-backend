import { Schema } from 'mongoose';

export function applyIdTransform(schema: Schema) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = String(ret._id);
      delete ret._id;
      return ret;
    },
  });
}

export function getDateRange(from?: string, to?: string) {
  const filter: Record<string, unknown> = {};
  if (from || to) {
    filter.date = {};
    if (from) (filter.date as Record<string, string>).$gte = from;
    if (to) (filter.date as Record<string, string>).$lte = to;
  }
  return filter;
}

const EGYPT_TIME_ZONE = 'Africa/Cairo';

export function getCurrentTime() {
  return new Date().toLocaleTimeString('en-EG', {
    timeZone: EGYPT_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getTodayDateString() {
  // Use Cairo calendar day so UTC midnight on the server does not shift the date.
  return new Date().toLocaleDateString('en-CA', {
    timeZone: EGYPT_TIME_ZONE,
  });
}

export function calculatePurchaseItemsTotal(
  items: { quantity: number; purchasePrice: number }[],
) {
  return Number(
    items
      .reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.purchasePrice),
        0,
      )
      .toFixed(2),
  );
}

export function calculateSaleItemsTotal(
  items: { price: number; quantity: number }[],
) {
  return Number(
    items
      .reduce(
        (sum, item) => sum + Number(item.price) * Number(item.quantity),
        0,
      )
      .toFixed(2),
  );
}

export function calculateWeightedAverageCost(
  currentStock: number,
  currentCost: number,
  addedQuantity: number,
  addedUnitCost: number,
) {
  const totalStock = currentStock + addedQuantity;
  if (totalStock <= 0) {
    return Number(addedUnitCost.toFixed(2));
  }

  return Number(
    (
      (currentCost * currentStock + addedUnitCost * addedQuantity) /
      totalStock
    ).toFixed(2),
  );
}

type PurchaseCostItem = {
  productName: string;
  barcode?: string;
  purchasePrice: number;
  quantity: number;
};

export function buildPurchaseAverageCostMap(
  purchases: { items: PurchaseCostItem[] }[],
) {
  const totals = new Map<string, { cost: number; quantity: number }>();

  for (const purchase of purchases) {
    for (const item of purchase.items) {
      const keys = [item.barcode?.trim(), item.productName.trim()].filter(
        Boolean,
      ) as string[];

      for (const key of keys) {
        const existing = totals.get(key) || { cost: 0, quantity: 0 };
        existing.cost += Number(item.purchasePrice) * Number(item.quantity);
        existing.quantity += Number(item.quantity);
        totals.set(key, existing);
      }
    }
  }

  const averages = new Map<string, number>();
  for (const [key, value] of totals) {
    averages.set(
      key,
      value.quantity > 0 ? Number((value.cost / value.quantity).toFixed(2)) : 0,
    );
  }

  return averages;
}

export function resolveProductCost(
  product: { name: string; barcode?: string; cost?: number },
  purchaseAvgMap: Map<string, number>,
) {
  const storedCost = Number(product.cost ?? 0);
  if (storedCost > 0) {
    return storedCost;
  }

  const barcode = product.barcode?.trim();
  if (barcode && purchaseAvgMap.has(barcode)) {
    return purchaseAvgMap.get(barcode)!;
  }

  return purchaseAvgMap.get(product.name.trim()) ?? 0;
}
