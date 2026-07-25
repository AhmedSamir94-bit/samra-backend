import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { PurchasesModule } from './purchases/purchases.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri =
          config.get<string>('MONGODB_URI') ||
          'mongodb://admin:admin123@127.0.0.1:27017/samra?authSource=admin';

        // Log host only (no credentials) to help debug Vercel boots.
        try {
          const host = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, 'http://'))
            .host;
          console.log(`MongoDB target host: ${host}`);
        } catch {
          console.warn('MongoDB URI could not be parsed for logging');
        }

        return {
          uri,
          serverSelectionTimeoutMS: 8_000,
          maxPoolSize: 5,
        };
      },
    }),
    UsersModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    SalesModule,
    PurchasesModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
