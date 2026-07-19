import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model } from 'mongoose';
import { getCurrentTime, getDateRange, getTodayDateString, calculatePurchaseItemsTotal, calculateWeightedAverageCost } from '../common/utils/schema.util';
import { Product } from '../products/schemas/product.schema';
import { CreatePurchaseDto, UpdatePurchaseDto } from './dto/purchase.dto';
import { PurchaseInvoice, PurchaseItem } from './schemas/purchase-invoice.schema';

type ValidPurchaseItem = {
  productName: string;
  barcode?: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  category?: string;
};

@Injectable()
export class PurchasesService {
  constructor(
    @InjectModel(PurchaseInvoice.name)
    private purchaseModel: Model<PurchaseInvoice>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectConnection() private connection: Connection,
  ) {}

  findAll(from?: string, to?: string) {
    return this.purchaseModel
      .find(getDateRange(from, to))
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string) {
    const purchase = await this.purchaseModel.findById(id).exec();
    if (!purchase) {
      throw new NotFoundException('الفاتورة غير موجودة');
    }
    return purchase;
  }

  async getNextInvoiceNumber() {
    const invoiceNumber = await this.generateNextInvoiceNumber();
    return { invoiceNumber };
  }

  private async generateNextInvoiceNumber() {
    const purchases = await this.purchaseModel.find().select('invoiceNumber').exec();
    let maxNum = 0;

    for (const purchase of purchases) {
      const match = purchase.invoiceNumber.match(/^PUR-(\d+)$/);
      if (match) {
        maxNum = Math.max(maxNum, Number.parseInt(match[1], 10));
      }
    }

    return `PUR-${String(maxNum + 1).padStart(6, '0')}`;
  }

  private normalizeItems(items: CreatePurchaseDto['items']): ValidPurchaseItem[] {
    return items
      .filter((item) => item.productName?.trim() && item.quantity > 0)
      .map((item) => ({
        productName: item.productName.trim(),
        barcode: item.barcode?.trim() || '',
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        salePrice: item.salePrice,
        category: item.category?.trim() || '',
      }));
  }

  private mapInvoiceItems(items: ValidPurchaseItem[]): PurchaseItem[] {
    return items.map((item) => ({
      productName: item.productName,
      barcode: item.barcode || '',
      quantity: item.quantity,
      purchasePrice: item.purchasePrice,
      salePrice: item.salePrice,
      category: item.category || '',
    }));
  }

  private async findProductForItem(item: ValidPurchaseItem, session: ClientSession) {
    const barcode = item.barcode?.trim();

    if (barcode) {
      const byBarcode = await this.productModel
        .findOne({ barcode })
        .session(session)
        .exec();
      if (byBarcode) return byBarcode;
    }

    return this.productModel
      .findOne({ name: item.productName })
      .session(session)
      .exec();
  }

  private async applyPurchaseItems(
    items: ValidPurchaseItem[],
    session: ClientSession,
    mode: 'add' | 'remove',
  ) {
    for (const item of items) {
      const product = await this.findProductForItem(item, session);

      if (mode === 'remove') {
        if (!product) {
          throw new BadRequestException(
            `لا يمكن تعديل الفاتورة: المنتج ${item.productName} غير موجود`,
          );
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `لا يمكن تعديل الفاتورة: الكمية المتوفرة من ${product.name} (${product.stock}) أقل من الكمية المسجلة (${item.quantity})`,
          );
        }

        product.stock -= item.quantity;
        await product.save({ session });
        continue;
      }

      const barcode = item.barcode?.trim();

      if (product) {
        const previousStock = product.stock;
        product.stock += item.quantity;
        product.cost = calculateWeightedAverageCost(
          previousStock,
          Number(product.cost ?? 0),
          item.quantity,
          item.purchasePrice,
        );
        product.price = item.salePrice;
        if (item.category) product.category = item.category;
        if (barcode) product.barcode = barcode;
        await product.save({ session });
      } else {
        await this.productModel.create(
          [
            {
              name: item.productName,
              price: item.salePrice,
              cost: item.purchasePrice,
              stock: item.quantity,
              barcode: barcode || undefined,
              category: item.category || undefined,
            },
          ],
          { session },
        );
      }
    }
  }

  async create(dto: CreatePurchaseDto) {
    const validItems = this.normalizeItems(dto.items);

    if (validItems.length === 0) {
      throw new BadRequestException('يرجى إضافة منتج واحد على الأقل');
    }

    const total = calculatePurchaseItemsTotal(validItems);

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      await this.applyPurchaseItems(validItems, session, 'add');

      const invoiceNumber = await this.generateNextInvoiceNumber();
      const date = dto.date?.trim() || getTodayDateString();

      const [purchase] = await this.purchaseModel.create(
        [
          {
            invoiceNumber,
            supplier: dto.supplier.trim(),
            date,
            time: getCurrentTime(),
            items: this.mapInvoiceItems(validItems),
            total,
          },
        ],
        { session },
      );

      await session.commitTransaction();
      return purchase;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async update(id: string, dto: UpdatePurchaseDto) {
    const existing = await this.purchaseModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('الفاتورة غير موجودة');
    }

    const validItems = this.normalizeItems(dto.items);

    if (validItems.length === 0) {
      throw new BadRequestException('يرجى إضافة منتج واحد على الأقل');
    }

    const total = calculatePurchaseItemsTotal(validItems);

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const oldItems: ValidPurchaseItem[] = existing.items.map((item) => ({
        productName: item.productName,
        barcode: item.barcode,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        salePrice: item.salePrice,
        category: item.category,
      }));

      await this.applyPurchaseItems(oldItems, session, 'remove');
      await this.applyPurchaseItems(validItems, session, 'add');

      const date = dto.date?.trim() || existing.date;

      const purchase = await this.purchaseModel
        .findByIdAndUpdate(
          id,
          {
            supplier: dto.supplier.trim(),
            date,
            items: this.mapInvoiceItems(validItems),
            total,
          },
          { new: true, session },
        )
        .exec();

      await session.commitTransaction();
      return purchase;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
