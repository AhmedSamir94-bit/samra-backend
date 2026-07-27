import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { calculateSaleItemsTotal } from '../common/utils/schema.util';
import { CustomersService } from '../customers/customers.service';
import { ProductUnit } from '../products/product-unit';
import { Product } from '../products/schemas/product.schema';
import { StockAlertService } from '../notifications/stock-alert.service';
import { SalesService } from '../sales/sales.service';
import { UserRole } from '../users/user-role';
import { PushService } from '../push/push.service';
import {
  ORDER_STATUS_LABELS,
  OrderStatus,
} from './order-status';
import { CreateCustomerOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { CustomerOrder } from './schemas/customer-order.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(CustomerOrder.name)
    private readonly orderModel: Model<CustomerOrder>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectConnection() private readonly connection: Connection,
    private readonly customersService: CustomersService,
    private readonly salesService: SalesService,
    private readonly stockAlertService: StockAlertService,
    @Inject(forwardRef(() => PushService))
    private readonly pushService: PushService,
  ) {}

  private generateOrderNumber(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = now.getTime().toString().slice(-4);
    return `ORD-${date}-${suffix}`;
  }

  async createForGuest(guestSessionId: string, dto: CreateCustomerOrderDto) {
    const session = await this.customersService.findById(guestSessionId);
    if (!session) {
      throw new NotFoundException('الجلسة غير موجودة');
    }

    const lineItems: CustomerOrder['items'] = [];
    let subtotal = 0;

    for (const item of dto.items) {
      const product = await this.productModel.findById(item.productId).exec();
      if (!product) {
        throw new BadRequestException(`المنتج غير موجود`);
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `الكمية غير كافية للمنتج ${product.name}`,
        );
      }

      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;
      lineItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        unitType: product.unitType || ProductUnit.PIECE,
      });
    }

    const order = await this.orderModel.create({
      orderNumber: this.generateOrderNumber(),
      guestSessionId: session._id,
      customerName: session.name,
      customerPhone: session.phone,
      deliveryAddress: session.deliveryAddress,
      status: OrderStatus.RECEIVED,
      items: lineItems,
      subtotal,
      total: subtotal,
      notes: dto.notes?.trim() || '',
      statusHistory: [
        {
          status: OrderStatus.RECEIVED,
          at: new Date(),
          note: 'تم استلام الطلب',
        },
      ],
      stockDeducted: false,
    });

    await this.pushService.notifyStaff({
      title: `طلب جديد ${order.orderNumber}`,
      body: `${session.name} — ${session.deliveryAddress}`,
      url: '/delivery-orders',
      tag: `order-new-${order._id}`,
    });

    return order;
  }

  async listForGuest(guestSessionId: string) {
    return this.orderModel
      .find({ guestSessionId: new Types.ObjectId(guestSessionId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getForGuest(guestSessionId: string, orderId: string) {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('الطلب غير موجود');
    }
    if (order.guestSessionId.toString() !== guestSessionId) {
      throw new ForbiddenException('ليس لديك صلاحية لعرض هذا الطلب');
    }
    return order;
  }

  findAllStaff(status?: OrderStatus, from?: string, to?: string) {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (from || to) {
      const range: Record<string, string> = {};
      if (from) range.$gte = from;
      if (to) range.$lte = to;
      filter.createdAt = range;
    }
    return this.orderModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOneStaff(orderId: string) {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('الطلب غير موجود');
    }
    return order;
  }

  async updateStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('الطلب غير موجود');
    }

    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('لا يمكن تعديل طلب مُسلّم');
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('لا يمكن تعديل طلب ملغي');
    }

    const previousStatus = order.status;
    const statusChanged = previousStatus !== dto.status;

    if (dto.status === OrderStatus.PREPARING && !order.stockDeducted) {
      await this.deductStock(order);
      order.stockDeducted = true;
    }

    if (dto.status === OrderStatus.CANCELLED && order.stockDeducted) {
      await this.restoreStock(order);
      order.stockDeducted = false;
    }

    if (statusChanged) {
      order.status = dto.status;
      order.statusHistory.push({
        status: dto.status,
        at: new Date(),
        note: dto.note?.trim() || ORDER_STATUS_LABELS[dto.status],
      });
    }

    await order.save();

    if (statusChanged) {
      await this.pushService.notifyUser(order.guestSessionId.toString(), {
        title: `تحديث الطلب ${order.orderNumber}`,
        body: ORDER_STATUS_LABELS[dto.status],
        url: `/orders/${order._id}`,
        tag: `order-${order._id}`,
      });
    }

    if (dto.status === OrderStatus.DELIVERED) {
      await this.completeOrder(order);
    }

    return order;
  }

  async completeOrder(order: CustomerOrder & { _id: Types.ObjectId; save(): Promise<unknown> }) {
    if (order.saleInvoiceId) return order;

    const sale = await this.salesService.create(
      {
        items: order.items.map((item) => ({
          id: item.productId.toString(),
          name: item.name,
          quantity: item.quantity,
        })),
        cashier: 'طلب توصيل',
      },
      { skipStockDeduction: true },
    );

    order.saleInvoiceId = sale._id.toString();
    await order.save();
    return order;
  }

  private async deductStock(order: CustomerOrder) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const stockChanges: {
        name: string;
        previousStock: number;
        newStock: number;
        unitType?: string;
      }[] = [];

      for (const item of order.items) {
        const product = await this.productModel
          .findById(item.productId)
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
        stockChanges.push({
          name: product.name,
          previousStock,
          newStock: product.stock,
          unitType: product.unitType,
        });
      }

      await session.commitTransaction();
      this.stockAlertService.notifyBatch(stockChanges);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  private async restoreStock(order: CustomerOrder) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      for (const item of order.items) {
        const product = await this.productModel
          .findById(item.productId)
          .session(session)
          .exec();
        if (product) {
          product.stock += item.quantity;
          await product.save({ session });
        }
      }
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
