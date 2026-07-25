import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { AppModule } from './app.module';
import { Category } from './categories/schemas/category.schema';
import { Product } from './products/schemas/product.schema';
import { User } from './users/schemas/user.schema';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const categoryModel = app.get<Model<Category>>(getModelToken(Category.name));
  const productModel = app.get<Model<Product>>(getModelToken(Product.name));
  const userModel = app.get<Model<User>>(getModelToken(User.name));

  const existingUsers = await userModel.countDocuments();
  if (existingUsers === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await userModel.create({
      username: 'admin',
      password: hashedPassword,
      name: 'مدير النظام',
    });
    console.log('Default admin user created (admin / admin123)');
  }

  const existingCategories = await categoryModel.countDocuments();
  if (existingCategories > 0) {
    console.log('Sample data already seeded');
    await app.close();
    process.exit(0);
  }

  const categories = await categoryModel.insertMany([
    { name: 'مشروبات', color: '#3B82F6' },
    { name: 'وجبات خفيفة', color: '#10B981' },
    { name: 'حلويات', color: '#F59E0B' },
  ]);

  await productModel.insertMany([
    {
      name: 'كوكا كولا',
      price: 2.5,
      cost: 1.8,
      stock: 50,
      barcode: '12345',
      category: categories[0].name,
    },
    {
      name: 'شيبس',
      price: 1.5,
      cost: 0.9,
      stock: 30,
      barcode: '67890',
      category: categories[1].name,
    },
    {
      name: 'شوكولاتة',
      price: 3.0,
      cost: 2.0,
      stock: 25,
      barcode: '11111',
      category: categories[2].name,
    },
    {
      name: 'عصير برتقال',
      price: 4.0,
      cost: 2.5,
      stock: 20,
      barcode: '22222',
      category: categories[0].name,
    },
  ]);

  console.log('Database seeded successfully');
  await app.close();
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
