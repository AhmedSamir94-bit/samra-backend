import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { getDateRange, calculateSaleItemsTotal, calculatePurchaseItemsTotal, buildPurchaseAverageCostMap, resolveProductCost } from '../common/utils/schema.util';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { PurchaseInvoice } from '../purchases/schemas/purchase-invoice.schema';
import { SaleInvoice } from '../sales/schemas/sale-invoice.schema';

const REPORT_TYPES = [
  'sales',
  'purchases',
  'profits',
  'top-selling',
  'purchased-items',
  'sold-items',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(SaleInvoice.name) private saleModel: Model<SaleInvoice>,
    @InjectModel(PurchaseInvoice.name)
    private purchaseModel: Model<PurchaseInvoice>,
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  async getReport(type: string, from?: string, to?: string) {
    if (!REPORT_TYPES.includes(type as ReportType)) {
      throw new NotFoundException('نوع التقرير غير موجود');
    }

    const dateFilter = getDateRange(from, to);

    switch (type as ReportType) {
      case 'sales':
        return this.getSalesReport(dateFilter);
      case 'purchases':
        return this.getPurchasesReport(dateFilter);
      case 'profits':
        return this.getProfitsReport(dateFilter);
      case 'top-selling':
        return this.getTopSellingReport(dateFilter);
      case 'purchased-items':
        return this.getPurchasedItemsReport(dateFilter);
      case 'sold-items':
        return this.getSoldItemsReport(dateFilter);
    }
  }

  private buildProductIdCostMap(
    products: ProductDocument[],
    purchaseAvgMap: Map<string, number>,
  ) {
    const byProductId = new Map<string, number>();

    for (const product of products) {
      byProductId.set(
        product._id.toString(),
        resolveProductCost(product, purchaseAvgMap),
      );
    }

    return byProductId;
  }

  private getItemUnitCost(
    item: {
      name: string;
      barcode?: string;
      productId?: { toString(): string };
      unitCost?: number;
    },
    purchaseAvgMap: Map<string, number>,
    productIdCostMap: Map<string, number>,
  ) {
    const snapshottedCost = Number(item.unitCost ?? 0);
    if (snapshottedCost > 0) {
      return snapshottedCost;
    }

    const productId = item.productId?.toString();
    if (productId && productIdCostMap.has(productId)) {
      const cost = productIdCostMap.get(productId)!;
      if (cost > 0) {
        return cost;
      }
    }

    const barcode = item.barcode?.trim();
    if (barcode && purchaseAvgMap.has(barcode)) {
      return purchaseAvgMap.get(barcode)!;
    }

    return purchaseAvgMap.get(item.name.trim()) ?? 0;
  }

  private calculateDailySaleMetrics(
    sales: SaleInvoice[],
    purchaseAvgMap: Map<string, number>,
    productIdCostMap: Map<string, number>,
  ) {
    const grouped = new Map<
      string,
      {
        date: string;
        invoices: number;
        quantitySold: number;
        revenue: number;
        cogs: number;
        netProfit: number;
      }
    >();

    for (const sale of sales) {
      const itemQuantity = sale.items.reduce(
        (sum, item) => sum + Number(item.quantity),
        0,
      );
      const saleRevenue = calculateSaleItemsTotal(sale.items);
      const saleCogs = sale.items.reduce((sum, item) => {
        const unitCost = this.getItemUnitCost(
          item,
          purchaseAvgMap,
          productIdCostMap,
        );
        return sum + unitCost * Number(item.quantity);
      }, 0);

      const existing = grouped.get(sale.date) || {
        date: sale.date,
        invoices: 0,
        quantitySold: 0,
        revenue: 0,
        cogs: 0,
        netProfit: 0,
      };

      existing.invoices += 1;
      existing.quantitySold += itemQuantity;
      existing.revenue += saleRevenue;
      existing.cogs += saleCogs;
      existing.netProfit += saleRevenue - saleCogs;
      grouped.set(sale.date, existing);
    }

    return Array.from(grouped.values()).map((row) => ({
      ...row,
      revenue: Number(row.revenue.toFixed(2)),
      cogs: Number(row.cogs.toFixed(2)),
      netProfit: Number(row.netProfit.toFixed(2)),
    }));
  }

  private async getSalesReport(dateFilter: Record<string, unknown>) {
    const [sales, purchases, products] = await Promise.all([
      this.saleModel.find(dateFilter).sort({ date: 1 }).exec(),
      this.purchaseModel.find().exec(),
      this.productModel.find().exec(),
    ]);
    const purchaseAvgMap = buildPurchaseAverageCostMap(purchases);
    const productIdCostMap = this.buildProductIdCostMap(products, purchaseAvgMap);

    return this.calculateDailySaleMetrics(sales, purchaseAvgMap, productIdCostMap);
  }

  private async getPurchasesReport(dateFilter: Record<string, unknown>) {
    const purchases = await this.purchaseModel
      .find(dateFilter)
      .sort({ date: 1 })
      .exec();
    const grouped = new Map<
      string,
      { date: string; invoices: number; total: number; items: number }
    >();

    for (const purchase of purchases) {
      const existing = grouped.get(purchase.date) || {
        date: purchase.date,
        invoices: 0,
        total: 0,
        items: 0,
      };
      existing.invoices += 1;
      existing.total += purchase.total;
      existing.items += purchase.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      grouped.set(purchase.date, existing);
    }

    return Array.from(grouped.values());
  }

  private async getProfitsReport(dateFilter: Record<string, unknown>) {
    const [sales, purchases, allPurchases, products] = await Promise.all([
      this.saleModel.find(dateFilter).sort({ date: 1 }).exec(),
      this.purchaseModel.find(dateFilter).sort({ date: 1 }).exec(),
      this.purchaseModel.find().exec(),
      this.productModel.find().exec(),
    ]);
    const purchaseAvgMap = buildPurchaseAverageCostMap(allPurchases);
    const productIdCostMap = this.buildProductIdCostMap(products, purchaseAvgMap);

    const grouped = new Map<
      string,
      {
        date: string;
        revenue: number;
        cogs: number;
        netProfit: number;
        purchases: number;
      }
    >();

    for (const sale of sales) {
      const saleRevenue = calculateSaleItemsTotal(sale.items);
      const saleCogs = sale.items.reduce((sum, item) => {
        const unitCost = this.getItemUnitCost(
          item,
          purchaseAvgMap,
          productIdCostMap,
        );
        return sum + unitCost * Number(item.quantity);
      }, 0);

      const existing = grouped.get(sale.date) || {
        date: sale.date,
        revenue: 0,
        cogs: 0,
        netProfit: 0,
        purchases: 0,
      };

      existing.revenue += saleRevenue;
      existing.cogs += saleCogs;
      existing.netProfit += saleRevenue - saleCogs;
      grouped.set(sale.date, existing);
    }

    for (const purchase of purchases) {
      const purchaseTotal = calculatePurchaseItemsTotal(purchase.items);
      const existing = grouped.get(purchase.date) || {
        date: purchase.date,
        revenue: 0,
        cogs: 0,
        netProfit: 0,
        purchases: 0,
      };
      existing.purchases += purchaseTotal;
      grouped.set(purchase.date, existing);
    }

    return Array.from(grouped.values())
      .map((row) => ({
        date: row.date,
        revenue: Number(row.revenue.toFixed(2)),
        cogs: Number(row.cogs.toFixed(2)),
        netProfit: Number(row.netProfit.toFixed(2)),
        purchases: Number(row.purchases.toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getTopSellingReport(dateFilter: Record<string, unknown>) {
    const sales = await this.saleModel.find(dateFilter).exec();
    const grouped = new Map<
      string,
      { name: string; quantity: number; revenue: number; unitType: string }
    >();

    for (const sale of sales) {
      for (const item of sale.items) {
        const existing = grouped.get(item.name) || {
          name: item.name,
          quantity: 0,
          revenue: 0,
          unitType: item.unitType || 'piece',
        };
        existing.quantity += item.quantity;
        existing.revenue += item.price * item.quantity;
        if (item.unitType) existing.unitType = item.unitType;
        grouped.set(item.name, existing);
      }
    }

    return Array.from(grouped.values())
      .map((row) => ({ ...row, revenue: Number(row.revenue.toFixed(2)) }))
      .sort((a, b) => b.quantity - a.quantity);
  }

  private async getPurchasedItemsReport(dateFilter: Record<string, unknown>) {
    const purchases = await this.purchaseModel.find(dateFilter).exec();
    const grouped = new Map<
      string,
      { name: string; quantity: number; cost: number; unitType: string }
    >();

    for (const purchase of purchases) {
      for (const item of purchase.items) {
        const existing = grouped.get(item.productName) || {
          name: item.productName,
          quantity: 0,
          cost: 0,
          unitType: item.unitType || 'piece',
        };
        existing.quantity += item.quantity;
        existing.cost += item.purchasePrice * item.quantity;
        if (item.unitType) existing.unitType = item.unitType;
        grouped.set(item.productName, existing);
      }
    }

    return Array.from(grouped.values())
      .map((row) => ({ ...row, cost: Number(row.cost.toFixed(2)) }))
      .sort((a, b) => b.quantity - a.quantity);
  }

  private async getSoldItemsReport(dateFilter: Record<string, unknown>) {
    const sales = await this.saleModel.find(dateFilter).exec();
    const soldMap = new Map<string, number>();

    for (const sale of sales) {
      for (const item of sale.items) {
        soldMap.set(item.name, (soldMap.get(item.name) || 0) + item.quantity);
      }
    }

    const products = await this.productModel.find().exec();

    return products
      .map((product) => ({
        name: product.name,
        quantity: soldMap.get(product.name) || 0,
        remaining: product.stock,
        unitType: product.unitType || 'piece',
      }))
      .filter((row) => row.quantity > 0 || row.remaining > 0)
      .sort((a, b) => b.quantity - a.quantity);
  }
}
