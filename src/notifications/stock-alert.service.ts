import { Injectable, Logger } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

/** Alert when stock is at or below this level (5, 4, 3, 2, 1, 0). */
const LOW_STOCK_LIMIT = 5;

export interface StockChange {
  name: string;
  previousStock: number;
  newStock: number;
}

@Injectable()
export class StockAlertService {
  private readonly logger = new Logger(StockAlertService.name);

  constructor(private whatsappService: WhatsappService) {}

  private isLowStock(stock: number) {
    return stock <= LOW_STOCK_LIMIT;
  }

  notifyIfLowStock(change: StockChange) {
    const { name, previousStock, newStock } = change;

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
    void this.whatsappService.sendToOwner(this.buildMessage(name, newStock));
  }

  notifyBatch(changes: StockChange[]) {
    for (const change of changes) {
      this.notifyIfLowStock(change);
    }
  }

  notifyInitialLowStock(productName: string, stock: number) {
    if (!this.isLowStock(stock)) {
      return;
    }

    void this.whatsappService.sendToOwner(this.buildMessage(productName, stock));
  }

  private buildMessage(productName: string, stock: number) {
    if (stock === 0) {
      return (
        `⚠️ تنبيه مخزون — Samra POS\n\n` +
        `المنتج: ${productName}\n` +
        `الحالة: نفد المخزون (0 قطعة)\n\n` +
        `يرجى إعادة التوريد في أقرب وقت.`
      );
    }

    const unit = stock === 1 ? 'قطعة' : 'قطع';

    return (
      `⚠️ تنبيه مخزون — Samra POS\n\n` +
      `المنتج: ${productName}\n` +
      `المتبقي: ${stock} ${unit} فقط\n\n` +
      `يرجى مراجعة المخزون وإعادة التوريد.`
    );
  }
}
