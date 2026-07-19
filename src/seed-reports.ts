import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from './app.module';
import { calculateSaleItemsTotal } from './common/utils/schema.util';
import { Category } from './categories/schemas/category.schema';
import { Product, ProductDocument } from './products/schemas/product.schema';
import { SaleInvoice } from './sales/schemas/sale-invoice.schema';

const SEED_INVOICE_PREFIX = 'SEED-SALE-';

function parseArgs() {
  const args = process.argv.slice(2);
  const getFlagValue = (flag: string, fallback: number) => {
    const index = args.indexOf(flag);
    if (index === -1 || index === args.length - 1) {
      return fallback;
    }
    const value = Number.parseInt(args[index + 1], 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  return {
    days: getFlagValue('--days', 90),
    maxInvoicesPerDay: getFlagValue('--max-per-day', 8),
    clear: args.includes('--clear'),
  };
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTime() {
  const hour = randomInt(8, 22);
  const minute = randomInt(0, 59);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function pickRandomItems(products: ProductDocument[], count: number) {
  const shuffled = [...products].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

async function ensureDemoProducts(
  categoryModel: Model<Category>,
  productModel: Model<Product>,
) {
  let products = await productModel.find().exec();

  if (products.length >= 8) {
    return products;
  }

  let categories = await categoryModel.find().exec();
  if (categories.length === 0) {
    categories = await categoryModel.insertMany([
      { name: 'مشروبات', color: '#3B82F6' },
      { name: 'وجبات خفيفة', color: '#10B981' },
      { name: 'حلويات', color: '#F59E0B' },
      { name: 'ألبان', color: '#8B5CF6' },
    ]);
  }

  const catalog = [
    { name: 'كوكا كولا', price: 2.5, cost: 1.8, barcode: '12345', category: 'مشروبات' },
    { name: 'شيبس', price: 1.5, cost: 0.9, barcode: '67890', category: 'وجبات خفيفة' },
    { name: 'شوكولاتة', price: 3.0, cost: 2.0, barcode: '11111', category: 'حلويات' },
    { name: 'عصير برتقال', price: 4.0, cost: 2.5, barcode: '22222', category: 'مشروبات' },
    { name: 'ماء معدني', price: 1.0, cost: 0.4, barcode: '33333', category: 'مشروبات' },
    { name: 'بسكويت', price: 2.0, cost: 1.2, barcode: '44444', category: 'حلويات' },
    { name: 'شاي', price: 3.5, cost: 2.1, barcode: '55555', category: 'مشروبات' },
    { name: 'لبن', price: 5.0, cost: 3.5, barcode: '66666', category: 'ألبان' },
    { name: 'جبنة', price: 8.0, cost: 5.5, barcode: '77777', category: 'ألبان' },
    { name: 'فشار', price: 2.2, cost: 1.0, barcode: '88888', category: 'وجبات خفيفة' },
  ];

  for (const item of catalog) {
    const exists = await productModel.findOne({ barcode: item.barcode }).exec();
    if (!exists) {
      await productModel.create({
        name: item.name,
        price: item.price,
        cost: item.cost,
        stock: randomInt(50, 200),
        barcode: item.barcode,
        category: item.category,
      });
    }
  }

  products = await productModel.find().exec();
  return products;
}

async function seedReports() {
  const { days, maxInvoicesPerDay, clear } = parseArgs();
  const app = await NestFactory.createApplicationContext(AppModule);

  const categoryModel = app.get<Model<Category>>(getModelToken(Category.name));
  const productModel = app.get<Model<Product>>(getModelToken(Product.name));
  const saleModel = app.get<Model<SaleInvoice>>(getModelToken(SaleInvoice.name));

  try {
    if (clear) {
      const deleted = await saleModel.deleteMany({
        invoiceNumber: { $regex: `^${SEED_INVOICE_PREFIX}` },
      });
      console.log(`Removed ${deleted.deletedCount} previous seeded sales`);
    }

    const products = await ensureDemoProducts(categoryModel, productModel);
    if (products.length === 0) {
      throw new Error('No products available to generate sales data');
    }

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const sales: Array<{
      invoiceNumber: string;
      date: string;
      time: string;
      items: {
        productId: ProductDocument['_id'];
        name: string;
        price: number;
        quantity: number;
        barcode?: string;
        unitCost: number;
      }[];
      total: number;
      cashier: string;
    }> = [];

    let invoiceCounter = 1;

    for (let dayOffset = days; dayOffset >= 0; dayOffset -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - dayOffset);
      const dateString = formatDate(date);

      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
      const minInvoices = isWeekend ? 2 : 0;
      const maxInvoices = isWeekend
        ? maxInvoicesPerDay + 2
        : Math.max(1, maxInvoicesPerDay - 2);
      const invoicesToday = randomInt(minInvoices, maxInvoices);

      for (let i = 0; i < invoicesToday; i += 1) {
        const selectedProducts = pickRandomItems(products, randomInt(1, 4));
        const items = selectedProducts.map((product) => ({
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: randomInt(1, isWeekend ? 6 : 4),
          barcode: product.barcode,
          unitCost: Number(product.cost ?? 0),
        }));

        sales.push({
          invoiceNumber: `${SEED_INVOICE_PREFIX}${String(invoiceCounter).padStart(6, '0')}`,
          date: dateString,
          time: randomTime(),
          items,
          total: calculateSaleItemsTotal(items),
          cashier: 'البائع الرئيسي',
        });

        invoiceCounter += 1;
      }
    }

    await saleModel.insertMany(sales, { ordered: false });

    const uniqueDates = new Set(sales.map((sale) => sale.date)).size;
    console.log(`Seeded ${sales.length} sales across ${uniqueDates} days (${days + 1} day range)`);
    console.log(`Invoice prefix: ${SEED_INVOICE_PREFIX}*`);
    console.log('Open reports at: http://localhost:8080 → التقارير → تقرير المبيعات');
    console.log('API: GET http://localhost:8080/api/reports/sales');
  } finally {
    await app.close();
  }
}

seedReports()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Reports seed failed:', error);
    process.exit(1);
  });
