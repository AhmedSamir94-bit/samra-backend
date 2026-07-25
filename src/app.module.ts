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

const hasMongoUri = Boolean(process.env.MONGODB_URI?.trim());

if (!hasMongoUri) {
  console.warn(
    'MONGODB_URI is not set — starting degraded mode (health only). Add MONGODB_URI in Vercel → Settings → Environment Variables.',
  );
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ...(hasMongoUri
      ? [
          MongooseModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
              const uri = config.get<string>('MONGODB_URI')!;
              try {
                const host = new URL(
                  uri.replace(/^mongodb(\+srv)?:\/\//, 'http://'),
                ).host;
                console.log(`MongoDB target host: ${host}`);
              } catch {
                console.warn('MongoDB URI could not be parsed for logging');
              }
              return {
                uri,
                serverSelectionTimeoutMS: 5_000,
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
        ]
      : []),
  ],
  controllers: [AppController],
  providers: hasMongoUri
    ? [
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
      ]
    : [],
})
export class AppModule {}
