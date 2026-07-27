import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { GuestSession, GuestSessionSchema } from './schemas/guest-session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GuestSession.name, schema: GuestSessionSchema },
    ]),
    AuthModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService, MongooseModule],
})
export class CustomersModule {}
