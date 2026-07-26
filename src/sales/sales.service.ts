import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { getCurrentTime, getDateRange, calculateSaleItemsTotal } from '../common/utils/schema.util';
import { StockAlertService } from '../notifications/stock-alert.service';
import { ProductUnit } from '../products/product-unit';
import { Product } from '../products/schemas/product.schema';
import { CreateSaleDto } from './dto/sale.dto';
import { SaleInvoice } from './schemas/sale-invoice.schema';

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(SaleInvoice.name)
    private saleModel: Model<SaleInvoice>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectConnection() private connection: Connection,
    private stockAlertService: StockAlertService,
  ) {}

  findAll(from?: string, to?: string) {
    return this.saleModel
      .find(getDateRange(from, to))
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string) {
    const sale = await this.saleModel.findById(id).exec();
    if (!sale) {
      throw new NotFoundException('الفاتورة غير موجودة');
    }
    return sale;
  }

  async create(dto: CreateSaleDto) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const saleItems = [];
      const stockChanges: {
        name: string;
        previousStock: number;
        newStock: number;
        unitType?: ProductUnit | string;
      }[] = [];

      for (const item of dto.items) {
        const product = await this.productModel
          .findById(item.id)
          .session(session)
          .exec();

        if (!product) {
          throw new BadRequestException(`المنتج ${item.name} غير موجود`);
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `الكمية غير كافية للمنتج ${product.name}`,
          );
        }

        const previousStock = product.stock;
        product.stock -= item.quantity;
        await product.save({ session });

        saleItems.push({
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          barcode: product.barcode,
          unitCost: Number(product.cost ?? 0),
          unitType: product.unitType || ProductUnit.PIECE,
        });

        stockChanges.push({
          name: product.name,
          previousStock,
          newStock: product.stock,
          unitType: product.unitType,
        });
      }

      const total = calculateSaleItemsTotal(
        saleItems.map((item) => ({
          price: item.price,
          quantity: item.quantity,
        })),
      );

      const now = new Date();
      const invoiceNumber = `INV-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${now.getTime().toString().slice(-4)}`;

      const [sale] = await this.saleModel.create(
        [
          {
            invoiceNumber,
            date: now.toISOString().slice(0, 10),
            time: getCurrentTime(),
            items: saleItems,
            total,
            cashier: dto.cashier || 'البائع الرئيسي',
          },
        ],
        { session },
      );

      await session.commitTransaction();
      this.stockAlertService.notifyBatch(stockChanges);
      return sale;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
