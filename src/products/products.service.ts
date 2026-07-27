import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  buildPurchaseAverageCostMap,
  resolveProductCost,
} from '../common/utils/schema.util';
import { StockAlertService } from '../notifications/stock-alert.service';
import { PurchaseInvoice } from '../purchases/schemas/purchase-invoice.schema';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductUnit } from './product-unit';
import { Product } from './schemas/product.schema';

const MAX_IMAGE_URL_LENGTH = 1_500_000;

function normalizeImageUrl(imageUrl?: string | null): string | undefined {
  if (imageUrl === undefined) return undefined;
  if (imageUrl === null || imageUrl.trim() === '') return undefined;

  const value = imageUrl.trim();
  if (value.length > MAX_IMAGE_URL_LENGTH) {
    throw new BadRequestException('صورة المنتج كبيرة جداً — اختر صورة أصغر');
  }

  const isDataUrl = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(value);
  const isHttpUrl = /^https?:\/\//i.test(value);
  if (!isDataUrl && !isHttpUrl) {
    throw new BadRequestException('صيغة صورة المنتج غير صالحة');
  }

  return value;
}

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(PurchaseInvoice.name)
    private purchaseModel: Model<PurchaseInvoice>,
    private stockAlertService: StockAlertService,
  ) {}

  async onModuleInit() {
    await this.productModel.updateMany(
      { $or: [{ unitType: { $exists: false } }, { unitType: null }] },
      { $set: { unitType: ProductUnit.PIECE } },
    );
    await this.syncCostsFromPurchases();
  }

  private async syncCostsFromPurchases() {
    const [purchases, products] = await Promise.all([
      this.purchaseModel.find().exec(),
      this.productModel.find().exec(),
    ]);

    if (purchases.length === 0 || products.length === 0) {
      return;
    }

    const purchaseAvgMap = buildPurchaseAverageCostMap(purchases);

    for (const product of products) {
      if (Number(product.cost ?? 0) > 0) {
        continue;
      }

      const cost = resolveProductCost(product, purchaseAvgMap);
      if (cost > 0) {
        product.cost = cost;
        await product.save();
      }
    }
  }

  async findAll(search?: string) {
    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }

    return this.productModel.find(filter).sort({ name: 1 }).exec();
  }

  async findByBarcode(code: string) {
    const product = await this.productModel.findOne({ barcode: code }).exec();
    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }
    return product;
  }

  async findOne(id: string) {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }
    return product;
  }

  async create(dto: CreateProductDto) {
    const stock = dto.stock ?? 0;
    const unitType = dto.unitType || ProductUnit.PIECE;
    const product = await this.productModel.create({
      name: dto.name.trim(),
      price: dto.price,
      cost: dto.cost ?? 0,
      stock,
      unitType,
      barcode: dto.barcode?.trim() || undefined,
      category: dto.category?.trim() || undefined,
      imageUrl: normalizeImageUrl(dto.imageUrl),
    });

    this.stockAlertService.notifyInitialLowStock(product.name, stock, unitType);

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.productModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('المنتج غير موجود');
    }

    const product = await this.productModel
      .findByIdAndUpdate(
        id,
        {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.price !== undefined && { price: dto.price }),
          ...(dto.cost !== undefined && { cost: dto.cost }),
          ...(dto.stock !== undefined && { stock: dto.stock }),
          ...(dto.unitType !== undefined && { unitType: dto.unitType }),
          ...(dto.barcode !== undefined && {
            barcode: dto.barcode?.trim() || undefined,
          }),
          ...(dto.category !== undefined && {
            category: dto.category?.trim() || undefined,
          }),
          ...(dto.imageUrl !== undefined && {
            imageUrl: normalizeImageUrl(dto.imageUrl) || null,
          }),
        },
        { new: true, runValidators: true },
      )
      .exec();

    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }

    if (dto.stock !== undefined) {
      this.stockAlertService.notifyIfLowStock({
        name: product.name,
        previousStock: existing.stock,
        newStock: product.stock,
        unitType: product.unitType,
      });
    }

    return product;
  }

  async remove(id: string) {
    const product = await this.productModel.findByIdAndDelete(id).exec();
    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }
  }
}
