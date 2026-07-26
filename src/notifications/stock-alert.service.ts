import { Injectable, Logger } from '@nestjs/common';
import { ProductUnit } from '../products/product-unit';
import { WhatsappService } from './whatsapp.service';

/** Alert when stock is at or below this level (5, 4, 3, 2, 1, 0). */
const LOW_STOCK_LIMIT = 5;

export interface StockChange {
  name: string;
  previousStock: number;
  newStock: number;
  unitType?: ProductUnit | string;
}

@Injectable()
export class StockAlertService {
  private readonly logger = new Logger(StockAlertService.name);

  constructor(private whatsappService: WhatsappService) {}

  private isLowStock(stock: number) {
    return stock <= LOW_STOCK_LIMIT;
  }

  private unitLabel(stock: number, unitType?: ProductUnit | string) {
    if (unitType === ProductUnit.KG || unitType === 'kg') {
      return 'كجم';
    }
    return stock === 1 ? 'قطعة' : 'قطع';
  }

  notifyIfLowStock(change: StockChange) {
    const { name, previousStock, newStock, unitType } = change;

    if (newStock >= previousStock || !this.isLowStock(newStock)) {
      return;
    }

    const crossedIntoLowStock =
      !this.isLowStock(previousStock) && this.isLowStock(newStock);
    const droppedWhileLow =
      this.isLowStock(previousStock) && newStock < previousStock;

    if (!crossedIntoLowStock && !droppedWhileLow) {
      return;
    }

    this.logger.log(
      `Low stock alert: ${name} ${previousStock} → ${newStock}, sending WhatsApp`,
    );
    void this.whatsappService.sendToOwner(
      this.buildMessage(name, newStock, unitType),
    );
  }

  notifyBatch(changes: StockChange[]) {
    for (const change of changes) {
      this.notifyIfLowStock(change);
    }
  }

  notifyInitialLowStock(
    productName: string,
    stock: number,
    unitType?: ProductUnit | string,
  ) {
    if (!this.isLowStock(stock)) {
      return;
    }

    void this.whatsappService.sendToOwner(
      this.buildMessage(productName, stock, unitType),
    );
  }

  private buildMessage(
    productName: string,
    stock: number,
    unitType?: ProductUnit | string,
  ) {
    const unit = this.unitLabel(stock, unitType);

    if (stock === 0) {
      return (
        `⚠️ تنبيه مخزون — Samra POS\n\n` +
        `المنتج: ${productName}\n` +
        `الحالة: نفد المخزون (0 ${unit})\n\n` +
        `يرجى إعادة التوريد في أقرب وقت.`
      );
    }

    return (
      `⚠️ تنبيه مخزون — Samra POS\n\n` +
      `المنتج: ${productName}\n` +
      `المتبقي: ${stock} ${unit} فقط\n\n` +
      `يرجى مراجعة المخزون وإعادة التوريد.`
    );
  }
}
